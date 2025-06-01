#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolRequest,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { handleOAuthLogin, getBilibiliOAuthResult } from "./oauth.js";
import { getUserInfo } from "./user.js";
import { getVideoList } from "./video.js";

const OAUTH_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        content: {
            type: "array" as const,
            description: "返回内容数组，包含access_token、refresh_token等信息",
            items: {
                type: "object" as const,
                properties: {
                    type: { type: "string", enum: ["text"], description: "内容类型，固定为text" },
                    text: { type: "string", description: "JSON字符串，包含access_token、refresh_token、expires_in等" }
                },
                required: ["type", "text"]
            }
        },
        isError: { type: "boolean", description: "是否为错误响应" }
    },
    required: ["content", "isError"],
    additionalProperties: false
};

const USER_INFO_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        content: {
            type: "array" as const,
            description: "返回内容数组，包含用户信息JSON字符串",
            items: {
                type: "object" as const,
                properties: {
                    type: { type: "string", enum: ["text"], description: "内容类型，固定为text" },
                    text: { type: "string", description: "用户信息JSON字符串" }
                },
                required: ["type", "text"]
            }
        },
        isError: { type: "boolean", description: "是否为错误响应" }
    },
    required: ["content", "isError"],
    additionalProperties: false
};

const VIDEO_LIST_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        content: {
            type: "array" as const,
            description: "返回内容数组，包含视频列表JSON字符串",
            items: {
                type: "object" as const,
                properties: {
                    type: { type: "string", enum: ["text"], description: "内容类型，固定为text" },
                    text: { type: "string", description: "视频列表JSON字符串" }
                },
                required: ["type", "text"]
            }
        },
        isError: { type: "boolean", description: "是否为错误响应" }
    },
    required: ["content", "isError"],
    additionalProperties: false
};

const OAUTH_QRCODE_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        qrcode_key: { type: "string", description: "二维码唯一标识，后续查询授权结果用" },
        qrcode_url: { type: "string", description: "二维码图片本地地址或可访问URL" },
        expire_seconds: { type: "number", description: "二维码有效期（秒）" },
        tips: { type: "string", description: "扫码提示信息" }
    },
    required: ["qrcode_key", "qrcode_url", "expire_seconds", "tips"],
    additionalProperties: false
};

const BILIBILI_OAUTH_TOOL: Tool = {
    name: "bilibili_oauth_login",
    description: `生成B站扫码授权二维码，返回本地二维码图片地址和qrcode_key，扫码后用qrcode_key查询授权结果。\nmode可选：'url'（返回二维码图片地址）、'terminal'（终端输出二维码并自动轮询结果）` ,
    inputSchema: {
        type: "object",
        properties: {
            mode: {
                type: "string",
                description: "二维码展示方式，可选'url'，默认'url'"
            }
        },
        required: []
    },
    outputSchema: OAUTH_QRCODE_OUTPUT_SCHEMA
};

const GET_BILIBILI_OAUTH_RESULT_TOOL: Tool = {
    name: "get_bilibili_oauth_result",
    description: `通过qrcode_key查询扫码授权结果。适用于二维码链接/图片模式，扫码后用此接口获取access_token。\n参数: { qrcode_key: string }\n返回: 授权结果JSON字符串。`,
    inputSchema: {
        type: "object",
        properties: {
            qrcode_key: { type: "string", description: "二维码生成时返回的qrcode_key" }
        },
        required: ["qrcode_key"]
    },
    outputSchema: OAUTH_OUTPUT_SCHEMA
};

const BILIBILI_GET_USER_INFO_TOOL: Tool = {
    name: "bilibili_get_user_info",
    description: `获取B站用户信息，需要access_token。\n\n参数: { access_token: string }\n返回: 用户信息JSON字符串。` ,
    inputSchema: {
        type: "object",
        properties: {
            access_token: { type: "string", description: "OAuth2授权后获得的access_token" }
        },
        required: ["access_token"]
    },
    outputSchema: USER_INFO_OUTPUT_SCHEMA
};

const BILIBILI_GET_VIDEO_LIST_TOOL: Tool = {
    name: "bilibili_get_video_list",
    description: `获取B站已投稿视频列表，需要access_token。\n\n参数: { access_token: string }\n返回: 视频列表JSON字符串。` ,
    inputSchema: {
        type: "object",
        properties: {
            access_token: { type: "string", description: "OAuth2授权后获得的access_token" }
        },
        required: ["access_token"]
    },
    outputSchema: VIDEO_LIST_OUTPUT_SCHEMA
};

const BILIBILI_TOOLS = [
    BILIBILI_OAUTH_TOOL,
    GET_BILIBILI_OAUTH_RESULT_TOOL,
    BILIBILI_GET_USER_INFO_TOOL,
    BILIBILI_GET_VIDEO_LIST_TOOL
] as const;

const server = new Server(
    {
        name: "mcp-bilibili",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: BILIBILI_TOOLS,
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "bilibili_oauth_login":
                return await handleOAuthLogin(args || {});
            case "get_bilibili_oauth_result":
                return await getBilibiliOAuthResult(args as { qrcode_key: string });
            case "bilibili_get_user_info":
                if (!args || typeof args.access_token !== "string") {
                    throw new McpError(ErrorCode.InvalidParams, "access_token参数缺失或类型错误");
                }
                return await getUserInfo(args as { access_token: string });
            case "bilibili_get_video_list":
                if (!args || typeof args.access_token !== "string") {
                    throw new McpError(ErrorCode.InvalidParams, "access_token参数缺失或类型错误");
                }
                return await getVideoList(args as { access_token: string });
            default:
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${name}`
                );
        }
    } catch (error) {
        throw new McpError(
            ErrorCode.InternalError,
            `Tool execution error: ${error instanceof Error ? error.message : String(error)}`
        );
    }
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

runServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
}); 