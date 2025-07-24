#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Escapes special characters in strings for AppleScript
 */
function escapeString(str: string): string {
  // Escape for both AppleScript and shell
  return str
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"');
} 

interface NotificationParams {
  /** Title of the notification */
  title: string;
  /** Main message content */
  message: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Whether to play the default notification sound */
  sound?: boolean;
  /** Delay before sending notification (milliseconds or time string like "10s", "1m", "1h") */
  delay?: number | string;
  /** Repeat interval for recurring notifications (milliseconds or time string like "10s", "1m", "1h") */
  repeat?: number | string;
  /** Number of times to repeat (optional, defaults to infinite if repeat is set) */
  repeatCount?: number;
}

interface NotificationResult {
  /** Notification ID for repeat notifications (only present when repeat is used) */
  notificationId?: string;
  /** Message indicating the result */
  message: string;
}

interface RepeatNotification {
  /** Unique notification ID */
  id: string;
  /** Original notification parameters */
  params: NotificationParams;
  /** Timeout ID for next notification */
  timeoutId: NodeJS.Timeout;
  /** Current repeat count */
  currentCount: number;
  /** Maximum repeat count (Infinity for unlimited) */
  maxCount: number;
  /** Start time */
  startTime: number;
}

// 任务池：存储所有活跃的重复提醒任务
const repeatNotificationPool = new Map<string, RepeatNotification>();

/**
 * 生成唯一任务ID
 */
