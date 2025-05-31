import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface AppInfo {
  name: string;
  path: string;
  keywords: string[];
}

function generateKeywords(appName: string): string[] {
  const keywords = [appName];
  
  // 添加小写版本
  keywords.push(appName.toLowerCase());
  
  // 移除空格和特殊字符的版本
  const cleanName = appName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
  if (cleanName !== appName) {
    keywords.push(cleanName);
    keywords.push(cleanName.toLowerCase());
  }
  
  return [...new Set(keywords)];
}

async function parseDesktopFile(filePath: string): Promise<AppInfo | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let name = '';
    let exec = '';
    let hidden = false;
    let noDisplay = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Name=')) {
        name = trimmedLine.substring(5);
      } else if (trimmedLine.startsWith('Exec=')) {
        exec = trimmedLine.substring(5);
      } else if (trimmedLine.startsWith('Hidden=true')) {
        hidden = true;
      } else if (trimmedLine.startsWith('NoDisplay=true')) {
        noDisplay = true;
      }
    }
    
    if (!name || !exec || hidden || noDisplay) {
      return null;
    }
    
    // 清理exec路径
    exec = exec.replace(/%[uUfF]/g, '').trim();
    
    return {
      name,
      path: exec,
      keywords: generateKeywords(name)
    };
  } catch (error) {
    return null;
  }
}

async function scanDirectory(dirPath: string): Promise<AppInfo[]> {
  const apps: AppInfo[] = [];
  
  try {
    if (!fs.existsSync(dirPath)) return apps;
    
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      try {
        const stats = await stat(fullPath);
        
        if (stats.isFile() && item.endsWith('.desktop')) {
          const app = await parseDesktopFile(fullPath);
          if (app) {
            apps.push(app);
          }
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.error(`无法扫描目录 ${dirPath}:`, error);
  }
  
  return apps;
}

export default async (): Promise<AppInfo[]> => {
  const applications: AppInfo[] = [];
  
  // Linux标准应用目录
  const appDirectories = [
    '/usr/share/applications',
    '/usr/local/share/applications',
    path.join(os.homedir(), '.local/share/applications')
  ];
  
  for (const dir of appDirectories) {
    if (fs.existsSync(dir)) {
      const apps = await scanDirectory(dir);
      applications.push(...apps);
    }
  }
  
  // 去重并排序
  const uniqueApps = applications.reduce((acc: AppInfo[], current) => {
    const exists = acc.find(app => app.name === current.name);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);
  
  return uniqueApps.sort((a, b) => a.name.localeCompare(b.name));
};
