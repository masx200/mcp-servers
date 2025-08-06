#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import Jimp from "jimp";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
// @ts-ignore
import axios from "axios";
import { promises as fs } from "fs";
import path from "path";
// @ts-ignore
import QrCodeReader from "qrcode-reader";

// 工具函数：确保输出目录存在
async function ensureOutputDirectory(outputPath: string) {
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (error: any) {
    throw new Error(`创建输出目录失败: ${error.message}`);
  }
}

// 工具函数：处理二维码生成
async function generateQRCode(
  text: string,
  outputPath: string,
): Promise<string> {
  try {
    // 确保输出目录存在
    const dirPath = path.dirname(outputPath);
    await ensureOutputDirectory(dirPath);

    // 生成二维码
    await QRCode.toFile(outputPath, text, {
      errorCorrectionLevel: "H",
      margin: 1,
      scale: 8,
    });

    return outputPath;
  } catch (error: any) {
    throw new Error(`生成二维码失败: ${error.message}`);
  }
}

// 工具函数：从URL或本地路径获取图片Buffer
async function getImageBuffer(imagePath: string): Promise<Buffer> {
  try {
    if (imagePath.startsWith("http")) {
      const response = await axios.get(imagePath, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } else {
      return await fs.readFile(imagePath);
    }
  } catch (error: any) {
    throw new Error(`获取图片数据失败: ${error.message}`);
  }
}

// 工具函数：解码二维码
async function decodeQRCodeImage(buffer: Buffer): Promise<string> {
  try {
    const image = await Jimp.read(buffer);
    const qrCodeReader = new QrCodeReader();

    return new Promise((resolve, reject) => {
      qrCodeReader.callback = (err: Error | null, result: any) => {
        if (err) {
          reject(err);
        } else if (result && result.result) {
          resolve(result.result);
        } else {
          reject(new Error("未检测到二维码"));
        }
      };
      qrCodeReader.decode(image.bitmap);
    });
  } catch (error: any) {
    throw new Error(`解码二维码失败: ${error.message}`);
  }
}

// 处理工具调用的函数
async function handleGenerateQRCode(text: string, outputPath: string) {
  try {
    const finalPath = await generateQRCode(text, outputPath);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `成功生成二维码`,
            outputPath: finalPath,
            encodedText: text,
          },
          null,
          2,
        ),
      }],
      isError: false,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `生成二维码失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }],
      isError: true,
    };
  }
}

async function handleDecodeQRCode(imagePath: string) {
  try {
    const buffer = await getImageBuffer(imagePath);
    const decodedText = await decodeQRCodeImage(buffer);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `成功解码二维码`,
            decodedText: decodedText,
          },
          null,
          2,
        ),
      }],
      isError: false,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `解码二维码失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }],
      isError: true,
    };
  }
}

/**
 * 数学表达式计算MCP服务器
 * 支持计算各种数学表达式，如 (342-342*3/2)^2
 * 现在支持数值积分和符号微分
 */
function factory() {
  // Create MCP server
  const server = new McpServer(
    {
      name: "mcp-server-qrcode",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // 定义工具
  const GENERATE_QRCODE_TOOL: Tool = {
    name: "generate_qrcode",
    description: "生成二维码图片",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "要编码到二维码中的文本",
        },
        outputPath: {
          type: "string",
          description: "二维码图片的输出路径（包含文件名），必须让用户自己输入",
        },
      },
      required: ["text", "outputPath"],
    },
  };

  const DECODE_QRCODE_TOOL: Tool = {
    name: "decode_qrcode",
    description: "解码二维码图片",
    inputSchema: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description: "二维码图片的路径(本地路径或URL)",
        },
      },
      required: ["imagePath"],
    },
  };

  const QRCODE_TOOLS = [
    GENERATE_QRCODE_TOOL,
    DECODE_QRCODE_TOOL,
  ] as const;

  // 设置请求处理程序
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: QRCODE_TOOLS,
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      switch (request.params.name) {
        case "generate_qrcode": {
          const { text, outputPath } = request.params.arguments as {
            text: string;
            outputPath: string;
          };
          return await handleGenerateQRCode(text, outputPath);
        }

        case "decode_qrcode": {
          const { imagePath } = request.params.arguments as {
            imagePath: string;
          };
          return await handleDecodeQRCode(imagePath);
        }

        default:
          return {
            content: [{
              type: "text",
              text: `未知工具: ${request.params.name}`,
            }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `错误: ${
            error instanceof Error ? error.message : String(error)
          }`,
        }],
        isError: true,
      };
    }
  });

  return server;
}

const app = express();
app.use(express.json());
app.use(authenticateToken);
// Token验证中间件
async function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = process.env.HTTP_API_TOKEN;
  if (!token) {
    return next(); // 未设置token，允许匿名访问
  }

  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.split(" ")[1];

  if (
    !authHeader?.startsWith("Bearer ") ||
    !bearerToken ||
    bearerToken !== token
  ) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Invalid or missing token",
      },
      id: null,
    });
  }

  next();
}

// Map to store transports by session ID
const transports = new Map();

// Handle POST requests for client-to-server communication
app.post("/mcp", authenticateToken, async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"];
  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing transport
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports.set(transport!.sessionId!, transport);
        console.log(`New session initialized: ${sessionId}`);
      },
      // DNS rebinding protection is disabled by default for backwards compatibility
      // If you are running this server locally, you can enable it:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1', 'localhost'],
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport!.sessionId) {
        console.log(`Session closed: ${transport!.sessionId}`);
        transports.delete(transport!.sessionId);
      }
    };
    transport.onmessage = async (message, extra) => {
      console.error("message:", JSON.stringify(message, null, 4));
      console.error("extra:", JSON.stringify(extra, null, 4));
    };
    const server = factory();
    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport!.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
async function handleSessionRequest(
  req: express.Request,
  res: express.Response,
) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.get(sessionId);
  await transport.handleRequest(req, res);
}

// Handle GET requests for server-to-client notifications via SSE
app.get("/mcp", authenticateToken, handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/mcp", authenticateToken, handleSessionRequest);

// Start the server
const PORT = process.env.HTTP_API_PORT || 3000;
app.on("error", (err) => console.error("Failed to start HTTP server:", err));
app.listen(PORT, (err) => {
  if (err) return console.error("Failed to start HTTP server:", err);
  const { HTTP_API_TOKEN, HTTP_API_PORT } = process.env;
  console.log(`MCP calculator streamable HTTP server configuration:`);
  console.log(JSON.stringify({ HTTP_API_TOKEN, HTTP_API_PORT }, null, 4));
  console.log(
    `MCP calculator streamable HTTP server listening on http://localhost:${PORT}`,
  );
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);

  const token = process.env.HTTP_API_TOKEN;
  if (token) {
    console.log("HTTP API token authentication enabled,token:", token);
  } else {
    console.log(
      "HTTP API token authentication disabled (anonymous access allowed)",
    );
  }
});
