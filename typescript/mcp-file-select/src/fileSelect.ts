import { platform } from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

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

export interface FileSelectParams {
  /** Optional prompt message */
  prompt?: string;
  /** Optional default location */
  defaultLocation?: string;
  /** Optional file type filter (e.g., {"public.image": ["png", "jpg"]}) */
  fileTypes?: Record<string, string[]>;
  /** Whether to allow multiple selection */
  multiple?: boolean;
}

export interface FileSelectResult {
  /** Selected file paths */
  paths: string[];
}

/**
 * Validates file selection parameters
 */
function validateFileSelectParams(params: FileSelectParams): void {
  if (params.prompt && typeof params.prompt !== 'string') {
    throw new Error(
      'Prompt must be a string'
    );
  }

  if (params.defaultLocation && typeof params.defaultLocation !== 'string') {
    throw new Error(
      'Default location must be a string'
    );
  }

  if (params.multiple !== undefined && typeof params.multiple !== 'boolean') {
    throw new Error(
      'Multiple selection flag must be a boolean'
    );
  }

  if (params.fileTypes) {
    if (typeof params.fileTypes !== 'object' || params.fileTypes === null) {
      throw new Error(
        'File types must be an object'
      );
    }

    for (const [_, extensions] of Object.entries(params.fileTypes)) {
      if (!Array.isArray(extensions) || !extensions.every(ext => typeof ext === 'string')) {
        throw new Error(
          'File type extensions must be an array of strings'
        );
      }
    }
  }
}

function buildMacOSCommand(params: FileSelectParams): string {
  let script = 'choose file';
  if (params.multiple) script += ' with multiple selections allowed';
  if (params.prompt) script += ` with prompt "${escapeString(params.prompt)}"`;
  if (params.defaultLocation) script += ` default location "${escapeString(params.defaultLocation)}"`;
  if (params.fileTypes) {
    const extensions = Object.values(params.fileTypes).flat();
    if (extensions.length > 0) {
      script += ` of type {${extensions.map(ext => `"${ext}"`).join(', ')}}`;
    }
  }
  
  // 处理多选和单选的路径转换
  if (params.multiple) {
    script = `set fileList to ${script}
set posixPaths to {}
repeat with aFile in fileList
  set end of posixPaths to POSIX path of aFile
end repeat
return (posixPaths as list) as string`;
  } else {
    script = `POSIX path of (${script})`;
  }
  
  return `osascript -e '${script}'`;
}

function buildWindowsCommand(params: FileSelectParams): string {
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    ${params.prompt ? `$dialog.Title = "${escapeString(params.prompt)}"` : ''}
    ${params.multiple ? '$dialog.Multiselect = $true' : ''}
    ${params.defaultLocation ? `$dialog.InitialDirectory = "${escapeString(params.defaultLocation)}"` : ''}
    $dialog.ShowDialog() | Out-Null
    $dialog.FileNames -join ","
  `;
  return `powershell -Command "${psScript.replace(/\n\s+/g, ' ')}"`;
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

// 修改 Linux 命令构建逻辑
async function buildLinuxCommand(params: FileSelectParams): Promise<string> {
  await ensureZenityInstalled(); // 确保 zenity 存在
  let cmd = 'zenity --file-selection';
  if (params.multiple) cmd += ' --multiple --separator=","';
  if (params.prompt) cmd += ` --title="${escapeString(params.prompt)}"`;
  if (params.defaultLocation) cmd += ` --filename="${escapeString(params.defaultLocation)}"`;
  return cmd;
}

/**
 * Prompts user to select file(s) using native macOS file picker
 */
export async function selectFile(params: FileSelectParams): Promise<FileSelectResult> {
  validateFileSelectParams(params);

  let command: string;
  const os = platform();

  switch (os) {
    case 'darwin':
      command = buildMacOSCommand(params);
      break;
    case 'win32':
      command = buildWindowsCommand(params);
      break;
    case 'linux':
      command = await buildLinuxCommand(params); // 注意改为异步
      break;
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }

  try {
    const { stdout } = await execAsync(command);
    const paths = stdout
      .trim()
      .split(',')
      .map(path => path.trim())
      .filter(path => path.length > 0);

    return { paths };
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('cancel') || err.message.includes('closed')) {
      throw new Error('File selection was cancelled');
    }
    throw new Error(`Failed to select file: ${err.message}`);
  }
} 