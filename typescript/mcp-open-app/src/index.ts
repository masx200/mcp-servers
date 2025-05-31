#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import appSearch, { AppInfo } from './utils/app-search/index.js';
import { getPlatform } from './utils/platform.js';

const execAsync = promisify(exec);

class AppMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: "app-open-server",
      version: "1.0.0",
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_apps",
          description: "搜索系统中安装的应用程序",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "搜索关键词，如果为空则返回所有应用",
                default: ""
              }
            }
          }
        },
        {
          name: "open_app",
          description: "根据应用名称打开应用程序，打开应用程序",
          inputSchema: {
            type: "object",
            properties: {
              appName: {
                type: "string",
                description: "要打开的应用程序名称"
              }
            },
            required: ["appName"]
          }
        },
        {
          name: "get_platform_info",
          description: "获取当前系统平台信息",
          inputSchema: {
            type: "object",
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_apps":
            return await this.handleSearchApps(args);
          case "open_app":
            return await this.handleOpenApp(args);
          case "get_platform_info":
            return await this.handleGetPlatformInfo();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `执行工具 ${name} 时发生错误: ${errorMessage}`
        );
      }
    });
  }

  private async handleSearchApps(args: any) {
    const query = args?.query || "";
    
    try {
      const apps = await appSearch();
      
      let filteredApps = apps;
      if (query) {
        const queryLower = query.toLowerCase();
        filteredApps = apps.filter(app => 
          app.name.toLowerCase().includes(queryLower) ||
          app.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              platform: getPlatform(),
              totalApps: apps.length,
              filteredApps: filteredApps.length,
              query: query,
              apps: filteredApps.map(app => ({
                name: app.name,
                keywords: app.keywords,
                path: app.path
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `搜索应用时发生错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleOpenApp(args: any) {
    const appName = args?.appName;
    if (!appName) {
      throw new McpError(ErrorCode.InvalidParams, "必须提供应用名称");
    }

    try {
      const apps = await appSearch();
      const app = apps.find(app => 
        app.name.toLowerCase() === appName.toLowerCase() ||
        app.keywords.some(keyword => keyword.toLowerCase() === appName.toLowerCase())
      );

      if (!app) {
        return {
          content: [
            {
              type: "text",
              text: `未找到应用: ${appName}`
            }
          ]
        };
      }

      // 根据平台执行不同的打开命令
      const platform = getPlatform();
      let command: string;
      
      if (platform === 'darwin') {
        command = `open "${app.path}"`;
      } else if (platform === 'win32') {
        command = `start "" "${app.path}"`;
      } else {
        // Linux
        command = `xdg-open "${app.path}"`;
      }

      await execAsync(command);

      return {
        content: [
          {
            type: "text",
            text: `成功打开应用: ${app.name}\n路径: ${app.path}\n执行命令: ${command}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `打开应用时发生错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleGetPlatformInfo() {
    const platform = getPlatform();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            platform: platform,
            arch: process.arch,
            nodeVersion: process.version,
            osRelease: process.platform,
          }, null, 2)
        }
      ]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("App MCP 服务器已启动，监听stdio端口");
  }
}

const server = new AppMcpServer();
server.run().catch(console.error);
