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

interface PromptParams {
  /** Text to display in the prompt dialog */
  message: string;
  /** Optional default text to pre-fill */
  defaultAnswer?: string;
  /** Optional custom button labels */
  buttons?: string[];
  /** Optional icon name to display (note, stop, caution) */
  icon?: 'note' | 'stop' | 'caution';
}

interface PromptResult {
  /** Text entered by the user */
  text: string;
  /** Text of the button clicked */
  selectedButton: string;
}

interface ConfirmParams {
  /** Text to display in the confirmation dialog */
  message: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Optional icon name to display (note, stop, caution) */
  icon?: 'note' | 'stop' | 'caution';
}

interface ConfirmResult {
  /** Whether the user confirmed the action */
  confirmed: boolean;
  /** Text of the button clicked */
  selectedButton: string;
}

// 检测操作系统
function getOS(): 'windows' | 'macos' | 'linux' {
  const currentPlatform = process.platform;
  if (currentPlatform === 'win32') return 'windows';
  if (currentPlatform === 'darwin') return 'macos';
  return 'linux';
}

/**
 * Validates confirm parameters
 */
function validateConfirmParams(params: ConfirmParams): void {
  if (!params.message || typeof params.message !== 'string') {
    throw new Error(
      'Message is required and must be a string'
    );
  }

  if (params.confirmText && typeof params.confirmText !== 'string') {
    throw new Error(
      'Confirm text must be a string'
    );
  }

  if (params.cancelText && typeof params.cancelText !== 'string') {
    throw new Error(
      'Cancel text must be a string'
    );
  }

  if (params.icon && !['note', 'stop', 'caution'].includes(params.icon)) {
    throw new Error(
      'Icon must be one of: note, stop, caution'
    );
  }
}

/**
 * Validates prompt parameters
 */
function validatePromptParams(params: PromptParams): void {
  if (!params.message || typeof params.message !== 'string') {
    throw new Error(
      'Message is required and must be a string'
    );
  }

  if (params.defaultAnswer && typeof params.defaultAnswer !== 'string') {
    throw new Error(
      'Default answer must be a string'
    );
  }

  if (params.buttons) {
    if (!Array.isArray(params.buttons) || !params.buttons.every(b => typeof b === 'string')) {
      throw new Error(
        'Buttons must be an array of strings'
      );
    }
    if (params.buttons.length > 3) {
      throw new Error(
        'Maximum of 3 buttons allowed'
      );
    }
  }

  if (params.icon && !['note', 'stop', 'caution'].includes(params.icon)) {
    throw new Error(
      'Icon must be one of: note, stop, caution'
    );
  }
}

/**
 * Builds the AppleScript command for displaying a prompt
 */
function buildMacOSPromptCommand(params: PromptParams): string {
  let script = 'display dialog';
  
  script += ` "${escapeString(params.message)}"`;
  
  // 始终显示输入框，如果没有 defaultAnswer 就使用空字符串
  script += ` default answer "${escapeString(params.defaultAnswer || '')}"`;
  
  if (params.buttons && params.buttons.length > 0) {
    script += ` buttons {${params.buttons.map(b => `"${escapeString(b)}"`).join(', ')}}`;
    script += ` default button ${params.buttons.length}`;
  } else {
    script += ' buttons {"Cancel", "OK"} default button 2';
  }
  
  if (params.icon) {
    script += ` with icon ${params.icon}`;
  }
  
  return `osascript -e '${script}'`;
}

/**
 * Builds the Windows PowerShell command for displaying a prompt
 */
function buildWindowsPromptCommand(params: PromptParams): string {
  const { message, defaultAnswer, buttons, icon } = params;
  
  // 映射图标
  const iconMap: Record<string, string> = {
    'note': 'Information',
    'stop': 'Error', 
    'caution': 'Warning'
  };
  
  const iconType = icon ? iconMap[icon] || 'Information' : 'Information';
  const buttonList = buttons || ['Cancel', 'OK'];
  
  // 始终显示输入框（prompt_user 工具的目的就是获取用户输入）
  const script = `
    Add-Type -AssemblyName Microsoft.VisualBasic;
    $result = [Microsoft.VisualBasic.Interaction]::InputBox('${escapeString(message)}', 'Input', '${escapeString(defaultAnswer || '')}');
    if ($result -eq '') { 
      Write-Output 'button returned:Cancel, text returned:' 
    } else { 
      Write-Output "button returned:OK, text returned:$result" 
    }
  `;
  return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
}

