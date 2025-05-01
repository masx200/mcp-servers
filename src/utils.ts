import { platform } from 'os';
import { homedir } from 'os';
import { join, parse } from 'path';
import { existsSync } from 'fs';
import { format } from 'date-fns';
import { DocType, FileExtensions, SoftwareInfo } from './types';

export const FILE_EXTENSIONS: FileExtensions = {
  word: { new: '.docx', old: '.doc' },
  excel: { new: '.xlsx', old: '.xls' },
  ppt: { new: '.pptx', old: '.ppt' }
};

export const SOFTWARE_INFO: { [key: string]: SoftwareInfo } = {
  office: {
    name: 'Microsoft Office',
    checkPaths: platform() === 'win32' ? [
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16'
    ] : ['/Applications/Microsoft Word.app'],
    executable: platform() === 'win32' ? 'WINWORD.EXE' : 'Microsoft Word.app'
  },
  wps: {
    name: 'WPS Office',
    checkPaths: platform() === 'win32' ? [
      'C:\\Program Files\\Kingsoft\\WPS Office',
      'C:\\Program Files (x86)\\Kingsoft\\WPS Office'
    ] : ['/Applications/WPS Office.app'],
    executable: platform() === 'win32' ? 'wps.exe' : 'WPS Office.app'
  }
};

export function getDesktopPath(): string {
  return join(homedir(), 'Desktop');
}

export function generateFileName(type: DocType): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmm');
  const typeMap = { word: 'Word', excel: 'Excel', ppt: 'PPT' };
  return `新建${typeMap[type]}文档_${timestamp}${FILE_EXTENSIONS[type].new}`;
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(/[/\\:*?"<>|]/g, '_');
}

export function checkSoftwareInstalled(software: string): boolean {
  const info = SOFTWARE_INFO[software];
  if (!info) return false;
  
  return info.checkPaths.some(path => existsSync(path));
}

export function getAvailableName(fullPath: string): string {
  const { dir, name, ext } = parse(fullPath);
  let index = 1;
  let newPath = fullPath;
  
  while (existsSync(newPath)) {
    newPath = join(dir, `${name}(${index})${ext}`);
    index++;
  }
  
  return newPath;
}

export function validatePath(path: string): boolean {
  try {
    return existsSync(path) || path === getDesktopPath();
  } catch {
    return false;
  }
} 