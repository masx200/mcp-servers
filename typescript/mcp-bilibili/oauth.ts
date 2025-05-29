import fetch from "node-fetch";
import { exec } from "child_process";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
// @ts-ignore
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

interface QrcodeResponse {
    code: number;
    message?: string;
    data: {
        qrcode_key: string;
        url: string;
    };
}

interface PollResponse {
    code: number;
    message?: string;
    data: {
        code: number;
        message?: string;
        url?: string;
        refresh_token?: string;
        access_token?: string;
        expires_in?: number;
        [key: string]: any;
    };
}

const CLIENT_ID = "2fdc4aec8e4648bd";
const CLIENT_SECRET = "f527953e52c940f994e077b5434b4c03";
const REDIRECT_URI = "https://www.bilibili.com"; // 可根据实际需求修改
const QRCODE_DIR = "/tmp/qrcodes";

// 获取二维码和qrcode_key
async function getQrcode(): Promise<{ qrcode_key: string, url: string }> {
    const url = "https://passport.bilibili.com/x/passport-login/web/qrcode/generate";
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "user-agent": "Mozilla/5.0",
            "referer": "https://www.bilibili.com/"
        }
    });
    const data = await res.json() as QrcodeResponse;
    if (data.code !== 0) throw new Error("获取二维码失败: " + data.message);
    return {
        qrcode_key: data.data.qrcode_key,
        url: data.data.url
    };
}

// 打开浏览器
function openBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let command = `open "${url}"`;
        exec(command, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// 轮询扫码状态
async function pollQrcode(qrcode_key: string): Promise<any> {
    const poll_url = `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`;
    for (let i = 0; i < 60; i++) {
        const res = await fetch(poll_url, {
            method: "GET",
            headers: {
                "user-agent": "Mozilla/5.0",
                "referer": "https://www.bilibili.com/"
            }
        });
        const data = await res.json() as PollResponse;
        if (data.data.code === 0) {
            return data.data;
        } else if (data.data.code === 86038) {
            throw new Error("二维码已失效，请重试");
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("扫码超时");
}

// 主流程：扫码授权
export async function handleOAuthLogin(params: { mode?: string } = {}) {
    try {
        const { qrcode_key, url } = await getQrcode();
        if (params.mode === "url" || !params.mode) {
            // 生成本地二维码图片
            if (!fs.existsSync(QRCODE_DIR)) fs.mkdirSync(QRCODE_DIR);
            const filePath = path.join(QRCODE_DIR, `${qrcode_key}.png`);
            await QRCode.toFile(filePath, url, { width: 256 });
            // 自动轮询扫码状态，扫码成功后直接返回授权结果
            const result = await pollQrcode(qrcode_key);
            return {
                structuredContent: {
                    qrcode_key,
                    qrcode_url: filePath,
                    expire_seconds: 120,
                    tips: "扫码成功，已自动返回授权结果。",
                    result // 包含access_token等信息
                }
            };
        } else if (params.mode === "terminal") {
            // 终端输出二维码，自动轮询
            qrcode.generate(url, { small: true });
            const result = await pollQrcode(qrcode_key);
            return {
                content: [{ type: "text", text: JSON.stringify(result) }],
                isError: false
            };
        } else {
            // 其他模式暂不支持
            throw new McpError(ErrorCode.InvalidParams, "不支持的mode参数");
        }
    } catch (error) {
        throw new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : String(error)
        );
    }
}

// 新增：通过qrcode_key查询扫码授权结果
export async function getBilibiliOAuthResult(params: { qrcode_key: string }) {
    try {
        if (!params.qrcode_key) {
            throw new McpError(ErrorCode.InvalidParams, "qrcode_key参数缺失");
        }
        const result = await pollQrcode(params.qrcode_key);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false
        };
    } catch (error) {
        throw new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : String(error)
        );
    }
} 