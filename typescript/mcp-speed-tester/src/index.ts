#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// 内置测试服务器配置
const TEST_SERVERS = [
  {
    name: "Cloudflare",
    downloadUrl: "https://speed.cloudflare.com/__down?bytes=",
    uploadUrl: "https://speed.cloudflare.com/__up",
    pingUrl: "https://speed.cloudflare.com",
  },
  {
    name: "Fast.com (Netflix)",
    downloadUrl: "https://fast.com",
    uploadUrl: null,
    pingUrl: "https://fast.com",
  },
  {
    name: "GitHub CDN",
    downloadUrl:
      "https://github.com/git-for-windows/git/releases/download/v2.40.0.windows.1/Git-2.40.0-64-bit.exe",
    uploadUrl: null,
    pingUrl: "https://github.com",
  },
];

// 测试延迟
async function testPing(url: string): Promise<number> {
  try {
    const startTime = Date.now();
    await axios.get(url, { timeout: 5000 });
    const endTime = Date.now();
    return endTime - startTime;
  } catch (error) {
    return -1;
  }
}

// 测试下载速度
async function testDownloadSpeed(
  server: typeof TEST_SERVERS[0],
  durationMs: number = 3000,
): Promise<number> {
  try {
    const startTime = Date.now();
    let totalBytes = 0;
    let isTestRunning = true;

    setTimeout(() => {
      isTestRunning = false;
    }, durationMs);

    // 构建测试URL
    let testUrl = server.downloadUrl;
    if (server.downloadUrl.includes("__down?bytes=")) {
      testUrl = server.downloadUrl + (50 * 1024 * 1024); // 50MB
    }

    const response = await axios({
      method: "get",
      url: testUrl,
      responseType: "stream",
      timeout: durationMs + 5000,
    });

    return new Promise((resolve, reject) => {
      response.data.on("data", (chunk: Buffer) => {
        if (isTestRunning) {
          totalBytes += chunk.length;
        }
      });

      response.data.on("end", () => {
        const endTime = Date.now();
        const durationSeconds = (endTime - startTime) / 1000;
        const speedMbps = (totalBytes * 8) / (1000000 * durationSeconds);
        resolve(speedMbps);
      });

      response.data.on("error", (error: Error) => {
        reject(error);
      });
    });
  } catch (error: any) {
    throw new Error(`下载测试失败 (${server.name}): ${error.message}`);
  }
}

// 测试上传速度
async function testUploadSpeed(
  server: typeof TEST_SERVERS[0],
  durationMs: number = 3000,
): Promise<number> {
  if (!server.uploadUrl) {
    throw new Error(`${server.name} 不支持上传测试`);
  }

  try {
    const startTime = Date.now();
    let totalBytes = 0;
    const chunkSize = 1024 * 64; // 64KB chunks
    const chunk = Buffer.alloc(chunkSize).fill("X");

    while (Date.now() - startTime < durationMs) {
      await axios.post(server.uploadUrl, chunk, {
        headers: { "Content-Type": "application/octet-stream" },
        timeout: 5000,
      });
      totalBytes += chunkSize;
    }

    const durationSeconds = (Date.now() - startTime) / 1000;
    return (totalBytes * 8) / (1000000 * durationSeconds);
  } catch (error: any) {
    throw new Error(`上传测试失败 (${server.name}): ${error.message}`);
  }
}

// 定义工具
const TEST_NETWORK_SPEED_TOOL: Tool = {
  name: "test_network_speed",
  description: "测试网络速度（延迟、下载和上传速度）,默认时间为3秒",
  inputSchema: {
    type: "object",
    properties: {
      testType: {
        type: "string",
        enum: ["ping", "download", "upload", "full"],
        description:
          "测试类型：ping（延迟）、download（下载）、upload（上传）、full（全面测试）",
        default: "full",
      },
      durationMs: {
        type: "number",
        description: "测试持续时间（毫秒），默认3000ms",
        default: 3000,
      },
      serverName: {
        type: "string",
        description:
          "指定测试服务器名称（可选），如：Cloudflare、Fast.com、GitHub CDN",
      },
    },
    required: [],
  },
};

