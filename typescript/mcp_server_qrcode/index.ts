#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import QRCode from 'qrcode';
import Jimp from 'jimp';
import QrCodeReader from 'qrcode-reader';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// 工具函数：确保输出目录存在
async function ensureOutputDirectory(outputPath: string) {
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (error: any) {
    throw new Error(`创建输出目录失败: ${error.message}`);
  }
}

// 工具函数：处理二维码生成
async function generateQRCode(text: string, outputPath: string): Promise<string> {
  try {
    // 确保输出目录存在
    const dirPath = path.dirname(outputPath);
    await ensureOutputDirectory(dirPath);

    // 生成二维码
    await QRCode.toFile(outputPath, text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 8
    });

    return outputPath;
  } catch (error: any) {
    throw new Error(`生成二维码失败: ${error.message}`);
  }
}

// 工具函数：从URL或本地路径获取图片Buffer
async function getImageBuffer(imagePath: string): Promise<Buffer> {
  try {
    if (imagePath.startsWith('http')) {
      const response = await axios.get(imagePath, {
        responseType: 'arraybuffer',
        timeout: 10000
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

// 定义工具
const GENERATE_QRCODE_TOOL: Tool = {
  name: "generate_qrcode",
  description: "生成二维码图片",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "要编码到二维码中的文本"
      },
      outputPath: {
        type: "string",
        description: "二维码图片的输出路径（包含文件名），必须让用户自己输入"
      }
    },
    required: ["text", "outputPath"]
  }
};

const DECODE_QRCODE_TOOL: Tool = {
  name: "decode_qrcode",
  description: "解码二维码图片",
  inputSchema: {
    type: "object",
    properties: {
      imagePath: {
        type: "string",
        description: "二维码图片的路径(本地路径或URL)"
      }
    },
    required: ["imagePath"]
  }
};

const QRCODE_TOOLS = [
  GENERATE_QRCODE_TOOL,
  DECODE_QRCODE_TOOL
] as const;

// 处理工具调用的函数
async function handleGenerateQRCode(text: string, outputPath: string) {
  try {
    const finalPath = await generateQRCode(text, outputPath);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功生成二维码`,
          outputPath: finalPath,
          encodedText: text
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `生成二维码失败: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
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
        text: JSON.stringify({
          success: true,
          message: `成功解码二维码`,
          decodedText: decodedText
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `解码二维码失败: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "mcp-server/qrcode",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: QRCODE_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
            text: `未知工具: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QRCode MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

