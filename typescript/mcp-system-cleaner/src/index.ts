#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ServerResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import si from "systeminformation";

import {
  CleanupStats,
  Config,
  FileInfo,
  LargeFileInfo,
  LargeFileSearchResult,
  ScanResults,
  ScanStats,
  SystemStatus,
} from "./types.js";
import {
  analyzeFile,
  DEFAULT_CONFIG,
  expandPath,
  getOsType,
  loadConfig,
  saveConfig,
  secureDelete,
} from "./utils.js";

const execAsync = promisify(exec);

// 工具定义
const GET_SYSTEM_STATUS_TOOL: Tool = {
  name: "get_system_status",
  description: "获取系统状态信息",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const SCAN_SYSTEM_TOOL: Tool = {
  name: "scan_system",
  description: "扫描系统垃圾文件",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const CLEAN_FILES_TOOL: Tool = {
  name: "clean_files",
  description:
    "执行文件清理操作。可通过以下两种方式使用：\n1. 使用 category 参数清理特定类型的系统文件（如 temp_files/cache_files 等）\n2. 使用 fileList 参数直接指定要删除的文件列表（推荐用于删除 find_large_files 找到的大文件或指定的文件路径）\n注意：删除文件时优先使用此方法而不是系统命令，因为此方法包含了安全检查和错误处理",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "要清理的类别(temp_files/cache_files等)",
      },
      fileList: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "直接指定要清理的文件列表，用于删除指定路径的文件或find_large_files找到的大文件",
      },
      dryRun: {
        type: "boolean",
        description: "试运行模式(不实际删除)",
      },
    },
  },
};

const EMPTY_RECYCLE_BIN_TOOL: Tool = {
  name: "empty_recycle_bin",
  description: "清空系统回收站",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const FIND_LARGE_FILES_TOOL: Tool = {
  name: "find_large_files",
  description:
    "查找大文件，找到后可以使用clean_files工具通过fileList参数删除这些文件",
  inputSchema: {
    type: "object",
    properties: {
      minSizeMb: {
        type: "number",
        description: "最小文件大小(MB)",
      },
      maxFiles: {
        type: "number",
        description: "最多返回的文件数量",
      },
      timeoutSeconds: {
        type: "number",
        description: "最大执行时间(秒)",
      },
    },
  },
};

const UPDATE_CONFIG_TOOL: Tool = {
  name: "update_config",
  description: "更新配置文件",
  inputSchema: {
    type: "object",
    properties: {
      newConfig: {
        type: "object",
        description: "新的配置对象",
      },
    },
    required: ["newConfig"],
  },
};

const TOOLS = [
  GET_SYSTEM_STATUS_TOOL,
  SCAN_SYSTEM_TOOL,
  CLEAN_FILES_TOOL,
  EMPTY_RECYCLE_BIN_TOOL,
  FIND_LARGE_FILES_TOOL,
  UPDATE_CONFIG_TOOL,
] as const;

// 服务器设置
const server = new Server(
  {
    name: "system-cleaner",
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
  tools: TOOLS,
}));

