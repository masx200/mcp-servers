import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface AppInfo {
  name: string;
  path: string;
  keywords: string[];
}

// 拼音匹配的简单实现（可以后续扩展）
function generateKeywords(appName: string): string[] {
  const keywords = [appName];
  
  // 移除.app后缀
  const nameWithoutExt = appName.replace(/\.app$/, '');
  if (nameWithoutExt !== appName) {
    keywords.push(nameWithoutExt);
  }
  
  // 添加小写版本
  keywords.push(appName.toLowerCase());
  keywords.push(nameWithoutExt.toLowerCase());
  
  // 移除空格和特殊字符的版本
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
  if (cleanName !== nameWithoutExt) {
    keywords.push(cleanName);
    keywords.push(cleanName.toLowerCase());
  }
  
  return [...new Set(keywords)]; // 去重
}

async function scanDirectory(dirPath: string): Promise<AppInfo[]> {
  const apps: AppInfo[] = [];
  
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      try {
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && item.endsWith('.app')) {
          const appName = item;
          const nameWithoutExt = appName.replace(/\.app$/, '');
          
          apps.push({
            name: nameWithoutExt,
            path: fullPath,
            keywords: generateKeywords(appName)
          });
        }
      } catch (error) {
        // 忽略无法访问的文件/目录
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
  
  // 扫描主要的Applications目录
  const appDirectories = [
    '/Applications',
    '/System/Applications', // 系统应用（如果需要的话）
    path.join(process.env.HOME || '', 'Applications') // 用户应用
  ];
  
  for (const dir of appDirectories) {
    if (fs.existsSync(dir)) {
      const apps = await scanDirectory(dir);
      applications.push(...apps);
    }
  }
  
  // 根据name去重（保留第一个找到的）
  const uniqueApps = applications.reduce((acc: AppInfo[], current) => {
    const exists = acc.find(app => app.name === current.name);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);
  
  return uniqueApps.sort((a, b) => a.name.localeCompare(b.name));
};