function generateNotificationId(): string {
  return 'notification_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Validates notification parameters
 */
function validateParams(params: NotificationParams): void {
  if (!params.title || typeof params.title !== 'string') {
    throw new Error(
      'Title is required and must be a string'
    );
  }

  if (!params.message || typeof params.message !== 'string') {
    throw new Error(
      'Message is required and must be a string'
    );
  }

  if (params.subtitle && typeof params.subtitle !== 'string') {
    throw new Error(
      'Subtitle must be a string'
    );
  }
}

/**
 * Builds the AppleScript command for sending a notification
 */
function buildNotificationCommand(params: NotificationParams): string {
  const { title, message, subtitle, sound = true } = params;
  
  let script = `display notification "${escapeString(message)}" with title "${escapeString(title)}"`;
  
  if (subtitle) {
    script += ` subtitle "${escapeString(subtitle)}"`;
  }
  
  if (sound) {
    script += ` sound name "default"`;
  }
  
  return `osascript -e '${script}'`;
}

// 检测操作系统
function getOS(): 'windows' | 'macos' | 'linux' {
  const currentPlatform = process.platform;
  if (currentPlatform === 'win32') return 'windows';
  if (currentPlatform === 'darwin') return 'macos';
  return 'linux';
}

// Windows 通知命令构建
function buildWindowsNotificationCommand(params: NotificationParams): string {
  const { title, message, sound = true } = params;
  
  // 使用 PowerShell 的 BalloonTip
  let script = `
    Add-Type -AssemblyName System.Windows.Forms;
    $notification = New-Object System.Windows.Forms.NotifyIcon;
    $notification.Icon = [System.Drawing.SystemIcons]::Information;
    $notification.BalloonTipTitle = "${escapeString(title)}";
    $notification.BalloonTipText = "${escapeString(message)}";
    $notification.Visible = $true;
    $notification.ShowBalloonTip(5000);
  `;
  
  if (sound) {
    script += `
    [System.Media.SystemSounds]::Asterisk.Play();
    `;
  }
  
  script += `
    Start-Sleep -Seconds 1;
    $notification.Dispose();
  `;
  
  return `powershell -Command "${script}"`;
}

// Linux 通知命令构建
function buildLinuxNotificationCommand(params: NotificationParams): string {
  const { title, message, subtitle, sound = true } = params;
  
  let command = `notify-send "${escapeString(title)}" "${escapeString(message)}"`;
  
  if (subtitle) {
    // 将 subtitle 添加到消息中，因为 notify-send 不直接支持副标题
    command = `notify-send "${escapeString(title)}" "${escapeString(subtitle)}\n${escapeString(message)}"`;
  }
  
  // 添加声音支持
  if (sound) {
    command += ` --hint=string:sound-name:message-new-instant`;
  }
  
  return command;
}

/**
 * 解析时间字符串为毫秒数
 */
function parseTimeDelay(delay: number | string): number {
  if (typeof delay === 'number') {
    return delay;
  }
  
  const timeString = delay.toLowerCase().trim();
  const match = timeString.match(/^(\d+(?:\.\d+)?)\s*([smh]?)$/);
  
  if (!match) {
    throw new Error(
      'Invalid time format. Use numbers (milliseconds) or strings like "10s", "1m", "1h"'
    );
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'ms'; // 默认单位为毫秒
  
  switch (unit) {
    case 's': return value * 1000;           // 秒
    case 'm': return value * 60 * 1000;      // 分钟  
    case 'h': return value * 60 * 60 * 1000; // 小时
    default: return value;                    // 毫秒
  }
}

/**
 * Sends a notification using the appropriate platform command
 */
async function sendNotification(params: NotificationParams): Promise<NotificationResult> {
  // 如果有 repeat 参数，设置重复提醒
  if (params.repeat !== undefined) {
    const repeatMs = parseTimeDelay(params.repeat);
    
    if (repeatMs <= 0) {
      throw new Error(
        'Repeat interval must be a positive number'
      );
    }

    const notificationId = generateNotificationId();
    const { repeat, repeatCount, ...notificationParams } = params;
    const maxCount = repeatCount || Infinity;

    // 创建重复发送的函数
    const scheduleNextNotification = (currentCount: number) => {
      if (currentCount >= maxCount) {
        // 任务完成，从任务池中移除
        repeatNotificationPool.delete(notificationId);
        return;
      }
      
      const timeoutId = setTimeout(async () => {
        try {
          // 检查任务是否还在任务池中（可能已被取消）
          const notification = repeatNotificationPool.get(notificationId);
          if (!notification) return;

          await sendNotification(notificationParams);
          
          // 更新任务信息
          notification.currentCount++;
          
          // 调度下一次通知
          scheduleNextNotification(currentCount + 1);
        } catch (error) {
          console.error('Repeated notification failed:', error);
          // 即使失败也继续下一次
          scheduleNextNotification(currentCount + 1);
        }
      }, repeatMs);

      // 更新任务池中的任务信息
      const notification = repeatNotificationPool.get(notificationId);
      if (notification) {
        // 清除旧的timeout
        if (notification.timeoutId) {
          clearTimeout(notification.timeoutId);
        }
        notification.timeoutId = timeoutId;
      }
    };

    // 创建任务并加入任务池
    const notification: RepeatNotification = {
      id: notificationId,
      params,
      timeoutId: null as any, // 稍后设置
      currentCount: 0,
      maxCount,
      startTime: Date.now()
    };
    
    repeatNotificationPool.set(notificationId, notification);

    // 如果有初始延迟，先等待延迟再开始重复
    if (params.delay !== undefined) {
      const delayMs = parseTimeDelay(params.delay);
      notification.timeoutId = setTimeout(() => {
        // 发送第一次通知并开始重复
        sendNotification(notificationParams).then(() => {
          notification.currentCount = 1;
          scheduleNextNotification(1);
        }).catch(error => {
          console.error('Initial repeated notification failed:', error);
          scheduleNextNotification(1);
        });
      }, delayMs);
    } else {
      // 没有初始延迟，立即开始第一次通知
      try {
        await sendNotification(notificationParams);
        notification.currentCount = 1;
        scheduleNextNotification(1);
      } catch (error) {
        console.error('Initial repeated notification failed:', error);
        scheduleNextNotification(1);
      }
    }
    
    return {
      notificationId,
      message: `Repeat notification notification created with ID: ${notificationId}`
    };
  }

  // 如果有 delay 参数但没有 repeat，使用 setTimeout 延迟发送
  if (params.delay !== undefined) {
    const delayMs = parseTimeDelay(params.delay);
    
    if (delayMs <= 0) {
      throw new Error(
        'Delay must be a positive number'
      );
    }
    
    try {
      // 设置延迟任务
      setTimeout(async () => {
        try {
          // 创建不包含 delay 的参数对象，避免无限递归
          const { delay, ...notificationParams } = params;
          await sendNotification(notificationParams);
        } catch (error) {
          console.error('Delayed notification failed:', error);
        }
      }, delayMs);
      
      // 立即返回设置成功
      return { message: 'Delayed notification scheduled successfully' };
    } catch (error) {
      throw new Error(
        'Failed to schedule delayed notification'
      );
    }
  }

  // 立即发送通知的逻辑
  try {
    validateParams(params);
    
    const os = getOS();
    let command: string;
    
    switch (os) {
      case 'macos':
        command = buildNotificationCommand(params);
        break;
      case 'windows':
        command = buildWindowsNotificationCommand(params);
        break;
      case 'linux':
        command = buildLinuxNotificationCommand(params);
        break;
      default:
        throw new Error(
          `Unsupported platform: ${os}`
        );
    }
    
    await execAsync(command);
    return { message: 'Notification sent successfully' };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    // Handle different types of system errors
    const err = error as Error;
    if (err.message.includes('execution error')) {
      throw new Error(
        'Failed to execute notification command'
      );
    } else if (err.message.includes('permission')) {
      throw new Error(
        'Permission denied when trying to send notification'
      );
    } else {
      throw new Error(
        `Unexpected error: ${err.message}`
      );
    }
  }
}

/**
 * 停止指定的重复提醒任务
 */
function stopRepeatNotification(notificationId: string): boolean {
  const notification = repeatNotificationPool.get(notificationId);
  if (!notification) {
    return false;
  }
  
  // 清除定时器
  if (notification.timeoutId) {
    clearTimeout(notification.timeoutId);
  }
  
  // 从任务池中移除
  repeatNotificationPool.delete(notificationId);
  
  return true;
}

/**
 * 停止所有重复提醒任务
 */
function stopAllRepeatNotifications(): number {
  const count = repeatNotificationPool.size;
  
  // 清除所有定时器
  for (const notification of repeatNotificationPool.values()) {
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }
  }
  
  // 清空任务池
  repeatNotificationPool.clear();
  
  return count;
}

/**
 * 获取所有活跃的重复提醒任务信息
 */
function getActiveRepeatNotifications(): RepeatNotification[] {
  return Array.from(repeatNotificationPool.values()).map(notification => ({
    ...notification,
    // 不返回timeoutId，避免序列化问题
    timeoutId: null as any
  }));
}

/**
 * 获取指定任务的信息
 */
function getRepeatNotificationInfo(notificationId: string): RepeatNotification | null {
  const notification = repeatNotificationPool.get(notificationId);
  if (!notification) {
    return null;
  }
  
  return {
    ...notification,
    // 不返回timeoutId，避免序列化问题
    timeoutId: null as any
  };
}

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
          description: '发送系统通知或提醒',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: '通知或提醒的标题',
              },
              message: {
                type: 'string',
                description: '通知或提醒的内容',
              },
              subtitle: {
                type: 'string',
                description: '可选的副标题',
              },
              sound: {
                type: 'boolean',
                description: '是否播放默认提示音',
                default: true,
              },
              delay: {
                oneOf: [
                  { type: 'number' },
                  { type: 'string' }
                ],
                description: '延迟发送通知或提醒（毫秒或时间字符串如"10s", "1m", "1h"）',
              },
              repeat: {
                oneOf: [
                  { type: 'number' },
                  { type: 'string' }
                ],
                description: '重复通知或提醒的间隔（毫秒或时间字符串如"10s", "1m", "1h"）',
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
          description: '管理计划的通知或提醒任务',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['stop_repeat_task', 'stop_all_repeat_tasks', 'get_active_repeat_tasks', 'get_repeat_task_info'],
                description: 'stop_repeat_task: 停止指定的重复通知或提醒任务. stop_all_repeat_tasks: 停止所有重复通知或提醒任务. get_active_repeat_tasks: 获取所有活跃的重复通知或提醒任务. get_repeat_task_info: 获取指定重复通知或提醒任务的信息.'
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