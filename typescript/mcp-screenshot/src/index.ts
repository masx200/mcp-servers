#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { takeScreenshot } from './screenshot.js';

class ScreenshotServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'screenshot-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'take_screenshot',
          description: '使用系统原生工具截图（macOS使用screencapture，Windows使用PowerShell，Linux使用gnome-screenshot/scrot/imagemagick）',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: '保存截图的路径',
              },
              type: {
                type: 'string',
                enum: ['fullscreen', 'window', 'selection'],
                description: '截图类型',
              },
              format: {
                type: 'string',
                enum: ['png', 'jpg', 'pdf', 'tiff'],
                description: '图片格式',
              },
              hideCursor: {
                type: 'boolean',
                description: '是否隐藏鼠标光标',
              },
              shadow: {
                type: 'boolean',
                description: '是否包含窗口阴影（仅window类型）',
              },
              timestamp: {
                type: 'boolean',
                description: '是否在文件名添加时间戳',
              }
            },
            required: ['path', 'type'],
            additionalProperties: false,
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (!request.params.arguments || typeof request.params.arguments !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters');
        }

        switch (request.params.name) {
          case 'take_screenshot': {
            const { path, type, format, hideCursor, shadow, timestamp } = request.params.arguments as Record<string, unknown>;
            
            const params = {
              path: path as string,
              type: type as 'fullscreen' | 'window' | 'selection',
              format: format as 'png' | 'jpg' | 'pdf' | 'tiff' | undefined,
              hideCursor: typeof hideCursor === 'boolean' ? hideCursor : undefined,
              shadow: typeof shadow === 'boolean' ? shadow : undefined,
              timestamp: typeof timestamp === 'boolean' ? timestamp : undefined
            };

            await takeScreenshot(params);
            return {
              content: [
                {
                  type: 'text',
                  text: '截图保存成功',
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Screenshot MCP server running on stdio');
  }
}

const server = new ScreenshotServer();
server.run().catch(console.error); 