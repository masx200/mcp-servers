import fetch from "node-fetch";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

interface VideoListResponse {
    code: number;
    message?: string;
    data: any;
}

export async function getVideoList({ access_token }: { access_token: string }) {
    const url = "https://api.bilibili.com/x/vu/web/add";
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${access_token}`,
            "user-agent": "Mozilla/5.0"
        }
    });
    const data = await res.json() as VideoListResponse;
    if (data.code !== 0) {
        throw new McpError(ErrorCode.InternalError, data.message || "获取视频列表失败");
    }
    return {
        content: [{
            type: "text",
            text: JSON.stringify(data.data)
        }],
        isError: false
    };
} 