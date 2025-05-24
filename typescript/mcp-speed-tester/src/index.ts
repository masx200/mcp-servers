#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';

// 工具函数：测试下载速度
async function testDownloadSpeed(testUrl: string, durationMs: number = 5000): Promise<number> {
  try {
    const startTime = Date.now();
    let totalBytes = 0;
    let isTestRunning = true;

    setTimeout(() => {
      isTestRunning = false;
    }, durationMs);

    const response = await axios({
      method: 'get',
      url: testUrl,
      responseType: 'stream',
      timeout: durationMs + 2000,
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        if (isTestRunning) {
          totalBytes += chunk.length;
        }
      });

      response.data.on('end', () => {
        const endTime = Date.now();
        const durationSeconds = (endTime - startTime) / 1000;
        const speedMbps = (totalBytes * 8) / (1000000 * durationSeconds); // Convert to Mbps
        resolve(speedMbps);
      });

      response.data.on('error', (error: Error) => {
        reject(error);
      });
    });
  } catch (error: any) {
    throw new Error(`测速失败: ${error.message}`);
  }
}

// 工具函数：测试上传速度
async function testUploadSpeed(testUrl: string, durationMs: number = 5000): Promise<number> {
  try {
    const startTime = Date.now();
    let totalBytes = 0;
    const chunkSize = 1024 * 256; // 256KB chunks
    const chunk = Buffer.alloc(chunkSize).fill('X');

    while (Date.now() - startTime < durationMs) {
      await axios.post(testUrl, chunk, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      totalBytes += chunkSize;
    }

    const durationSeconds = (Date.now() - startTime) / 1000;
    return (totalBytes * 8) / (1000000 * durationSeconds); // Convert to Mbps
  } catch (error: any) {
    throw new Error(`测速失败: ${error.message}`);
  }
}

// 定义工具
const TEST_SPEED_TOOL: Tool = {
  name: "test_speed",
  description: "测试网络速度（上传和下载）",
  inputSchema: {
    type: "object",
    properties: {
      downloadTestUrl: {
        type: "string",
        description: "用于测试下载速度的URL（默认使用大文件下载链接）"
      },
      uploadTestUrl: {
        type: "string",
        description: "用于测试上传速度的URL"
      },
      durationMs: {
        type: "number",
        description: "测试持续时间（毫秒），默认5000ms"
      }
    },
    required: ["downloadTestUrl", "uploadTestUrl"]
  }
};

const SPEED_TOOLS = [TEST_SPEED_TOOL] as const;

// 处理工具调用的函数
async function handleSpeedTest(
  downloadTestUrl: string,
  uploadTestUrl: string,
  durationMs: number = 5000
) {
  try {
    const downloadSpeed = await testDownloadSpeed(downloadTestUrl, durationMs);
    const uploadSpeed = await testUploadSpeed(uploadTestUrl, durationMs);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "网速测试完成",
          results: {
            downloadSpeed: `${downloadSpeed.toFixed(2)} Mbps`,
            uploadSpeed: `${uploadSpeed.toFixed(2)} Mbps`,
            testDuration: `${durationMs}ms`
          }
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `网速测试失败: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "mcp-server/speed",
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
  tools: SPEED_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "test_speed": {
        const { downloadTestUrl, uploadTestUrl, durationMs } = request.params.arguments as {
          downloadTestUrl: string;
          uploadTestUrl: string;
          durationMs?: number;
        };
        return await handleSpeedTest(downloadTestUrl, uploadTestUrl, durationMs);
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
  console.error("Speed Test MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
