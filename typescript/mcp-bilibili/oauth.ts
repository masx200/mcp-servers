import fetch from "node-fetch";
import { exec } from "child_process";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

// B站开放平台应用密钥（OAuth 2.0应用标识）
// 用于用户授权访问自己的B站数据，安全且符合OAuth规范
export const CLIENT_ID = "2fdc4aec8e4648bd";
export const CLIENT_SECRET = "f527953e52c940f994e077b5434b4c03";

// Token缓存文件路径
const TOKEN_CACHE_FILE = path.join(os.homedir(), '.bilibili_mcp_token.json');

// 检查本地是否有有效的access_token
export function checkLocalToken() {
    try {
        if (!fs.existsSync(TOKEN_CACHE_FILE)) {
            const result = {
                content: [
                    {
                        hasValidToken: false,
                        message: "本地未找到token缓存文件"
                    }
                ],
                isError: false
            };
            return {
                structuredContent: result,
                content: [
                    { type: 'text', text: JSON.stringify(result, null, 2) }
                ]
            };
        }

        const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (tokenData.access_token && tokenData.expires_at && tokenData.expires_at > currentTime) {
            const result = {
                content: [
                    {
                        hasValidToken: true,
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        expires_at: tokenData.expires_at,
                        message: "找到有效的本地token"
                    }
                ],
                isError: false
            };
            return {
                structuredContent: result,
                content: [
                    { type: 'text', text: JSON.stringify(result, null, 2) }
                ]
            };
        } else {
            const result = {
                content: [
                    {
                        hasValidToken: false,
                        message: "本地token已过期"
                    }
                ],
                isError: false
            };
            return {
                structuredContent: result,
                content: [
                    { type: 'text', text: JSON.stringify(result, null, 2) }
                ]
            };
        }
    } catch (error) {
        const result = {
            content: [
                {
                    hasValidToken: false,
                    message: `读取本地token失败: ${error instanceof Error ? error.message : String(error)}`
                }
            ],
            isError: true
        };
        return {
            structuredContent: result,
            content: [
                { type: 'text', text: JSON.stringify(result, null, 2) }
            ]
        };
    }
}

// 保存token到本地文件
function saveTokenToLocal(tokenData: { access_token: string; refresh_token: string; expires_in: number }) {
    try {
        const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
        const cacheData = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            created_at: Math.floor(Date.now() / 1000)
        };
        fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (error) {
        console.error('保存token到本地失败:', error);
    }
}

// 打开浏览器
export function openBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let command = `open "${url}"`;
        exec(command, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// 用refresh_token换取access_token
export async function exchangeRefreshToken(params: { refresh_token: string }) {
    const { refresh_token } = params;
    if (!refresh_token) {
        throw new McpError(ErrorCode.InvalidParams, "refresh_token参数缺失");
    }
    const url = "https://passport.bilibili.com/x/passport-login/oauth2/refresh_token";
    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token
    });
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "Mozilla/5.0"
        },
        body
    });
    const data = await res.json() as { code: number; message?: string; data?: any };
    if (data.code !== 0) {
        throw new McpError(ErrorCode.InternalError, data.message || "换取access_token失败");
    }
    const result = {
        content: [data.data],
        isError: false
    };
    return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
}

// 用code换access_token
export async function pollCodeAndGetToken(params: { state: string }) {
    const { state } = params;
    const redirect_uri = 'https://www.mcpcn.cc/';
    let code = null;
    for (let i = 0; i < 60; i++) { // 最多轮询5分钟
        const res = await fetch(`https://www.mcpcn.cc/api/map/getString?key=${encodeURIComponent(state)}`);
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new McpError(ErrorCode.InternalError, 'API返回非JSON: ' + text.slice(0, 100));
        }
        if (data.code === 0 && data.data) {
            code = data.data;
            break;
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    if (!code) {
        throw new McpError(ErrorCode.InternalError, '未获取到授权code，可能用户未完成授权');
    }
    return await getBilibiliAccessTokenByCode({ code, redirect_uri });
}

export async function getBilibiliAccessTokenByCode(params: { code: string, redirect_uri: string }) {
    const { code, redirect_uri } = params;
    if (!code || !redirect_uri) {
        throw new McpError(ErrorCode.InvalidParams, "code或redirect_uri参数缺失");
    }
    
    const url = 'https://api.bilibili.com/x/account-oauth2/v1/token';
    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri
    });
    console.error('body:', body);

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body
    });

    const text = await res.text();
    console.error('text:', text);
    if (!res.ok) {
        throw new McpError(ErrorCode.InternalError, `B站换token接口返回${res.status}: ${text.slice(0, 100)}`);
    }
    if (text.trim().startsWith('<')) {
        throw new McpError(ErrorCode.InternalError, 'B站换token接口返回了HTML: ' + text.slice(0, 100));
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new McpError(ErrorCode.InternalError, 'B站换token接口返回非JSON: ' + text.slice(0, 100));
    }

    if (data.code !== 0) {
        throw new McpError(ErrorCode.InternalError, data.message || '换取access_token失败');
    }

    // 保存token到本地缓存
    saveTokenToLocal({
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        expires_in: data.data.expires_in
    });

    const result = {
        content: [
            {
                access_token: data.data.access_token,
                refresh_token: data.data.refresh_token,
                expires_in: data.data.expires_in
            }
        ],
        isError: false
    };
    return {
        structuredContent: result,
        content: [
            { type: 'text', text: JSON.stringify(result, null, 2) }
        ]
    };
}

// 生成带state的B站网页授权链接
export function generateBilibiliWebAuthorizeLink() {
    const state = uuidv4();
    const gourl = 'https://www.mcpcn.cc/';
    const authorize_url = `https://account.bilibili.com/pc/account-pc/auth/oauth?client_id=${CLIENT_ID}&gourl=${gourl}&state=${state}`;
    const result = {
        content: [
            { state, authorize_url, tips: '' }
        ],
        isError: false
    };
    return {
        structuredContent: result,
        content: [
            { type: 'text', text: JSON.stringify(result, null, 2) }
        ]
    };
} 