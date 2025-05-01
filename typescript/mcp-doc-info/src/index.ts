#!/usr/bin/env node

import { join, dirname, parse, sep } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { format } from 'date-fns';
import { platform, homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureDirSync } from 'fs-extra';

// ================== types.ts ==================
export type DocType = 'word' | 'excel' | 'ppt';
export type SoftwareType = 'auto' | 'office' | 'wps';

export interface FileExtension {
  new: string;
  old: string;
}

export interface FileExtensions {
  word: FileExtension;
  excel: FileExtension;
  ppt: FileExtension;
}

export interface SoftwareInfo {
  name: string;
  checkPaths: string[];
  executable: string;
}

export interface CreateOfficeDocOptions {
  /** 文档类型 */
  type: DocType;
  /** 使用的软件 */
  software?: SoftwareType;
  /** 保存路径 */
  path?: string;
  /** 文件名 */
  filename?: string;
  /** 是否覆盖已存在文件 */
  overwrite?: boolean;
  /** 是否立即打开 */
  openImmediately?: boolean;
}

export interface CreateDocResult {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  path?: string;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
}

// ================== file-utils.ts ==================
const execAsync = promisify(exec);

export async function ensureDir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  await fsWriteFile(path, content);
}

export async function exists(path: string): Promise<boolean> {
  return existsSync(path);
}