const SPEED_TOOLS = [TEST_NETWORK_SPEED_TOOL] as const;

// 处理网络速度测试
async function handleNetworkSpeedTest(
  testType: string = "full",
  durationMs: number = 3000,
  serverName?: string,
) {
  try {
    const results: any = {
      testType,
      duration: `${durationMs}ms`,
      timestamp: new Date().toISOString(),
      results: {},
    };

    // 选择服务器
    const serversToTest = serverName
      ? TEST_SERVERS.filter((s) =>
        s.name.toLowerCase().includes(serverName.toLowerCase())
      )
      : TEST_SERVERS;

    if (serversToTest.length === 0) {
      throw new Error(`找不到指定的服务器: ${serverName}`);
    }

    // 测试延迟
    if (testType === "ping" || testType === "full") {
      const pingResults: any = {};
      for (const server of serversToTest) {
        const ping = await testPing(server.pingUrl);
        pingResults[server.name] = ping > 0 ? `${ping}ms` : "测试失败";
      }
      results.results.ping = pingResults;
    }

    // 测试下载速度
    if (testType === "download" || testType === "full") {
      const downloadResults: any = {};
      for (const server of serversToTest) {
        try {
          const speed = await testDownloadSpeed(server, durationMs);
          downloadResults[server.name] = `${speed.toFixed(2)} Mbps`;
        } catch (error) {
          downloadResults[server.name] = `测试失败: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }
      results.results.download = downloadResults;
    }

    // 测试上传速度
    if (testType === "upload" || testType === "full") {
      const uploadResults: any = {};
      for (const server of serversToTest) {
        if (server.uploadUrl) {
          try {
            const speed = await testUploadSpeed(server, durationMs);
            uploadResults[server.name] = `${speed.toFixed(2)} Mbps`;
          } catch (error) {
            uploadResults[server.name] = `测试失败: ${
              error instanceof Error ? error.message : String(error)
            }`;
          }
        } else {
          uploadResults[server.name] = "不支持上传测试";
        }
      }
      results.results.upload = uploadResults;
    }

    // 简化输出格式
    const simplifiedResults: any = {
      success: true,
    };

    if (results.results.ping) {
      const pingValues = Object.values(results.results.ping);
      const validPings = pingValues.filter((p) => p !== "测试失败");
      if (validPings.length > 0) {
        simplifiedResults.延迟 = validPings.length === 1
          ? validPings[0]
          : `${validPings[0]}-${validPings[validPings.length - 1]}`;
      }
    }

    if (results.results.download) {
      const downloadValues = Object.values(results.results.download);
      const validDownloads = downloadValues.filter((d) =>
        !String(d).includes("测试失败")
      );
      if (validDownloads.length > 0) {
        simplifiedResults.下载速度 = validDownloads.length === 1
          ? validDownloads[0]
          : `${validDownloads[0]}-${validDownloads[validDownloads.length - 1]}`;
      }
    }

    if (results.results.upload) {
      const uploadValues = Object.values(results.results.upload);
      const validUploads = uploadValues.filter((u) =>
        !String(u).includes("测试失败") && !String(u).includes("不支持")
      );
      if (validUploads.length > 0) {
        simplifiedResults.上传速度 = validUploads.length === 1
          ? validUploads[0]
          : `${validUploads[0]}-${validUploads[validUploads.length - 1]}`;
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(simplifiedResults, null, 2),
      }],
      isError: false,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `网络速度测试失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }],
      isError: true,
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "mcp-speed-tester",
    version: "1.0.8",
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
      case "test_network_speed": {
        const { testType, durationMs, serverName } = request.params
          .arguments as {
            testType?: string;
            durationMs?: number;
            serverName?: string;
          };
        return await handleNetworkSpeedTest(testType, durationMs, serverName);
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
        text: `错误: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Speed Tester Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
