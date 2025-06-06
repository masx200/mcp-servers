#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { promptUser, PromptParams } from './prompt.js';

class PromptServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'prompt-mcp',
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
          name: 'prompt_user',
          description: '显示对话框提示获取用户输入',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: '在提示对话框中显示的文本',
              },
              defaultAnswer: {
                type: 'string',
                description: '可选的默认预填文本',
              },
              buttons: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '可选的自定义按钮标签（最多3个）',
                maxItems: 3
              },
              icon: {
                type: 'string',
                enum: ['note', 'stop', 'caution'],
                description: '可选的显示图标'
              }
            },
            required: ['message'],
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
          case 'prompt_user': {
            const { message, defaultAnswer, buttons, icon } = request.params.arguments as Record<string, unknown>;
            
            const params: PromptParams = {
              message: message as string,
              defaultAnswer: typeof defaultAnswer === 'string' ? defaultAnswer : undefined,
              buttons: Array.isArray(buttons) ? buttons as string[] : undefined,
              icon: ['note', 'stop', 'caution'].includes(icon as string) ? icon as 'note' | 'stop' | 'caution' : undefined
            };

            const result = await promptUser(params);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result),
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
    console.error('Prompt MCP server running on stdio');
  }
}

const server = new PromptServer();
server.run().catch(console.error); 