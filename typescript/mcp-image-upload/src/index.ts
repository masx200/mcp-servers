#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, stat } from "fs/promises";
import { basename, extname } from "path";
import FormData from "form-data";
import fetch from "node-fetch";

// 支持的图片格式
const SUPPORTED_IMAGE_FORMATS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".svg",
];

// 上传 API 配置
const UPLOAD_API_URL =
  "https://www.mcpcn.cc/api/fileUploadAndDownload/uploadMcpFile";

export interface ImageUploadParams {
  /** 图片文件的本地路径 */
  path: string;
}

export interface UploadResponse {
  code: number;
  data?: {
    url: string;
  };
  msg: string;
}

/**
 * 验证图片文件参数
 */
function validateImageUploadParams(params: ImageUploadParams): void {
  if (!params.path || typeof params.path !== "string") {
    throw new Error("图片路径是必需的，且必须是字符串类型");
  }
}

/**
 * 检查文件是否为支持的图片格式
 */
function isSupportedImageFormat(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_IMAGE_FORMATS.includes(ext);
}

/**
 * 获取文件信息
 */
async function getFileInfo(filePath: string) {
  try {
    const stats = await stat(filePath);

    if (!stats.isFile()) {
      throw new Error("指定的路径不是一个文件");
    }

    if (!isSupportedImageFormat(filePath)) {
      throw new Error(
        `不支持的图片格式。支持的格式：${SUPPORTED_IMAGE_FORMATS.join(", ")}`,
      );
    }

    return {
      size: stats.size,
      name: basename(filePath),
      extension: extname(filePath).toLowerCase(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("文件不存在，请检查文件路径是否正确");
    }
    throw error;
  }
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getContentType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".svg": "image/svg+xml",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
}

/**
 * 上传图片到指定 API
 */
export async function uploadImage(params: ImageUploadParams): Promise<string> {
  try {
    validateImageUploadParams(params);

    // 检查文件信息
    const fileInfo = await getFileInfo(params.path);
    console.error(`准备上传文件: ${fileInfo.name} (${fileInfo.size} bytes)`);

    // 读取文件内容
    const fileBuffer = await readFile(params.path);

    // 创建 FormData
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: fileInfo.name,
      contentType: getContentType(fileInfo.extension),
    });

    console.error(`开始上传到: ${UPLOAD_API_URL}`);

    // 发送上传请求
    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as UploadResponse;

    if (result.code !== 0) {
      throw new Error(`上传失败: ${result.msg || "未知错误"}`);
    }

    if (!result.data?.url) {
      throw new Error("上传成功但未返回图片URL");
    }

    console.error(`上传成功: ${result.data.url}`);
    return result.data.url;
  } catch (error) {
    const err = error as Error;
    console.error(`上传失败: ${err.message}`);

    if (
      err.message.includes("ENOTFOUND") || err.message.includes("ECONNREFUSED")
    ) {
      throw new Error("网络连接失败，请检查网络连接或稍后重试");
    } else if (err.message.includes("timeout")) {
      throw new Error("上传超时，请检查网络连接或稍后重试");
    } else if (err.message.includes("HTTP 错误")) {
      throw new Error(`服务器错误: ${err.message}`);
    } else {
      throw new Error(`上传失败: ${err.message}`);
    }
  }
}

class ImageUploadServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "image-upload-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "upload_image",
          description: "上传本地图片文件到云端，返回可访问的图片URL",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description:
                  "要上传的图片文件的本地路径（支持格式：jpg, jpeg, png, gif, webp, bmp, tiff, svg）",
              },
            },
            required: ["path"],
            additionalProperties: false,
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (
          !request.params.arguments ||
          typeof request.params.arguments !== "object"
        ) {
          throw new McpError(ErrorCode.InvalidParams, "无效的参数");
        }

        switch (request.params.name) {
          case "upload_image": {
            const { path } = request.params.arguments as Record<
              string,
              unknown
            >;

            const params = {
              path: path as string,
            };

            const imageUrl = await uploadImage(params);
            return {
              content: [
                {
                  type: "text",
                  text:
                    `图片上传成功！\n\n图片URL: ${imageUrl}\n\n您可以直接使用这个URL来访问或分享图片。`,
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${request.params.name}`,
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `执行失败: ${(error as Error).message}`,
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Image Upload MCP server running on stdio");
  }
}

const server = new ImageUploadServer();
server.run().catch(console.error);
