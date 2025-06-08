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
import { stat } from 'fs/promises';
import { join } from 'path';

export const execAsync = promisify(exec);

/**
 * Escapes special characters in strings for AppleScript
 */
export function escapeString(str: string): string {
  // Escape for both AppleScript and shell
  return str
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"');
} 

export interface ScreenshotParams {
  /** Path where to save the screenshot */
  path: string;
  /** Type of screenshot to take */
  type: 'fullscreen' | 'window' | 'selection';
  /** Image format (png, jpg, pdf, tiff) */
  format?: 'png' | 'jpg' | 'pdf' | 'tiff';
  /** Whether to hide the cursor */
  hideCursor?: boolean;
  /** Timestamp to add to filename (defaults to current time) */
  timestamp?: boolean;
}

// 检测操作系统
function getOS(): 'windows' | 'macos' | 'linux' {
  const currentPlatform = process.platform;
  if (currentPlatform === 'win32') return 'windows';
  if (currentPlatform === 'darwin') return 'macos';
  return 'linux';
}

/**
 * Validates screenshot parameters
 */
function validateScreenshotParams(params: ScreenshotParams): void {
  if (!params.path || typeof params.path !== 'string') {
    throw new Error(
      'Path is required and must be a string'
    );
  }

  if (!params.type || !['fullscreen', 'window', 'selection'].includes(params.type)) {
    throw new Error(
      'Type must be one of: fullscreen, window, selection'
    );
  }

  if (params.format && !['png', 'jpg', 'jpeg', 'pdf', 'tiff'].includes(params.format)) {
    throw new Error(
      'Format must be one of: png, jpg, jpeg, pdf, tiff'
    );
  }

  if (params.hideCursor !== undefined && typeof params.hideCursor !== 'boolean') {
    throw new Error(
      'HideCursor must be a boolean'
    );
  }

  if (params.timestamp !== undefined && typeof params.timestamp !== 'boolean') {
    throw new Error(
      'Timestamp must be a boolean'
    );
  }
}

/**
 * Builds the screencapture command for macOS
 */
function buildMacOSScreenshotCommand(params: ScreenshotParams): string {
  let command = 'screencapture';
  
  // Screenshot type
  switch (params.type) {
    case 'window':
      command += ' -w'; // Capture window
      break;
    case 'selection':
      command += ' -s'; // Interactive selection
      break;
    // fullscreen is default, no flag needed
  }
  
  // Optional flags
  if (params.format) {
    command += ` -t ${params.format}`;
  }
  
  if (params.hideCursor) {
    command += ' -C'; // Hide cursor
  }
  
  command += ` "${escapeString(params.path)}"`;
  
  return command;
}

/**
 * Builds the PowerShell screenshot command for Windows
 */
function buildWindowsScreenshotCommand(params: ScreenshotParams): string {
  const { path, type, format = 'png' } = params;
  
  // 映射格式
  const formatMap: Record<string, string> = {
    'png': 'Png',
    'jpg': 'Jpeg', 
    'jpeg': 'Jpeg',
    'bmp': 'Bmp',
    'gif': 'Gif'
  };
  
  const imageFormat = formatMap[format.toLowerCase()] || 'Png';
  
  if (type === 'selection') {
    // Windows 没有直接的区域选择，使用 Snipping Tool
    return `start ms-screenclip:`;
  }
  
  // PowerShell 截图脚本
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    Add-Type -AssemblyName System.Drawing;
    
    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen;
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap);
    
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
    
    $bitmap.Save('${escapeString(path)}', [System.Drawing.Imaging.ImageFormat]::${imageFormat});
    
    $graphics.Dispose();
    $bitmap.Dispose();
  `;
  
  return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
}

/**
 * Builds the screenshot command for Linux
 */
function buildLinuxScreenshotCommand(params: ScreenshotParams): string {
  const { path, type, format = 'png', hideCursor } = params;
  
  // 首选方案：gnome-screenshot (GNOME 桌面默认有)
  // 备选方案：scrot, import (ImageMagick), xwd
  
  const gnomeCommand = buildGnomeScreenshotCommand(params, path);
  const scrotCommand = buildScrotCommand(params, path);
  const importCommand = buildImageMagickCommand(params, path);
  const xwdCommand = buildXwdCommand(params, path);
  
  // 按优先级尝试不同工具
  return `bash -c '
    if command -v gnome-screenshot >/dev/null 2>&1; then
      ${gnomeCommand}
    elif command -v scrot >/dev/null 2>&1; then
      ${scrotCommand}
    elif command -v import >/dev/null 2>&1; then
      ${importCommand}
    elif command -v xwd >/dev/null 2>&1; then
      ${xwdCommand}
    else
      echo "No screenshot tool available. Please install gnome-screenshot, scrot, or imagemagick" >&2
      exit 1
    fi
  '`;
}

