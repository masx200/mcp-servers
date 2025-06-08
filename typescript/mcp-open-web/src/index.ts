#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import open from 'open';

// 支持的搜索引擎配置
const SEARCH_ENGINES = {
  baidu: {
    name: '百度',
    url: 'https://baidu.com/s',
    param: 'wd'
  },
  google: {
    name: 'Google',
    url: 'https://www.google.com/search',
    param: 'q'
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search',
    param: 'q'
  },
  sogou: {
    name: '搜狗',
    url: 'https://www.sogou.com/web',
    param: 'query'
  },
  so360: {
    name: '360搜索',
    url: 'https://www.so.com/s',
    param: 'q'
  }
} as const;

type SearchEngine = keyof typeof SEARCH_ENGINES;

/**
 * 编码搜索关键词为URL参数
 */
function encodeSearchQuery(query: string): string {
  return encodeURIComponent(query);
}

/**
 * 构建搜索URL
 */
function buildSearchUrl(engine: SearchEngine, query: string): string {
  const config = SEARCH_ENGINES[engine];
  const encodedQuery = encodeSearchQuery(query);
  return `${config.url}?${config.param}=${encodedQuery}`;
}

/**
 * 验证URL格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 添加协议前缀（如果缺少）
 */
function ensureProtocol(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

class OpenWebServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'open-web-mcp',
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
          name: 'open_web',
          description: '使用系统默认浏览器打开指定网址',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: '要打开的网址，支持自动添加https://协议',
              },
            },
            required: ['url'],
            additionalProperties: false,
          },
        },
        {
          name: 'web_search',
          description: '使用指定搜索引擎搜索关键词',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '要搜索的关键词',
              },
              engine: {
                type: 'string',
                enum: ['baidu', 'google', 'bing', 'sogou', 'so360'],
                description: '搜索引擎，默认为百度',
                default: 'baidu'
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (!request.params.arguments || typeof request.params.arguments !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, '参数无效');
        }

        switch (request.params.name) {
          case 'open_web': {
            const { url } = request.params.arguments as { url: string };
            
            if (!url || typeof url !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'URL参数是必需的，且必须是字符串');
            }

            const finalUrl = ensureProtocol(url);
            
            if (!isValidUrl(finalUrl)) {
              throw new McpError(ErrorCode.InvalidParams, `无效的URL格式: ${url}`);
            }

            await open(finalUrl);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `已在默认浏览器中打开: ${finalUrl}`,
                },
              ],
            };
          }

          case 'web_search': {
            const { query, engine = 'baidu' } = request.params.arguments as { 
              query: string; 
              engine?: SearchEngine 
            };
            
            if (!query || typeof query !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, '搜索关键词是必需的，且必须是字符串');
            }

            if (engine && !Object.keys(SEARCH_ENGINES).includes(engine)) {
              throw new McpError(
                ErrorCode.InvalidParams, 
                `不支持的搜索引擎: ${engine}。支持的引擎: ${Object.keys(SEARCH_ENGINES).join(', ')}`
              );
            }

            const searchUrl = buildSearchUrl(engine, query);
            await open(searchUrl);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `已在${SEARCH_ENGINES[engine].name}中搜索"${query}": ${searchUrl}`,
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        const err = error as Error;
        throw new McpError(
          ErrorCode.InternalError,
          `操作失败: ${err.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Open Web MCP server running on stdio');
  }
}

const server = new OpenWebServer();
server.run().catch(console.error); 