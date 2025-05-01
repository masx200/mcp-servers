import { join } from 'path';
import { ensureDirSync } from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CreateDocOptions } from './types';
import {
  getDesktopPath,
  generateFileName,
  sanitizeFileName,
  checkSoftwareInstalled,
  getAvailableName,
  validatePath,
  FILE_EXTENSIONS
} from './utils';

const execAsync = promisify(exec);

export class OfficeDocCreator {
  private async createEmptyFile(fullPath: string): Promise<void> {
    try {
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      ensureDirSync(dir);
      await execAsync(`type nul > "${fullPath}"`);
    } catch (error) {
      throw new Error(`Failed to create empty file: ${error}`);
    }
  }

  private async openFile(fullPath: string): Promise<void> {
    try {
      await execAsync(`start "" "${fullPath}"`);
    } catch (error) {
      console.warn(`Warning: Failed to open file: ${error}`);
    }
  }

  public async createDoc(options: CreateDocOptions): Promise<string> {
    const {
      type,
      software = 'auto',
      path = getDesktopPath(),
      filename,
      overwrite = false,
      openImmediately = true
    } = options;

    // 验证路径
    if (!validatePath(path)) {
      throw new Error('Invalid path or insufficient permissions');
    }

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
    if (!finalFilename.endsWith(FILE_EXTENSIONS[type].new) && 
        !finalFilename.endsWith(FILE_EXTENSIONS[type].old)) {
      finalFilename += FILE_EXTENSIONS[type].new;
    }

    // 构建完整路径
    let fullPath = join(path, finalFilename);

    // 处理文件名冲突
    if (!overwrite) {
      fullPath = getAvailableName(fullPath);
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
export const createOfficeDoc = (options: CreateDocOptions) => {
  return new OfficeDocCreator().createDoc(options);
}; 