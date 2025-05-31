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
  private apps: AppInfo[] = [];
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
        // {
        //   name: "get_all_apps",
        //   description: "获取系统中安装的所有应用程序",
        //   inputSchema: {
        //     type: "object",
        //     properties: {}
        //   }
        // },
        // {
        //   name: "search_apps",
        //   description: "搜索系统中安装的应用程序",
        //   inputSchema: {
        //     type: "object",
        //     properties: {
        //       query: {
        //         type: "string",
        //         description: "搜索关键词，如果为空则返回所有应用",
        //         default: ""
        //       }
        //     }
        //   }
        // },
        {
          name: "open_app",
          description: `
            打开应用程序,根据应用名称打开应用程序；
          `,
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
          case "get_all_apps":
            return await this.getAllApps();
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

  private async getAllApps() {
    try {
      if (this.apps.length === 0) {
        console.error('没缓存apps');
        this.apps = await appSearch();
      }else{
        console.error('有缓存apps');
      }
  

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              apps: this.apps
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

  private async handleSearchApps(args: any) {
    const query = args?.query || "";
    
    try {
      if (this.apps.length === 0) {
        console.error('没缓存apps');
        this.apps = await appSearch();
      }else{
        console.error('有缓存apps');
      }
      
      let filteredApps = this.apps;
      if (query) {
        const queryLower = query.toLowerCase();
        filteredApps = this.apps.filter(app => 
          app.name.toLowerCase().includes(queryLower) ||
          app.keyWords.some(keyword => keyword.toLowerCase().includes(queryLower))
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              platform: getPlatform(),
              totalApps: this.apps.length,
              filteredApps: filteredApps.length,
              query: query,
              apps: filteredApps.map(app => ({
                name: app.name,
                keywords: app.keyWords,
                path: app.path || app.name
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
      if (this.apps.length === 0) {
        this.apps = await appSearch();
      }
      const app = this.apps.find(app => 
        app.name.toLowerCase() === appName.toLowerCase() ||
        app.keyWords.some(keyword => keyword.toLowerCase().includes(appName.toLowerCase()))
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
      let command = '';
      const appPath = app.path || app.name;
      
      if (platform === 'win32') {
        command = `start "" "${appPath}"`;
      } else if (platform === 'darwin') {
        command = `open "${appPath}"`;
      } else {
        // Linux - 直接执行路径
        command = appPath;
      }

      await execAsync(command);

      return {
        content: [
          {
            type: "text",
            text: `成功打开应用: ${app.name}\n路径: ${appPath}\n执行命令: ${command}`
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