// 新增：检查并安装 zenity
async function ensureZenityInstalled(): Promise<void> {
  try {
    // 检查 zenity 是否已安装
    await execAsync('which zenity || zenity --version').catch(() => {});
  } catch {
    // 未安装时自动安装
    console.log('检测到系统未安装 zenity，正在自动安装...');
    try {
      // 根据发行版选择包管理器
      const { stdout: distro } = await execAsync('grep ^ID= /etc/os-release | cut -d= -f2');
      const pkgManager = distro.trim() === 'debian' || distro.trim() === 'ubuntu' ? 'apt' : 'dnf';
      await execAsync(`sudo ${pkgManager} install -y zenity`);
      console.log('zenity 安装成功！');
    } catch (installError) {
      throw new Error(
        `自动安装 zenity 失败，请手动运行以下命令安装：\n` +
        `  Ubuntu/Debian: sudo apt install zenity\n` +
        `  Fedora/RHEL: sudo dnf install zenity`
      );
    }
  }
}

/**
 * Builds the Linux command for displaying a prompt (using zenity)
 */
async function buildLinuxPromptCommand(params: PromptParams): Promise<string> {
  await ensureZenityInstalled(); // 确保 zenity 存在
  const { message, defaultAnswer, buttons, icon } = params;
  
  const iconMap: Record<string, string> = {
    'note': '--info',
    'stop': '--error',
    'caution': '--warning'
  };
  
  const iconFlag = icon ? iconMap[icon] || '--info' : '--info';
  
  // 始终显示输入框（prompt_user 工具的目的就是获取用户输入）
  let command = `zenity --entry --text="${escapeString(message)}"`;
  command += ` --entry-text="${escapeString(defaultAnswer || '')}"`;
  command += ` --title="Input"`;
  
  return `bash -c '
    result=$(${command} 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "button returned:OK, text returned:$result"
    else
      echo "button returned:Cancel, text returned:"
    fi
  '`;
}

/**
 * Prompts the user for input using platform-appropriate dialogs
 */
async function promptUser(params: PromptParams): Promise<PromptResult> {
  try {
    validatePromptParams(params);
    
    const os = getOS();
    let command: string;
    
    switch (os) {
      case 'macos':
        command = buildMacOSPromptCommand(params);
        break;
      case 'windows':
        command = buildWindowsPromptCommand(params);
        break;
      case 'linux':
        command = await buildLinuxPromptCommand(params);
        break;
      default:
        throw new Error(
          `Unsupported platform: ${os}`
        );
    }
    
    const { stdout } = await execAsync(command);
    
    // Parse the result (all platforms now return in same format)
    // Format: button returned:OK, text returned:user input
    const match = stdout.trim().match(/button returned:([^,]+)(?:, text returned:(.*))?/);
    if (!match) {
      throw new Error('Failed to parse dialog result');
    }
    
    const buttonText = match[1];
    const text = match[2] || '';
    
    return {
      text: text,
      selectedButton: buttonText
    };
  } catch (error) {
    const err = error as Error;
    console.error(err.message);
    if (err.message.includes('User canceled') || err.message.includes('was cancelled')) {
      throw new Error(
        'User cancelled the prompt'
      );
    } else if (err.message.includes('execution error')) {
      throw new Error(
        'Failed to execute prompt command'
      );
    } else if (err.message.includes('permission')) {
      throw new Error(
        'Permission denied when trying to show prompt'
      );
    } else {
      throw new Error(
        `Unexpected error: ${err.message}`
      );
    }
  }
}

/**
 * Builds confirmation dialog commands for different platforms
 */
