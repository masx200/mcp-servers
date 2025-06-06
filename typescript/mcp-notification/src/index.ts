#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { sendNotification, NotificationParams, stopRepeatNotification, stopAllRepeatNotifications, getActiveRepeatNotifications, getRepeatNotificationInfo } from './notification.js';

class NotificationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'notification-mcp',
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
          name: 'send_notification',
          description: '发送系统通知',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: '通知标题',
              },
              message: {
                type: 'string',
                description: '通知内容',
              },
              subtitle: {
                type: 'string',
                description: '可选的副标题',
              },
              sound: {
                type: 'boolean',
                description: '是否播放默认通知声音',
                default: true,
              },
              delay: {
                oneOf: [
                  { type: 'number' },
                  { type: 'string' }
                ],
                description: '延迟发送通知（毫秒或时间字符串如"10s", "1m", "1h"）',
              },
              repeat: {
                oneOf: [
                  { type: 'number' },
                  { type: 'string' }
                ],
                description: '重复通知间隔（毫秒或时间字符串如"10s", "1m", "1h"）',
              },
              repeatCount: {
                type: 'number',
                description: '重复次数（可选，如果设置了repeat但未设置此项则无限重复）',
                minimum: 1,
              },
            },
            required: ['title', 'message'],
            additionalProperties: false,
          },
        },
        {
          name: 'notification_task_management',
          description: '管理计划的通知任务',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['stop_repeat_task', 'stop_all_repeat_tasks', 'get_active_repeat_tasks', 'get_repeat_task_info'],
                description: 'stop_repeat_task: 停止指定的重复通知任务. stop_all_repeat_tasks: 停止所有重复通知任务. get_active_repeat_tasks: 获取所有活跃的重复通知任务. get_repeat_task_info: 获取指定重复通知任务的信息.'
              },
              taskId: {
                type: 'string',
                description: '要管理的任务ID'
              }
            },
            required: ['action'],
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
          case 'send_notification': {
            const { title, message, subtitle, sound, delay, repeat, repeatCount } = request.params.arguments as Record<string, unknown>;
            
            if (typeof title !== 'string' || typeof message !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Title and message must be strings');
            }

            const params: NotificationParams = {
              title,
              message,
              subtitle: typeof subtitle === 'string' ? subtitle : undefined,
              sound: typeof sound === 'boolean' ? sound : undefined,
              delay: (typeof delay === 'number' || typeof delay === 'string') ? delay : undefined,
              repeat: (typeof repeat === 'number' || typeof repeat === 'string') ? repeat : undefined,
              repeatCount: typeof repeatCount === 'number' ? repeatCount : undefined
            };

            const result = await sendNotification(params);
            return {
              content: [
                {
                  type: 'text',
                  text: result.notificationId ? 
                    `${result.message}. Task ID: ${result.notificationId}` : 
                    result.message,
                },
              ],
            };
          }

          case 'notification_task_management': {
            const { action, taskId } = request.params.arguments as Record<string, unknown>;
            
            switch (action) {
              case 'stop_repeat_task': {
                const success = stopRepeatNotification(taskId as string);
                return {
                  content: [
                    {
                      type: 'text',
                      text: success ? `任务 ${taskId} 已成功停止` : `任务 ${taskId} 未找到`,
                    },
                  ],
                };
              }
              case 'stop_all_repeat_tasks': {
                const count = stopAllRepeatNotifications();
                return {
                  content: [
                    {
                      type: 'text',
                      text: `已停止 ${count} 个重复任务`,
                    },
                  ],
                };
              }
              case 'get_active_repeat_tasks': {
                const tasks = getActiveRepeatNotifications();
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(tasks, null, 2),
                    },
                  ],
                };
              }
              case 'get_repeat_task_info': {
                const info = getRepeatNotificationInfo(taskId as string);
                return {
                  content: [
                    {
                      type: 'text',
                      text: info ? JSON.stringify(info, null, 2) : `任务 ${taskId} 未找到`,
                    },
                  ],
                };
              }
              default:
                throw new McpError(
                  ErrorCode.MethodNotFound,
                  `Unknown task management action: ${action}`
                );
            }
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
    console.error('Notification MCP server running on stdio');
  }
}

const server = new NotificationServer();
server.run().catch(console.error); 