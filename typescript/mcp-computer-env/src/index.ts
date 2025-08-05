#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import os from "os";
import path from "path";
import process from "process";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// 获取操作系统和架构信息
function getSystemInfo() {
  const platform = os.platform();
  const arch = os.arch();
  const release = os.release();
  const type = os.type();
  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : "";
  const cpuCount = cpus.length;
  const is64bit = arch === "x64" || arch === "arm64";
  const isArm = arch.startsWith("arm");
  let distro = "";
  if (platform === "linux") {
    try {
      // 读取 /etc/os-release 获取发行版
      const content = fs.readFileSync("/etc/os-release", "utf-8");
      const match = content.match(/^PRETTY_NAME="([^"]+)"/m);
      if (match) distro = match[1];
    } catch (error) {
      // 忽略文件读取错误，distro 保持为空字符串
    }
  }
  return {
    platform,
    type,
    release,
    arch,
    is64bit,
    isArm,
    cpuModel,
    cpuCount,
    distro,
    homedir: os.homedir(),
    hostname: os.hostname(),
    user: os.userInfo().username,
    uptime: os.uptime(),
    nodeVersion: process.version,
  };
}

// 获取常用目录
function getCommonDirs() {
  const home = os.homedir();
  const dirs: Record<string, string> = {
    home,
    desktop: "",
    documents: "",
    downloads: "",
    music: "",
    pictures: "",
    videos: "",
    appData: "",
    temp: os.tmpdir(),
  };
  const platform = os.platform();
  if (platform === "win32") {
    dirs.desktop = path.join(home, "Desktop");
    dirs.documents = path.join(home, "Documents");
    dirs.downloads = path.join(home, "Downloads");
    dirs.music = path.join(home, "Music");
    dirs.pictures = path.join(home, "Pictures");
    dirs.videos = path.join(home, "Videos");
    dirs.appData = process.env.APPDATA || "";
  } else if (platform === "darwin") {
    dirs.desktop = path.join(home, "Desktop");
    dirs.documents = path.join(home, "Documents");
    dirs.downloads = path.join(home, "Downloads");
    dirs.music = path.join(home, "Music");
    dirs.pictures = path.join(home, "Pictures");
    dirs.videos = path.join(home, "Movies");
    dirs.appData = path.join(home, "Library", "Application Support");
  } else if (platform === "linux") {
    dirs.desktop = path.join(home, "桌面");
    dirs.documents = path.join(home, "文档");
    dirs.downloads = path.join(home, "下载");
    dirs.music = path.join(home, "音乐");
    dirs.pictures = path.join(home, "图片");
    dirs.videos = path.join(home, "视频");
    // 兼容英文目录
    try {
      if (!fs.existsSync(dirs.desktop)) {
        dirs.desktop = path.join(home, "Desktop");
      }
      if (!fs.existsSync(dirs.documents)) {
        dirs.documents = path.join(home, "Documents");
      }
      if (!fs.existsSync(dirs.downloads)) {
        dirs.downloads = path.join(home, "Downloads");
      }
      if (!fs.existsSync(dirs.music)) dirs.music = path.join(home, "Music");
      if (!fs.existsSync(dirs.pictures)) {
        dirs.pictures = path.join(home, "Pictures");
      }
      if (!fs.existsSync(dirs.videos)) dirs.videos = path.join(home, "Videos");
    } catch (error) {
      // 忽略文件系统检查错误，使用默认值
    }
    dirs.appData = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  }
  return dirs;
}

// 其他可选环境信息工具：内存、磁盘、网络等
function getMemoryInfo() {
  return {
    total: os.totalmem(),
    free: os.freemem(),
  };
}

function getNetworkInfo() {
  return os.networkInterfaces();
}

// 获取磁盘分区信息（跨平台）
async function getDiskInfo() {
  try {
    const platform = os.platform();
    if (platform === "win32") {
      // Windows: 使用wmic
      const { stdout } = await execAsync(
        "wmic logicaldisk get Caption,FileSystem,Size,FreeSpace",
      );
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      const header = lines.shift();
      return lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const [Caption, FileSystem, Size, FreeSpace] = parts;
        const total = parseInt(Size, 10) || 0;
        const free = parseInt(FreeSpace, 10) || 0;
        return {
          filesystem: Caption,
          mount: Caption + "\\",
          type: FileSystem,
          total,
          used: total - free,
          available: free,
        };
      });
    } else {
      // macOS/Linux: 使用df -kP
      const { stdout } = await execAsync("df -kP");
      const lines = stdout.trim().split(/\n/).filter(Boolean);
      lines.shift(); // 去掉表头
      return lines.map((line) => {
        const parts = line.replace(/\s+/g, " ").split(" ");
        // Filesystem 1024-blocks Used Available Capacity Mounted on
        const [filesystem, blocks, used, available, capacity, ...mountArr] =
          parts;
        const mount = mountArr.join(" ");
        return {
          filesystem,
          mount,
          type: "", // 跨平台简化，详细类型可用mount命令补充
          total: parseInt(blocks, 10) * 1024,
          used: parseInt(used, 10) * 1024,
          available: parseInt(available, 10) * 1024,
        };
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `获取磁盘信息失败: ${errorMessage}`,
    );
  }
}

class ComputerEnvServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "computer-env-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_system_info",
          description:
            "获取操作系统类型、版本、架构、CPU等信息，帮助大模型了解当前电脑环境",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_common_dirs",
          description:
            "获取常用目录路径，如桌面、文稿、下载、音乐、图片、视频等，自动适配不同操作系统",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_memory_info",
          description: "获取内存信息，包括总内存和可用内存（单位：字节）",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_network_info",
          description: "获取网络接口信息，包括本机所有网卡的IP、MAC等",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_disk_info",
          description:
            "获取所有磁盘分区的总容量、已用空间、可用空间、文件系统类型、挂载点等信息，自动适配不同操作系统",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_system_info":
            return {
              content: [{
                type: "text",
                text: JSON.stringify(getSystemInfo()),
              }],
              isError: false,
            };
          case "get_common_dirs":
            return {
              content: [{
                type: "text",
                text: JSON.stringify(getCommonDirs()),
              }],
              isError: false,
            };
          case "get_memory_info":
            return {
              content: [{
                type: "text",
                text: JSON.stringify(getMemoryInfo()),
              }],
              isError: false,
            };
          case "get_network_info":
            return {
              content: [{
                type: "text",
                text: JSON.stringify(getNetworkInfo()),
              }],
              isError: false,
            };
          case "get_disk_info":
            return {
              content: [{
                type: "text",
                text: JSON.stringify(await getDiskInfo()),
              }],
              isError: false,
            };
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`,
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `执行工具 ${name} 时发生错误: ${errorMessage}`,
        );
      }
    });
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Computer Env MCP server running on stdio");
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const server = new ComputerEnvServer();
server.run().catch(console.error);