function buildConfirmCommand(params: ConfirmParams): string {
  const { message, confirmText = '确认', cancelText = '取消', icon } = params;
  const os = getOS();

  switch (os) {
    case 'macos': {
      let script = `display dialog "${escapeString(message)}"`;
      script += ` buttons {"${escapeString(cancelText)}", "${escapeString(confirmText)}"}`;
      script += ` default button 2`;
      if (icon) {
        script += ` with icon ${icon}`;
      }
      // 使用 try/catch 处理用户取消的情况
      return `osascript -e 'try
        set result to ${script}
        set buttonPressed to button returned of result
        if buttonPressed is equal to "${escapeString(confirmText)}" then
          return "button returned:${escapeString(confirmText)}"
        else
          return "button returned:${escapeString(cancelText)}"
        end if
      on error
        return "button returned:${escapeString(cancelText)}"
      end try'`;
    }
    
    case 'windows': {
      const iconMap: Record<string, string> = {
        'note': 'Information',
        'stop': 'Error',
        'caution': 'Warning'
      };
      const iconType = icon ? iconMap[icon] || 'Information' : 'Information';
      
      const script = `
        Add-Type -AssemblyName System.Windows.Forms;
        $result = [System.Windows.Forms.MessageBox]::Show('${escapeString(message)}', 'Confirm', 'OKCancel', '${iconType}');
        if ($result -eq 'OK') {
          Write-Output 'button returned:${escapeString(confirmText)}'
        } else {
          Write-Output 'button returned:${escapeString(cancelText)}'
        }
      `;
      return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
    }
    
    case 'linux': {
      const iconFlag = icon ? `--${icon === 'note' ? 'info' : icon === 'stop' ? 'error' : 'warning'}` : '--question';
      return `bash -c '
        if zenity --question ${iconFlag} --text="${escapeString(message)}" --ok-label="${escapeString(confirmText)}" --cancel-label="${escapeString(cancelText)}" --title="Confirm" 2>/dev/null; then
          echo "button returned:${escapeString(confirmText)}"
        else
          echo "button returned:${escapeString(cancelText)}"
        fi
      '`;
    }
    
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Shows a confirmation dialog to the user
 */
async function confirmUser(params: ConfirmParams): Promise<ConfirmResult> {
  try {
    validateConfirmParams(params);
    
    const confirmText = params.confirmText || '确认';
    const cancelText = params.cancelText || '取消';
    
    const command = buildConfirmCommand(params);
    const { stdout } = await execAsync(command);
    
    // Parse the result
    const match = stdout.trim().match(/button returned:(.+)/);
    if (!match) {
      throw new Error('Failed to parse dialog result');
    }
    
    const selectedButton = match[1];
    const confirmed = selectedButton === confirmText;
    
    return {
      confirmed,
      selectedButton
    };
  } catch (error) {
    const err = error as Error;
    console.error(err.message);
    
    // 如果是用户取消操作，返回取消结果而不是抛出错误
    if (err.message.includes('用户已取消') || err.message.includes('User canceled') || err.message.includes('cancelled')) {
      return {
        confirmed: false,
        selectedButton: params.cancelText || '取消'
      };
    }
    
    // 其他错误继续抛出
    throw new Error(`确认对话框执行失败: ${err.message}`);
  }
}

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
          description: '显示prompt dialog，需要获得用户输入时，可以调用此工具',
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
        {
          name: 'confirm_user',
          description: '显示confirm dialog，用于需要用户确认操作时调用，比如是否删除文件，是否覆盖保存文件，是否退出程序等',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: '在确认对话框中显示的文本',
              },
              confirmText: {
                type: 'string',
                description: '确认按钮的文本，默认为"确认"',
                default: '确认'
              },
              cancelText: {
                type: 'string', 
                description: '取消按钮的文本，默认为"取消"',
                default: '取消'
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

          case 'confirm_user': {
            const { message, confirmText, cancelText, icon } = request.params.arguments as Record<string, unknown>;
            
            const params: ConfirmParams = {
              message: message as string,
              confirmText: typeof confirmText === 'string' ? confirmText : '确认',
              cancelText: typeof cancelText === 'string' ? cancelText : '取消',
              icon: ['note', 'stop', 'caution'].includes(icon as string) ? icon as 'note' | 'stop' | 'caution' : undefined
            };

            const result = await confirmUser(params);
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