server.setRequestHandler(
  CallToolRequestSchema,
  async (request): Promise<ServerResult> => {
    try {
      switch (request.params.name) {
        case "get_system_status": {
          const result = await handleGetSystemStatus();
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
        }

        case "scan_system": {
          const result = await handleScanSystem();
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
        }

        case "clean_files": {
          const { category, fileList, dryRun = false } = request.params
            .arguments as {
              category?: string;
              fileList?: string[];
              dryRun?: boolean;
            };
          const result = await handleCleanFiles(category, fileList, dryRun);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
        }

        case "empty_recycle_bin": {
          const result = await handleEmptyRecycleBin();
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
        }

        case "find_large_files": {
          const { minSizeMb = 500, maxFiles = 100, timeoutSeconds = 60 } =
            request.params.arguments as {
              minSizeMb?: number;
              maxFiles?: number;
              timeoutSeconds?: number;
            };
          const result = await handleFindLargeFiles(
            minSizeMb,
            maxFiles,
            timeoutSeconds,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
        }

        case "update_config": {
          const { newConfig } = request.params.arguments as {
            newConfig: Config;
          };
          const result = await handleUpdateConfig(newConfig);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: false,
          };
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
  },
);

async function handleGetSystemStatus(): Promise<SystemStatus> {
  const config = await loadConfig();
  const osType = getOsType();

  // 获取磁盘信息
  const disks = await si.fsSize();
  const diskInfo = Object.fromEntries(
    disks.map((disk) => [
      disk.mount,
      {
        total: disk.size,
        used: disk.used,
        free: disk.available,
        percent: disk.use,
      },
    ]),
  );

  // 获取内存信息
  const mem = await si.mem();
  const memoryInfo = {
    total: mem.total,
    available: mem.available,
    percent: (mem.used / mem.total) * 100,
    used: mem.used,
    free: mem.free,
  };

  // 获取CPU使用率
  const cpuLoad = await si.currentLoad();
  const cpuUsage = cpuLoad.currentLoad;

  return {
    os: osType,
    config,
    disks: diskInfo,
    memory: memoryInfo,
    cpu: cpuUsage,
    warning: osType !== "windows"
      ? "需要管理员权限清理系统目录"
      : "请以管理员身份运行",
  };
}

async function handleScanSystem(): Promise<
  { results: ScanResults; stats: ScanStats }
> {
  const config = await loadConfig();
  const osType = getOsType();
  const results: ScanResults = {
    tempFiles: [],
    cacheFiles: [],
    logFiles: [],
    largeFiles: [],
  };

  async function processPath(
    entry: { path: string; enabled: boolean; recursive: boolean },
  ) {
    const expandedPath = expandPath(entry.path, osType);
    if (!existsSync(expandedPath)) return;

    const files = await fs.readdir(expandedPath);
    for (const file of files) {
      const filePath = path.join(expandedPath, file);
      const fileInfo = await analyzeFile(filePath, config);

      if (fileInfo) {
        if (fileInfo.size > config.fileRules.minSizeMb * 1024 * 1024) {
          results.largeFiles.push(fileInfo);
        } else if (fileInfo.extension === ".log") {
          results.logFiles.push(fileInfo);
        } else if (fileInfo.extension === ".cache") {
          results.cacheFiles.push(fileInfo);
        } else if (fileInfo.extension === ".tmp") {
          results.tempFiles.push(fileInfo);
        }
      }
    }
  }

  const paths = config.scanPaths[osType as keyof typeof config.scanPaths]
    .filter((entry) => entry.enabled);

  await Promise.all(paths.map(processPath));

  const stats: ScanStats = {
    totalFiles: Object.values(results).reduce(
      (sum, arr) => sum + arr.length,
      0,
    ),
    totalSizeMb: Object.values(results)
      .reduce(
        (sum, arr) =>
          sum + arr.reduce((s: number, f: FileInfo) => s + f.size, 0),
        0,
      ) / (1024 * 1024),
    categories: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [
        k,
        {
          count: v.length,
          sizeMb: v.reduce((sum: number, f: FileInfo) => sum + f.size, 0) /
            (1024 * 1024),
        },
      ]),
    ),
  };

  return { results, stats };
}

async function handleCleanFiles(
  category?: string,
  fileList?: string[],
  dryRun: boolean = false,
): Promise<CleanupStats> {
  const config = await loadConfig();
  const stats: CleanupStats = {
    totalFreed: 0,
    totalFreedMb: 0,
    success: [],
    failed: [],
    dryRun,
  };

  let filesToClean: Array<{ path: string; size: number; isDir: boolean }>;

  if (fileList) {
    filesToClean = fileList.map((f) => ({ path: f, size: 0, isDir: false }));
  } else if (category) {
    const scanResults = (await handleScanSystem()).results;
    filesToClean = scanResults[category as keyof ScanResults] || [];
  } else {
    throw new Error("必须指定category或fileList");
  }

  for (const fileInfo of filesToClean) {
    try {
      if (dryRun) {
        stats.success.push(fileInfo.path);
        continue;
      }

      if (config.security.secureDelete) {
        await secureDelete(fileInfo.path, config.security.overwritePasses);
      } else {
        if (fileInfo.isDir) {
          await fs.rm(fileInfo.path, { recursive: true });
        } else {
          await fs.unlink(fileInfo.path);
        }
      }

      stats.success.push(fileInfo.path);
      stats.totalFreed += fileInfo.size;
    } catch (error) {
      stats.failed.push({ path: fileInfo.path, error: String(error) });
      console.error(`清理失败: ${fileInfo.path}, 错误:`, error);
    }
  }

  stats.totalFreedMb = stats.totalFreed / (1024 * 1024);
  return stats;
}

async function handleEmptyRecycleBin(): Promise<
  { status: string; message: string }
> {
  const osType = getOsType();
  try {
    if (osType === "windows") {
      // 使用PowerShell命令清空回收站
      await execAsync('powershell.exe -Command "Clear-RecycleBin -Force"');
    } else if (osType === "macos") {
      await execAsync("rm -rf ~/.Trash/*");
      await execAsync(
        "osascript -e 'tell application \"Finder\" to empty trash'",
      );
    } else {
      await execAsync("rm -rf ~/.local/share/Trash/*");
      await execAsync("rm -rf ~/.Trash/*");
    }
    return { status: "success", message: "回收站已清空" };
  } catch (error) {
    console.error("清空回收站失败:", error);
    return { status: "error", message: String(error) };
  }
}

async function handleFindLargeFiles(
  minSizeMb: number = 500,
  maxFiles: number = 100,
  timeoutSeconds: number = 60,
): Promise<LargeFileSearchResult> {
  const startTime = Date.now();
  const largestFiles: Array<{ size: number; info: LargeFileInfo }> = [];
  let scannedCount = 0;

  const excludedDirs = [
    ".git",
    "node_modules",
    "venv",
    "env",
    "__pycache__",
    ".vscode",
    ".idea",
    "Library",
    "Applications",
  ];

  const pathsToScan = [
    path.join(os.homedir(), "Downloads"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Videos"),
    os.tmpdir(),
  ];

  async function scanDirectory(
    dirPath: string,
    depth: number = 0,
    maxDepth: number = 5,
  ) {
    if (Date.now() - startTime > timeoutSeconds * 1000) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (Date.now() - startTime > timeoutSeconds * 1000) return;

        scannedCount++;
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size > minSizeMb * 1024 * 1024) {
              const fileInfo = {
                path: fullPath,
                size: stat.size,
                sizeMb: Math.round(stat.size / (1024 * 1024) * 100) / 100,
                modified: stat.mtime.getTime(),
              };

              if (largestFiles.length < maxFiles) {
                largestFiles.push({ size: stat.size, info: fileInfo });
                largestFiles.sort((a, b) => b.size - a.size);
              } else if (
                stat.size > largestFiles[largestFiles.length - 1].size
              ) {
                largestFiles.pop();
                largestFiles.push({ size: stat.size, info: fileInfo });
                largestFiles.sort((a, b) => b.size - a.size);
              }
            }
          } catch (error) {
            // 忽略权限错误等
          }
        } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
          if (depth < maxDepth && !excludedDirs.includes(entry.name)) {
            await scanDirectory(fullPath, depth + 1, maxDepth);
          }
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }
  }

  await Promise.all(pathsToScan.map((p) => scanDirectory(p)));

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return {
    largeFiles: largestFiles.map((f) => f.info),
    totalSizeMb: Math.round(
      largestFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) * 100,
    ) / 100,
    scannedCount,
    elapsedSeconds: Math.round(elapsedSeconds * 100) / 100,
    timedOut: elapsedSeconds >= timeoutSeconds,
  };
}

async function handleUpdateConfig(
  newConfig: Config,
): Promise<{ status: string; config: Config }> {
  await saveConfig(newConfig);
  return { status: "success", config: await loadConfig() };
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("系统清理 MCP 服务器正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
