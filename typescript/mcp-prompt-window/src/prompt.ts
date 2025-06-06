import { exec } from 'child_process';
import { promisify } from 'util';

declare const process: { platform: string };

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

export interface PromptParams {
  /** Text to display in the prompt dialog */
  message: string;
  /** Optional default text to pre-fill */
  defaultAnswer?: string;
  /** Optional custom button labels */
  buttons?: string[];
  /** Optional icon name to display (note, stop, caution) */
  icon?: 'note' | 'stop' | 'caution';
}

export interface PromptResult {
  /** Text entered by the user, or undefined if cancelled */
  text?: string;
  /** Index of the button clicked (0-based) */
  buttonIndex: number;
}

// 检测操作系统
function getOS(): 'windows' | 'macos' | 'linux' {
  const currentPlatform = process.platform;
  if (currentPlatform === 'win32') return 'windows';
  if (currentPlatform === 'darwin') return 'macos';
  return 'linux';
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
function buildPromptCommand(params: PromptParams): string {
  let script = 'display dialog';
  
  script += ` "${escapeString(params.message)}"`;
  
  if (params.defaultAnswer !== undefined) {
    script += ` default answer "${escapeString(params.defaultAnswer)}"`;
  }
  
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
  
  if (defaultAnswer !== undefined) {
    // 有输入框的对话框
    const script = `
      Add-Type -AssemblyName Microsoft.VisualBasic;
      $result = [Microsoft.VisualBasic.Interaction]::InputBox('${escapeString(message)}', 'Input', '${escapeString(defaultAnswer)}');
      if ($result -eq '') { 
        Write-Output 'button returned:Cancel, text returned:' 
      } else { 
        Write-Output "button returned:OK, text returned:$result" 
      }
    `;
    return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
  } else {
    // 纯按钮对话框
    const buttonsEnum = buttonList.length === 1 ? 'OK' : 
                       buttonList.length === 2 ? 'OKCancel' : 'YesNoCancel';
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $result = [System.Windows.Forms.MessageBox]::Show('${escapeString(message)}', 'Prompt', '${buttonsEnum}', '${iconType}');
      Write-Output "button returned:$result, text returned:"
    `;
    return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
  }
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
  
  if (defaultAnswer !== undefined) {
    let command = `zenity --entry --text="${escapeString(message)}"`;
    command += ` --entry-text="${escapeString(defaultAnswer)}"`;
    command += ` --title="Input"`;
    
    return `bash -c '
      result=$(${command} 2>/dev/null)
      if [ $? -eq 0 ]; then
        echo "button returned:OK, text returned:$result"
      else
        echo "button returned:Cancel, text returned:"
      fi
    '`;
  } else {
    // 纯按钮对话框
    const buttonList = buttons || ['Cancel', 'OK'];
    
    if (buttonList.length === 1) {
      return `bash -c '
        zenity ${iconFlag} --text="${escapeString(message)}" --ok-label="${escapeString(buttonList[0])}" --title="Prompt" 2>/dev/null
        echo "button returned:${escapeString(buttonList[0])}, text returned:"
      '`;
    } else if (buttonList.length === 2) {
      return `bash -c '
        if zenity --question --text="${escapeString(message)}" --ok-label="${escapeString(buttonList[1])}" --cancel-label="${escapeString(buttonList[0])}" --title="Prompt" 2>/dev/null; then
          echo "button returned:${escapeString(buttonList[1])}, text returned:"
        else
          echo "button returned:${escapeString(buttonList[0])}, text returned:"
        fi
      '`;
    } else {
      // 3个按钮，使用 zenity --list
      const optionsStr = buttonList.map(b => `"${escapeString(b)}"`).join(' ');
      return `bash -c '
        result=$(zenity --list --text="${escapeString(message)}" --column="Options" ${optionsStr} --title="Prompt" 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$result" ]; then
          echo "button returned:$result, text returned:"
        else
          echo "button returned:${escapeString(buttonList[0])}, text returned:"
        fi
      '`;
    }
  }
}

/**
 * Prompts the user for input using platform-appropriate dialogs
 */
export async function promptUser(params: PromptParams): Promise<PromptResult> {
  try {
    validatePromptParams(params);
    
    const os = getOS();
    let command: string;
    
    switch (os) {
      case 'macos':
        command = buildPromptCommand(params);
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
    const text = match[2] || undefined;
    
    // Find the index of the clicked button
    const buttons = params.buttons || ['Cancel', 'OK'];
    
    // 处理Windows特殊按钮返回值
    let normalizedButtonText = buttonText;
    if (os === 'windows') {
      const windowsButtonMap: Record<string, string> = {
        'OK': buttons.length === 1 ? buttons[0] : 'OK',
        'Cancel': 'Cancel',
        'Yes': buttons[0] || 'Yes',
        'No': buttons[1] || 'No'
      };
      normalizedButtonText = windowsButtonMap[buttonText] || buttonText;
    }
    
    const buttonIndex = buttons.findIndex(b => b === normalizedButtonText);
    
    return {
      text: text,
      buttonIndex: buttonIndex !== -1 ? buttonIndex : 0
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