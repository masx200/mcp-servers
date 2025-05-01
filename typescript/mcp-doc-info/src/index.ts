import { join, sep, parse } from 'path';
import { ensureDirSync, existsSync } from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { DocType, CreateOfficeDocOptions, CreateDocResult } from './types';
import {
  getDesktopPath,
  generateFileName,
  sanitizeFileName,
  checkSoftwareInstalled,
  FILE_EXTENSIONS,
  createOfficeDoc as createOfficeDocUtil
} from './utils';

const execAsync = promisify(exec);

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

export { FILE_EXTENSIONS };
export { DocType, CreateOfficeDocOptions, CreateDocResult };

export async function createOfficeDocument(options: CreateOfficeDocOptions): Promise<CreateDocResult> {
  return createOfficeDocUtil(options);
} 