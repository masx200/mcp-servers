import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface AppInfo {
  name: string;
  path: string;
  keywords: string[];
}

function generateKeywords(appName: string): string[] {
  const keywords = [appName];
  
  // 移除.exe后缀
  const nameWithoutExt = appName.replace(/\.exe$/, '');
  if (nameWithoutExt !== appName) {
    keywords.push(nameWithoutExt);
  }
  
  // 添加小写版本
  keywords.push(appName.toLowerCase());
  keywords.push(nameWithoutExt.toLowerCase());
  
  return [...new Set(keywords)];
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
        
        if (stats.isFile() && item.endsWith('.exe')) {
          const nameWithoutExt = item.replace(/\.exe$/, '');
          
          apps.push({
            name: nameWithoutExt,
            path: fullPath,
            keywords: generateKeywords(item)
          });
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
  
  // Windows常见程序目录
  const programDirectories = [
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs')
  ];
  
  for (const dir of programDirectories) {
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
