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

export interface ScreenshotParams {
  /** Path where to save the screenshot */
  path: string;
  /** Type of screenshot to take */
  type: 'fullscreen' | 'window' | 'selection';
  /** Image format (png, jpg, pdf, tiff) */
  format?: 'png' | 'jpg' | 'pdf' | 'tiff';
  /** Whether to hide the cursor */
  hideCursor?: boolean;
  /** Whether to include the window shadow (only for window type) */
  shadow?: boolean;
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

  if (params.shadow !== undefined && typeof params.shadow !== 'boolean') {
    throw new Error(
      'Shadow must be a boolean'
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
  
  if (params.type === 'window' && params.shadow === false) {
    command += ' -o'; // No window shadow
  }
  
  // Add timestamp to filename if requested
  let path = params.path;
  if (params.timestamp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = params.format || 'png';
    path = path.replace(new RegExp(`\\.${ext}$`), `-${timestamp}.${ext}`);
  }
  
  command += ` "${escapeString(path)}"`;
  
  return command;
}

/**
 * Builds the PowerShell screenshot command for Windows
 */
function buildWindowsScreenshotCommand(params: ScreenshotParams): string {
  const { path, type, format = 'png', timestamp } = params;
  
  // Add timestamp to filename if requested
  let finalPath = path;
  if (timestamp) {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = format;
    finalPath = path.replace(new RegExp(`\\.${ext}$`), `-${timestampStr}.${ext}`);
  }
  
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
    
    $bitmap.Save('${escapeString(finalPath)}', [System.Drawing.Imaging.ImageFormat]::${imageFormat});
    
    $graphics.Dispose();
    $bitmap.Dispose();
  `;
  
  return `powershell -Command "${script.replace(/\n\s+/g, ' ')}"`;
}

/**
 * Builds the screenshot command for Linux
 */
function buildLinuxScreenshotCommand(params: ScreenshotParams): string {
  const { path, type, format = 'png', timestamp, hideCursor } = params;
  
  // Add timestamp to filename if requested
  let finalPath = path;
  if (timestamp) {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = format;
    finalPath = path.replace(new RegExp(`\\.${ext}$`), `-${timestampStr}.${ext}`);
  }
  
  // 首选方案：gnome-screenshot (GNOME 桌面默认有)
  // 备选方案：scrot, import (ImageMagick), xwd
  
  const gnomeCommand = buildGnomeScreenshotCommand(params, finalPath);
  const scrotCommand = buildScrotCommand(params, finalPath);
  const importCommand = buildImageMagickCommand(params, finalPath);
  const xwdCommand = buildXwdCommand(params, finalPath);
  
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
export async function takeScreenshot(params: ScreenshotParams): Promise<void> {
  try {
    validateScreenshotParams(params);
    
    const os = getOS();
    let command: string;
    
    switch (os) {
      case 'macos':
        command = buildMacOSScreenshotCommand(params);
        break;
      case 'windows':
        command = buildWindowsScreenshotCommand(params);
        break;
      case 'linux':
        command = buildLinuxScreenshotCommand(params);
        break;
      default:
        throw new Error(
          `Unsupported platform: ${os}`
        );
    }
    
    await execAsync(command);
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