/**
 * Build gnome-screenshot command
 */
function buildGnomeScreenshotCommand(params: ScreenshotParams, path: string): string {
  let cmd = 'gnome-screenshot';
  
  switch (params.type) {
    case 'window':
      cmd += ' --window';
      break;
    case 'selection':
      cmd += ' --area';
      break;
    // fullscreen is default
  }
  
  cmd += ` --file="${escapeString(path)}"`;
  
  return cmd;
}

/**
 * Build scrot command
 */
function buildScrotCommand(params: ScreenshotParams, path: string): string {
  let cmd = 'scrot';
  
  switch (params.type) {
    case 'window':
      cmd += ' --focused';
      break;
    case 'selection':
      cmd += ' --select';
      break;
    // fullscreen is default
  }
  
  if (params.hideCursor) {
    cmd += ' --pointer';
  }
  
  cmd += ` "${escapeString(path)}"`;
  
  return cmd;
}

/**
 * Build ImageMagick import command
 */
function buildImageMagickCommand(params: ScreenshotParams, path: string): string {
  let cmd = 'import';
  
  switch (params.type) {
    case 'window':
      cmd += ' -window root';
      break;
    case 'selection':
      // import 默认就是区域选择
      break;
    case 'fullscreen':
      cmd += ' -window root';
      break;
  }
  
  cmd += ` "${escapeString(path)}"`;
  
  return cmd;
}

/**
 * Build xwd command (X Window Dump)
 */
function buildXwdCommand(params: ScreenshotParams, path: string): string {
  let cmd = 'xwd';
  
  switch (params.type) {
    case 'window':
      cmd += ' -id $(xdotool getwindowfocus)';
      break;
    case 'selection':
      // xwd 默认点击选择窗口
      break;
    case 'fullscreen':
      cmd += ' -root';
      break;
  }
  
  // xwd 输出需要转换为常见格式
  const tempFile = `/tmp/screenshot_${Date.now()}.xwd`;
  cmd += ` -out "${tempFile}"`;
  
  // 转换为目标格式 (需要 ImageMagick)
  cmd += ` && convert "${tempFile}" "${escapeString(path)}" && rm "${tempFile}"`;
  
  return cmd;
}

/**
 * Takes a screenshot using platform-appropriate tools
 */
export async function takeScreenshot(params: ScreenshotParams): Promise<string> {
  try {
    validateScreenshotParams(params);
    
    // 检查path是否是目录，如果是则生成时间戳文件名
    let finalPath = params.path;
    try {
      const pathStat = await stat(params.path);
      if (pathStat.isDirectory()) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const format = params.format || 'png';
        const filename = `screenshot-${timestamp}.${format}`;
        finalPath = join(params.path, filename);
      }
    } catch (error) {
      // 如果路径不存在，保持原样（可能是要创建新文件）
    }

    // 使用最终路径创建新的参数对象
    const finalParams = { ...params, path: finalPath };
    
    const os = getOS();
    let command: string;
    
    switch (os) {
      case 'macos':
        command = buildMacOSScreenshotCommand(finalParams);
        break;
      case 'windows':
        command = buildWindowsScreenshotCommand(finalParams);
        break;
      case 'linux':
        command = buildLinuxScreenshotCommand(finalParams);
        break;
      default:
        throw new Error(
          `Unsupported platform: ${os}`
        );
    }
    
    await execAsync(command);
    return finalPath;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('execution error')) {
      throw new Error(
        'Failed to capture screenshot'
      );
    } else if (err.message.includes('permission')) {
      throw new Error(
        'Permission denied when trying to capture screenshot'
      );
    } else {
      throw new Error(
        `Unexpected error: ${err.message}`
      );
    }
  }
}

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
          description: '使用系统原生工具截图',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: '保存截图的路径，可以是完整的文件路径，也可以是目录路径（会自动生成时间戳文件名）',
              },
              type: {
                type: 'string',
                enum: ['fullscreen', 'window', 'selection'],
                description: '截图类型，fullscreen表示全屏截图，window表示截取指定窗口，selection表示选区截图',
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
            const { path, type, format, hideCursor, timestamp } = request.params.arguments as Record<string, unknown>;
            
            const params = {
              path: path as string,
              type: type as 'fullscreen' | 'window' | 'selection',
              format: format as 'png' | 'jpg' | 'pdf' | 'tiff' | undefined,
              hideCursor: typeof hideCursor === 'boolean' ? hideCursor : undefined,
              timestamp: typeof timestamp === 'boolean' ? timestamp : undefined
            };

            const savePath = await takeScreenshot(params);
            return {
              content: [
                {
                  type: 'text',
                  text: `截图保存成功，保存在${savePath}`,
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