export async function openFile(path: string, software: SoftwareType): Promise<void> {
  // 根据平台和软件类型构建命令
  let command = '';
  
  if (platform() === 'win32') {
    // Windows平台
    if (software === 'wps') {
      // 尝试定位WPS可执行文件
      const possibleWpsPaths = [
        'C:\\Program Files\\Kingsoft\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files (x86)\\Kingsoft\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files (x86)\\WPS Office\\office6\\wps.exe',
        // 从AppData目录查找
        join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'ksolaunch.exe'),
        join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'office6', 'wps.exe')
      ];
      
      let wpsBinary = '';
      for (const possiblePath of possibleWpsPaths) {
        if (existsSync(possiblePath)) {
          wpsBinary = possiblePath;
          console.log(`找到WPS可执行文件: ${wpsBinary}`);
          break;
        }
      }
      
      if (wpsBinary) {
        // 使用确切的WPS可执行文件路径和start命令（避免命令行窗口）
        command = `start "" "${wpsBinary}" "${path}"`;
      } else {
        // 备用方法尝试使用文件关联
        command = `start "" "${path}"`;
      }
    } else if (software === 'office') {
      // 尝试使用MS Office打开
      // 先检查WINWORD.EXE是否存在
      const possibleOfficePaths = [
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
        'C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\Office16\\WINWORD.EXE'
      ];
      
      let officeBinary = '';
      for (const possiblePath of possibleOfficePaths) {
        if (existsSync(possiblePath)) {
          officeBinary = possiblePath;
          console.log(`找到Office可执行文件: ${officeBinary}`);
          break;
        }
      }
      
      if (officeBinary) {
        // 使用确切的Office可执行文件路径和start命令
        command = `start "" "${officeBinary}" "${path}"`;
      } else {
        // 备用方法使用文件关联
        command = `start "" "${path}"`;
      }
    } else {
      // 默认使用系统关联程序打开
      command = `start "" "${path}"`;
    }
  } else if (platform() === 'darwin') {
    // macOS平台
    if (software === 'wps') {
      // 尝试使用WPS打开
      command = `open -a "WPS Office" "${path}" || open "${path}"`;
    } else if (software === 'office') {
      // 尝试使用MS Office打开
      command = `open -a "Microsoft Word" "${path}" || open "${path}"`;
    } else {
      // 默认使用系统关联程序打开
      command = `open "${path}"`;
    }
  } else {
    // Linux平台
    if (software === 'wps') {
      // 尝试使用WPS打开
      command = `wps "${path}" 2>/dev/null || xdg-open "${path}"`;
    } else if (software === 'office') {
      // 尝试使用MS Office打开(可能通过Wine或原生Linux版本)
      command = `libreoffice "${path}" 2>/dev/null || xdg-open "${path}"`;
    } else {
      // 默认使用系统关联程序打开
      command = `xdg-open "${path}"`;
    }
  }
  
  console.log(`执行打开文件命令: ${command}`);

  try {
    await execAsync(command);
  } catch (error) {
    console.warn(`警告: 打开文件失败，尝试使用系统默认程序打开`);
    
    // 如果指定的程序打开失败，尝试使用默认程序
    try {
      const defaultCommand = platform() === 'win32' 
        ? `start "" "${path}"`
        : platform() === 'darwin'
          ? `open "${path}"`
          : `xdg-open "${path}"`;
          
      await execAsync(defaultCommand);
    } catch (fallbackError) {
      throw new Error(`无法打开文件: ${error instanceof Error ? error.message : String(error)}\n备用命令也失败: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }
}

// ================== utils.ts ==================
export const FILE_EXTENSIONS: FileExtensions = {
  word: { new: '.docx', old: '.doc' },
  excel: { new: '.xlsx', old: '.xls' },
  ppt: { new: '.pptx', old: '.ppt' }
};

export const SOFTWARE_INFO: Partial<Record<SoftwareType, SoftwareInfo>> = {
  office: {
    name: 'Microsoft Office',
    checkPaths: [
      // Windows 路径
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files\\Microsoft Office\\Office15',
      'C:\\Program Files\\Microsoft Office\\Office14',
      'C:\\Program Files (x86)\\Microsoft Office\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\Office15',
      'C:\\Program Files (x86)\\Microsoft Office\\Office14',
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16',
      // macOS 路径
      '/Applications/Microsoft Office 2016',
      '/Applications/Microsoft Office 2019',
      '/Applications/Microsoft Office 2021',
      '/Applications/Microsoft Word.app',
      '/Applications/Microsoft Excel.app',
      '/Applications/Microsoft PowerPoint.app',
      // Linux 路径 (可能通过Wine安装)
      '/usr/bin/libreoffice',
      '/usr/bin/openoffice',
      '/opt/libreoffice'
    ],
    executable: 'WINWORD.EXE'
  },
  wps: {
    name: 'WPS Office',
    checkPaths: [
      // Windows 路径
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
      // macOS 路径
      '/Applications/WPS Office.app',
      '/Applications/wpsoffice.app',
      // Linux 路径
      '/usr/bin/wps',
      '/usr/bin/wpp',
      '/usr/bin/et',
      '/opt/kingsoft/wps-office',
      '/opt/wps-office',
      '/usr/share/applications/wps-office'
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

  // Windows 平台上的特殊处理
  if (platform() === 'win32' && software === 'wps') {
    // 在Windows上检查WPS常见的可执行文件路径
    const wpsPaths = [
      'C:\\Program Files\\Kingsoft\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files (x86)\\Kingsoft\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files (x86)\\WPS Office\\office6\\wps.exe',
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'ksolaunch.exe'),
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'office6', 'wps.exe')
    ];
    
    for (const path of wpsPaths) {
      console.log(`检查WPS可执行文件: ${path}`);
      if (existsSync(path)) {
        console.log(`找到WPS可执行文件: ${path}`);
        return 'wps';
      }
    }
  }

  // 首先检查预定义路径
  console.log(`检查 ${info.name} 安装路径...`);
  for (const path of info.checkPaths) {
    console.log(`检查路径: ${path}`);
    if (existsSync(path)) {
      console.log(`在 ${path} 找到 ${info.name}`);
      
      // Windows 平台上进一步验证 WPS 实际可执行文件
      if (platform() === 'win32' && software === 'wps') {
        // 检查 WPS 可执行文件
        const exePath = join(path, 'office6', 'wps.exe');
        if (existsSync(exePath)) {
          console.log(`找到 WPS 可执行文件: ${exePath}`);
          return software;
        }
        
        // 如果找不到wps.exe，继续检查其他路径
        console.log(`在 ${path} 下未找到 wps.exe 可执行文件，继续检查其他路径`);
        continue;
      }
      
      return software;
    }
  }

  // 尝试使用系统命令查找安装路径
  if (platform() !== 'win32') {
    try {
      console.log('尝试使用系统命令查找安装路径...');
      
      // 导入子进程模块
      const { execSync } = require('child_process');
      
      // 根据软件类型和平台设置搜索命令
      let command = '';
      let searchPattern = '';
      
      if (software === 'wps') {
        // WPS 搜索模式
        searchPattern = 'wps';
        
        if (platform() === 'darwin') {
          // macOS: 查找.app包
          command = 'mdfind -name "WPS Office.app" 2>/dev/null || find /Applications -name "WPS*.app" 2>/dev/null || ls -d /Applications/WPS* 2>/dev/null';
        } else {
          // Linux: 查找可执行文件
          command = 'which wps 2>/dev/null || which et 2>/dev/null || which wpp 2>/dev/null || find /usr -name "wps" -type f -executable 2>/dev/null || find /opt -name "wps" -type f -executable 2>/dev/null';
        }
      } else if (software === 'office') {
        // Microsoft Office 搜索模式
        searchPattern = platform() === 'darwin' ? 'Microsoft Word.app' : 'WINWORD';
        
        if (platform() === 'darwin') {
          // macOS: 查找.app包
          command = 'mdfind -name "Microsoft Word.app" 2>/dev/null || find /Applications -name "Microsoft*.app" 2>/dev/null || ls -d /Applications/Microsoft* 2>/dev/null';
        } else {
          // Linux: 查找可执行文件(wine可能安装了Office)
          command = 'which winword 2>/dev/null || find /usr -name "winword" -type f -executable 2>/dev/null || find ~/.wine -name "WINWORD.EXE" 2>/dev/null';
        }
      }
      
      if (command) {
        console.log(`执行命令: ${command}`);
        const output = execSync(command, { encoding: 'utf8', shell: platform() === 'darwin' ? '/bin/zsh' : '/bin/bash' });
        
        if (output && output.trim()) {
          const paths = output.trim().split('\n');
          console.log(`找到可能的安装路径: ${paths.join(', ')}`);
          
          for (const path of paths) {
            if (path && path.toLowerCase().includes(searchPattern.toLowerCase())) {
              console.log(`通过系统命令找到 ${info.name} 安装路径: ${path}`);
              return software;
            }
          }
        }
      }
    } catch (error) {
      console.warn('执行系统命令查找路径失败:', error);
    }
  }

  // 在Windows上使用注册表检查
  if (platform() === 'win32') {
    try {
      console.log('尝试通过注册表检测...');
      // 使用require以便在浏览器环境中不会导致错误
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

export async function createOfficeDocUtil(options: CreateOfficeDocOptions): Promise<CreateDocResult> {
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
        result.warnings!.push(`警告：无法自动打开文件: ${errorMessage}`);
      }
    }

    // 设置成功结果
    result.success = true;
    result.path = finalPath;
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.error = `创建文档失败: ${errorMessage}`;
    return result;
  }
}

// ================== index.ts ==================
export class OfficeDocCreator {
  private async createEmptyFile(fullPath: string): Promise<void> {
    try {
      const dir = fullPath.substring(0, fullPath.lastIndexOf(sep));
      ensureDirSync(dir);
      
      if (platform() === 'win32') {
        await execAsync(`type nul > "${fullPath}"`);
      } else {
        await execAsync(`touch "${fullPath}"`);
      }
    } catch (error) {
      throw new Error(`Failed to create empty file: ${error}`);
    }
  }

  private async openFile(fullPath: string): Promise<void> {
    try {
      if (platform() === 'win32') {
        await execAsync(`start "" "${fullPath}"`);
      } else if (platform() === 'darwin') {
        await execAsync(`open "${fullPath}"`);
      } else {
        await execAsync(`xdg-open "${fullPath}"`);
      }
    } catch (error) {
      console.warn(`Warning: Failed to open file: ${error}`);
    }
  }

  public async createDoc(options: CreateOfficeDocOptions): Promise<string> {
    const {
      type,
      software = 'auto',
      path = getDesktopPath(),
      filename,
      overwrite = false,
      openImmediately = true
    } = options;

    // 检查软件安装
    if (software !== 'auto') {
      if (!checkSoftwareInstalled(software)) {
        throw new Error(`${software.toUpperCase()} is not installed`);
      }
    } else {
      const hasOffice = checkSoftwareInstalled('office');
      const hasWPS = checkSoftwareInstalled('wps');
      
      if (!hasOffice && !hasWPS) {
        throw new Error('Neither Microsoft Office nor WPS Office is installed');
      }
    }

    // 处理文件名
    let finalFilename = filename || generateFileName(type);
    finalFilename = sanitizeFileName(finalFilename);

    // 确保文件扩展名正确
    const extensions = FILE_EXTENSIONS[type];
    if (!finalFilename.endsWith(extensions.new) && 
        !finalFilename.endsWith(extensions.old)) {
      finalFilename += extensions.new;
    }

    // 构建完整路径
    let fullPath = join(path, finalFilename);

    // 处理文件名冲突
    if (!overwrite) {
      let counter = 1;
      let basePath = fullPath;
      const { dir, name, ext } = parse(fullPath);
      
      while (existsSync(fullPath)) {
        fullPath = join(dir, `${name}(${counter})${ext}`);
        counter++;
      }
    }

    // 创建空文件
    await this.createEmptyFile(fullPath);

    // 打开文件
    if (openImmediately) {
      await this.openFile(fullPath);
    }

    return fullPath;
  }
}

// 导出默认实例
export default new OfficeDocCreator();

// 导出便捷方法
export const createOfficeDoc = (options: CreateOfficeDocOptions) => {
  return new OfficeDocCreator().createDoc(options);
};

export async function createOfficeDocument(options: CreateOfficeDocOptions): Promise<CreateDocResult> {
  return createOfficeDocUtil(options);
}

// ================== example.ts ==================
async function example() {
  try {
    console.log('===================== 运行示例 =====================');
    console.log('\n创建年度报告Word文档...');
    
    // 创建工作汇报目录
    const workReportDir = join(homedir(), '工作汇报');
    await ensureDir(workReportDir);
    
    // 在工作汇报目录中创建年度报告.doc文件并通过WPS打开
    const wordPath = await createOfficeDoc({
      type: 'word',
      filename: '年度报告.doc',  // 使用.doc扩展名
      path: workReportDir,       // 放在~/工作汇报目录下
      software: 'wps',           // 使用WPS打开
      openImmediately: true,     // 自动打开
      overwrite: false           // 非覆盖模式，如果文件存在则自动重命名为年度报告(1).doc
    });
    
    console.log('文档已创建:', wordPath);
  } catch (error) {
    console.error('创建文档失败:', error);
  }
}

// ================== cli.ts ==================
async function cli(args: string[]) {
  try {
    console.log('开始创建文档...');
    console.log('当前操作系统:', platform());
    
    // 解析命令行参数
    const options: CreateOfficeDocOptions = parseCommandLineArgs(args);
    console.log('使用以下配置创建文档:');
    console.log('- 文档类型:', options.type);
    console.log('- 使用软件:', options.software || 'auto');
    console.log('- 保存路径:', options.path || getDesktopPath());
    console.log('- 文件名:', options.filename || '(自动生成)');
    console.log('- 覆盖已存在文件:', options.overwrite === true ? '是' : '否');
    console.log('- 立即打开文件:', options.openImmediately === false ? '否' : '是');
    
    // 确保目录存在
    if (options.path) {
      await ensureDir(options.path);
    }
    
    // 创建文档
    console.log('\n开始创建文档...');
    
    const result = await createOfficeDocUtil(options);
    
    if (result.success) {
      console.log('\n文档已成功创建:', result.path);
      if (result.warnings?.length) {
        console.warn('警告:', result.warnings.join('\n'));
      }
    } else {
      console.error('\n创建文档失败:', result.error);
      process.exit(1);
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('程序执行失败:', error.message);
      console.error('错误详情:', error.stack);
    } else {
      console.error('程序执行失败:', error);
    }
    process.exit(1);
  }
}

// 解析命令行参数
function parseCommandLineArgs(args: string[]): CreateOfficeDocOptions {
  const options: CreateOfficeDocOptions = {
    type: 'word' // 默认值
  };
  
  // 移除第一个和第二个参数（node和脚本路径）
  args = args.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--type':
      case '-t':
        const type = args[++i]?.toLowerCase();
        if (type === 'word' || type === 'excel' || type === 'ppt') {
          options.type = type as DocType;
        } else {
          throw new Error(`无效的文档类型: ${type}，必须是 word、excel 或 ppt`);
        }
        break;
        
      case '--software':
      case '-s':
        const software = args[++i]?.toLowerCase();
        if (software === 'auto' || software === 'office' || software === 'wps') {
          options.software = software as SoftwareType;
        } else {
          throw new Error(`无效的软件类型: ${software}，必须是 auto、office 或 wps`);
        }
        break;
        
      case '--path':
      case '-p':
        options.path = args[++i];
        break;
        
      case '--filename':
      case '-f':
        options.filename = args[++i];
        break;
        
      case '--overwrite':
      case '-o':
        const overwrite = args[++i]?.toLowerCase();
        if (overwrite === 'true' || overwrite === '1' || overwrite === 'yes') {
          options.overwrite = true;
        } else if (overwrite === 'false' || overwrite === '0' || overwrite === 'no') {
          options.overwrite = false;
        } else {
          throw new Error(`无效的覆盖选项: ${overwrite}，必须是 true/1/yes 或 false/0/no`);
        }
        break;
        
      case '--open':
        const open = args[++i]?.toLowerCase();
        if (open === 'true' || open === '1' || open === 'yes') {
          options.openImmediately = true;
        } else if (open === 'false' || open === '0' || open === 'no') {
          options.openImmediately = false;
        } else {
          throw new Error(`无效的打开选项: ${open}，必须是 true/1/yes 或 false/0/no`);
        }
        break;
        
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      default:
        throw new Error(`未知的参数: ${arg}`);
    }
  }
  
  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法: npm start -- [选项]

选项:
  --type, -t      文档类型 (word/excel/ppt，默认: word)
  --software, -s  使用软件 (auto/office/wps，默认: auto)
  --path, -p      保存路径 (不指定则保存到系统桌面)
  --filename, -f  文件名 (不指定则按规则自动生成)
  --overwrite, -o 是否覆盖已存在文件 (true/false，默认: false)
  --open          是否立即打开 (true/false，默认: true)
  --help, -h      显示此帮助信息

示例:
  npm start -- --type word --software wps --path ~/Documents --filename 报告.doc
  npm start -- -t excel -s office -f 财务数据.xlsx --overwrite true
  `);
}

// 当直接运行此文件时，执行CLI
if (require.main === module) {
  console.log('正在处理命令行参数...');
  cli(process.argv).catch(error => {
    console.error('执行CLI时出错:', error);
    process.exit(1);
  });
}