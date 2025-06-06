#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { selectFile, FileSelectParams } from './fileSelect.js';

class FileSelectServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'file-select-mcp',
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
          name: 'select_file',
          description: '打开原生文件选择对话框',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: '可选的提示消息'
              },
              defaultLocation: {
                type: 'string',
                description: '可选的默认目录路径'
              },
              fileTypes: {
                type: 'object',
                description: '可选的文件类型过滤器 (例如: {"public.image": ["png", "jpg"]})',
                additionalProperties: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              multiple: {
                type: 'boolean',
                description: '是否允许多选'
              }
            },
            additionalProperties: false
          }
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
          case 'select_file': {
            const { prompt, defaultLocation, fileTypes, multiple } = request.params.arguments as Record<string, unknown>;
            
            const params: FileSelectParams = {
              prompt: typeof prompt === 'string' ? prompt : undefined,
              defaultLocation: typeof defaultLocation === 'string' ? defaultLocation : undefined,
              fileTypes: typeof fileTypes === 'object' && fileTypes !== null ? fileTypes as Record<string, string[]> : undefined,
              multiple: typeof multiple === 'boolean' ? multiple : undefined
            };

            const result = await selectFile(params);
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
    console.error('File Select MCP server running on stdio');
  }
}

const server = new FileSelectServer();
server.run().catch(console.error); 