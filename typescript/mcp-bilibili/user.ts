import fetch from "node-fetch";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";
import { CLIENT_ID, CLIENT_SECRET } from "./oauth.js";

// 生成MD5
function md5(content: string) {
    return crypto.createHash('md5').update(content).digest('hex');
}
// 生成随机字符串
function randomString(length: number) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
// 生成签名
function getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId,
    signatureVersion,
    signatureMethod,
    appSecret
}: {
    contentMd5: string,
    timestamp: string,
    nonce: string,
    accessKeyId: string,
    signatureVersion: string,
    signatureMethod: string,
    appSecret: string
}) {
    const signHeaders: Record<string, string> = {
        "x-bili-accesskeyid": accessKeyId,
        "x-bili-content-md5": contentMd5,
        "x-bili-signature-method": signatureMethod,
        "x-bili-signature-nonce": nonce,
        "x-bili-signature-version": signatureVersion,
        "x-bili-timestamp": timestamp
    };
    const keys = Object.keys(signHeaders).sort();
    const signStr = keys.map(k => `${k}:${signHeaders[k]}`).join('\n');
    const signature = crypto.createHmac('sha256', appSecret).update(signStr).digest('hex');
    return signature;
}

export async function getUserInfo({ access_token }: { access_token: string }) {
    const urlPath = "/arcopen/fn/user/account/info";
    const host = "member.bilibili.com";
    const url = `https://${host}${urlPath}`;
    const method = "GET";
    const contentMd5 = md5("");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomString(18);
    const signatureVersion = "2.0";
    const signatureMethod = "HMAC-SHA256";

    const signature = getSignature({
        contentMd5,
        timestamp,
        nonce,
        accessKeyId: CLIENT_ID,
        signatureVersion,
        signatureMethod,
        appSecret: CLIENT_SECRET
    });

    const headers = {
        "Accept": "application/json",
        "Access-Token": access_token,
        "Authorization": signature,
        "X-Bili-Accesskeyid": CLIENT_ID,
        "X-Bili-Content-Md5": contentMd5,
        "X-Bili-Signature-Method": signatureMethod,
        "X-Bili-Signature-Nonce": nonce,
        "X-Bili-Signature-Version": signatureVersion,
        "X-Bili-Timestamp": timestamp,
        "User-Agent": "Node.js",
        "Content-Type": "application/json",
        "Host": host,
        "Connection": "keep-alive"
    };

    const res = await fetch(url, {
        method,
        headers
    });

    const text = await res.text();
    if (!res.ok) {
        throw new McpError(ErrorCode.InternalError, `B站用户信息接口返回${res.status}: ${text.slice(0, 100)}`);
    }
    if (text.trim().startsWith('<')) {
        throw new McpError(ErrorCode.InternalError, 'B站用户信息接口返回了HTML: ' + text.slice(0, 100));
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new McpError(ErrorCode.InternalError, 'B站用户信息接口返回非JSON: ' + text.slice(0, 100));
    }

    if (data.code !== 0) {
        throw new McpError(ErrorCode.InternalError, data.message || "获取用户信息失败");
    }
    const result = {
        content: [
            {
                name: data.data.name,
                face: data.data.face,
                openid: data.data.openid
            }
        ],
        isError: false
    };
    return {
        structuredContent: result,
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2)
            }
        ]
    };
}

export async function getUserStat({ access_token }: { access_token: string }) {
    const urlPath = "/arcopen/fn/data/user/stat";
    const host = "member.bilibili.com";
    const url = `https://${host}${urlPath}`;
    const method = "GET";
    const contentMd5 = md5("");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomString(18);
    const signatureVersion = "2.0";
    const signatureMethod = "HMAC-SHA256";

    const signature = getSignature({
        contentMd5,
        timestamp,
        nonce,
        accessKeyId: CLIENT_ID,
        signatureVersion,
        signatureMethod,
        appSecret: CLIENT_SECRET
    });

    const headers = {
        "Accept": "application/json",
        "Access-Token": access_token,
        "Authorization": signature,
        "X-Bili-Accesskeyid": CLIENT_ID,
        "X-Bili-Content-Md5": contentMd5,
        "X-Bili-Signature-Method": signatureMethod,
        "X-Bili-Signature-Nonce": nonce,
        "X-Bili-Signature-Version": signatureVersion,
        "X-Bili-Timestamp": timestamp,
        "User-Agent": "Node.js",
        "Content-Type": "application/json",
        "Host": host,
        "Connection": "keep-alive"
    };

    const res = await fetch(url, {
        method,
        headers
    });

    const text = await res.text();
    if (!res.ok) {
        throw new McpError(ErrorCode.InternalError, `B站用户维度数据接口返回${res.status}: ${text.slice(0, 100)}`);
    }
    if (text.trim().startsWith('<')) {
        throw new McpError(ErrorCode.InternalError, 'B站用户维度数据接口返回了HTML: ' + text.slice(0, 100));
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new McpError(ErrorCode.InternalError, 'B站用户维度数据接口返回非JSON: ' + text.slice(0, 100));
    }

    if (data.code !== 0) {
        throw new McpError(ErrorCode.InternalError, data.message || "获取用户维度数据失败");
    }
    const result = {
        content: [
            {
                following: data.data.following,
                follower: data.data.follower,
                arc_passed_total: data.data.arc_passed_total
            }
        ],
        isError: false
    };
    return {
        structuredContent: result,
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2)
            }
        ]
    };
} 