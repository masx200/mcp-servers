import { join, dirname, parse } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { format } from 'date-fns';
import { platform, homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DocType, SoftwareType, CreateOfficeDocOptions, CreateDocResult, FileExtensions, SoftwareInfo } from './types';

const execAsync = promisify(exec);

export const FILE_EXTENSIONS: FileExtensions = {
  word: { new: '.docx', old: '.doc' },
  excel: { new: '.xlsx', old: '.xls' },
  ppt: { new: '.pptx', old: '.ppt' }
};

export const SOFTWARE_INFO: Partial<Record<SoftwareType, SoftwareInfo>> = {
  office: {
    name: 'Microsoft Office',
    checkPaths: [
      'C:\\Program Files\\Microsoft Office\\Office16',
      'C:\\Program Files\\Microsoft Office\\Office15',
      'C:\\Program Files\\Microsoft Office\\Office14',
      'C:\\Program Files (x86)\\Microsoft Office\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\Office15',
      'C:\\Program Files (x86)\\Microsoft Office\\Office14',
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16',
      '/Applications/Microsoft Office 2016',
      '/Applications/Microsoft Office 2011'
    ],
    executable: 'WINWORD.EXE'
  },
  wps: {
    name: 'WPS Office',
    checkPaths: [
      'C:\\Program Files\\Kingsoft\\WPS Office',
      'C:\\Program Files (x86)\\Kingsoft\\WPS Office',
      'C:\\Program Files\\WPS Office',
      'C:\\Program Files (x86)\\WPS Office',
      'C:\\Program Files\\WPS',
      'C:\\Program Files (x86)\\WPS',
      'C:\\Program Files\\WPS Office 2019',
      'C:\\Program Files (x86)\\WPS Office 2019',
      'C:\\Program Files\\WPS Office 2016',
      'C:\\Program Files (x86)\\WPS Office 2016',
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office'),
      '/Applications/WPS Office.app'
    ],
    executable: 'wps.exe'
  }
};

export function getDesktopPath(): string {
  return join(homedir(), 'Desktop');
}

export function generateFileName(type: DocType): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  return `新建${type}文档_${timestamp}${FILE_EXTENSIONS[type].new}`;
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function openFile(path: string, software: SoftwareType): Promise<void> {
  const command = process.platform === 'win32' 
    ? `start "" "${path}"`
    : process.platform === 'darwin'
      ? `open "${path}"`
      : `xdg-open "${path}"`;

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function exists(path: string): Promise<boolean> {
  return existsSync(path);
}

export async function generateUniquePath(path: string, overwrite: boolean): Promise<string> {
  if (overwrite) {
    return path;
  }

  const { dir, name, ext } = parse(path);
  let counter = 1;
  let finalPath = path;

  while (await exists(finalPath)) {
    finalPath = join(dir, `${name}(${counter})${ext}`);
    counter++;
  }

  return finalPath;
}

export async function checkSoftwareInstalled(software: SoftwareType): Promise<SoftwareType | null> {
  console.log(`\n检测 ${software} 软件安装状态...`);
  
  if (software === 'auto') {
    console.log('自动检测模式：优先检测 Microsoft Office');
    const hasOffice = await checkSoftwareInstalled('office');
    if (hasOffice) {
      console.log('检测到 Microsoft Office 已安装');
      return 'office';
    }
    
    console.log('Microsoft Office 未安装，尝试检测 WPS Office');
    const hasWPS = await checkSoftwareInstalled('wps');
    if (hasWPS) {
      console.log('检测到 WPS Office 已安装');
      return 'wps';
    }
    
    console.log('未检测到任何办公软件安装');
    return null;
  }

  const info = SOFTWARE_INFO[software];
  if (!info) {
    console.log(`未知的软件类型: ${software}`);
    return null;
  }

  console.log(`检查 ${info.name} 安装路径...`);
  for (const path of info.checkPaths) {
    console.log(`检查路径: ${path}`);
    if (existsSync(path)) {
      console.log(`在 ${path} 找到 ${info.name}`);
      return software;
    }
  }

  // 如果主要路径未找到，尝试检查注册表（仅限 Windows）
  if (platform() === 'win32') {
    try {
      console.log('尝试通过注册表检测...');
      const { execSync } = require('child_process');
      const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths" /s').toString();
      
      if (software === 'office') {
        if (output.includes('WINWORD.EXE') || output.includes('EXCEL.EXE') || output.includes('POWERPNT.EXE')) {
          console.log('通过注册表检测到 Microsoft Office 已安装');
          return 'office';
        }
      } else if (software === 'wps') {
        if (output.includes('wps.exe') || output.includes('et.exe') || output.includes('wpp.exe')) {
          console.log('通过注册表检测到 WPS Office 已安装');
          return 'wps';
        }
      }
    } catch (error) {
      console.warn('注册表查询失败:', error);
    }
  }

  console.log(`未检测到 ${info.name} 安装`);
  return null;
}

export async function createOfficeDoc(options: CreateOfficeDocOptions): Promise<CreateDocResult> {
  const result: CreateDocResult = {
    success: false,
    warnings: []
  };

  try {
    // 参数验证和默认值设置
    const {
      type = 'word',  // 默认创建 Word 文档
      software = 'auto',  // 默认自动检测
      path = getDesktopPath(),  // 默认保存到桌面
      filename,  // 可选，不指定则自动生成
      overwrite = false,  // 默认不覆盖
      openImmediately = true  // 默认自动打开
    } = options;

    // 验证文档类型
    if (!['word', 'excel', 'ppt'].includes(type)) {
      result.error = `无效的文档类型: ${type}，必须是 word、excel 或 ppt`;
      return result;
    }

    // 验证软件类型
    if (!['auto', 'office', 'wps'].includes(software)) {
      result.error = `无效的软件类型: ${software}，必须是 auto、office 或 wps`;
      return result;
    }

    // 检查软件是否安装
    const installedSoftware = await checkSoftwareInstalled(software);
    if (!installedSoftware) {
      result.error = 'Neither Microsoft Office nor WPS Office is installed';
      return result;
    }

    // 确保目录存在
    try {
      await ensureDir(path);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `无法创建目录: ${errorMessage}`;
      return result;
    }

    // 生成文件名
    let finalFilename: string;
    if (filename) {
      // 如果提供了文件名，确保它有正确的扩展名
      finalFilename = sanitizeFileName(filename);
      const extensions = FILE_EXTENSIONS[type];
      if (!finalFilename.endsWith(extensions.new) && !finalFilename.endsWith(extensions.old)) {
        finalFilename += extensions.new;
      }
    } else {
      // 自动生成文件名
      finalFilename = generateFileName(type);
    }

    // 生成最终的文件路径
    const finalPath = await generateUniquePath(join(path, finalFilename), overwrite);

    // 创建空文件
    try {
      await writeFile(finalPath, '');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `无法创建文件: ${errorMessage}`;
      return result;
    }

    // 如果设置了自动打开，则打开文件
    if (openImmediately && installedSoftware !== 'auto') {
      try {
        await openFile(finalPath, installedSoftware);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.warnings?.push(`自动打开文件失败: ${errorMessage}`);
      }
    }

    result.success = true;
    result.path = finalPath;
    return result;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.error = `创建文档失败: ${errorMessage}`;
    return result;
  }
} 