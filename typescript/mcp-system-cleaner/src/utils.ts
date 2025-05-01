import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Config, FileInfo } from './types';

export const DEFAULT_CONFIG: Config = {
  version: "1.2.0",
  scanPaths: {
    windows: [
      { path: "%TEMP%", enabled: true, recursive: true },
      { path: "%LOCALAPPDATA%\\Temp", enabled: true, recursive: true },
      { path: "C:\\Windows\\Temp", enabled: true, recursive: false },
      { path: "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\INetCache", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\History", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\CrashDumps", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\WER", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache", enabled: true, recursive: true },
      { path: "%USERPROFILE%\\AppData\\Local\\Mozilla\\Firefox\\Profiles", enabled: true, recursive: true },
      { path: "%SYSTEMROOT%\\SoftwareDistribution\\Download", enabled: true, recursive: true },
      { path: "%SYSTEMROOT%\\Prefetch", enabled: true, recursive: false }
    ],
    macos: [
      { path: "~/Library/Caches", enabled: true, recursive: true },
      { path: "/private/var/tmp", enabled: true, recursive: true },
      { path: "~/Library/Logs", enabled: true, recursive: true },
      { path: "~/Downloads", enabled: true, recursive: true },
      { path: "~/Library/Application Support/CrashReporter", enabled: true, recursive: true },
      { path: "~/Library/Containers/*/Data/Library/Caches", enabled: true, recursive: true },
      { path: "~/Library/Application Support/*/Cache", enabled: true, recursive: true },
      { path: "~/Library/Caches/*", enabled: true, recursive: true },
      { path: "~/Library/Logs/*", enabled: true, recursive: true },
      { path: "/private/var/folders/*/T", enabled: true, recursive: true },
      { path: "/private/var/folders/*/C", enabled: true, recursive: true },
      { path: "~/Library/Safari/Downloads", enabled: true, recursive: false },
      { path: "~/Library/Application Support/Google/Chrome/Default/Cache", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Firefox/Profiles", enabled: true, recursive: true },
      { path: "~/Library/Developer/Xcode/DerivedData", enabled: true, recursive: true },
      { path: "~/Library/Developer/Xcode/Archives", enabled: true, recursive: true },
      { path: "/private/var/log", enabled: true, recursive: true },
      { path: "~/Library/iTunes/iPhone Software Updates", enabled: true, recursive: false },
      { path: "~/Library/Cookies", enabled: true, recursive: false },
      { path: "~/Library/Application Support/Adobe/Common/Media Cache Files", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Google/Chrome/Default/Storage/ext", enabled: true, recursive: true },
      { path: "~/Library/Containers/com.apple.mail/Data/Library/Caches", enabled: true, recursive: true },
      { path: "~/Library/Containers/com.apple.Safari/Data/Library/Caches", enabled: true, recursive: true },
      { path: "~/Library/Containers/com.apple.Preview/Data/Library/Caches", enabled: true, recursive: true },
      { path: "~/Library/Developer/CoreSimulator", enabled: true, recursive: true },
      { path: "~/Library/Developer/Xcode/iOS DeviceSupport", enabled: true, recursive: true },
      { path: "~/Library/Developer/Xcode/watchOS DeviceSupport", enabled: true, recursive: true },
      { path: "~/Library/Application Support/MobileSync/Backup", enabled: true, recursive: true },
      { path: "~/Library/Caches/com.apple.dt.Xcode", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Code/Cache", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Code/CachedData", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Code/CachedExtensions", enabled: true, recursive: true },
      { path: "~/Library/Application Support/Code/User/workspaceStorage", enabled: true, recursive: true },
      { path: "~/.gradle/caches", enabled: true, recursive: true },
      { path: "~/.m2/repository", enabled: true, recursive: true },
      { path: "~/Library/Containers/com.docker.docker/Data/vms", enabled: true, recursive: true },
      { path: "~/Library/Application Support/JetBrains/*/caches", enabled: true, recursive: true },
      { path: "~/Library/Application Support/JetBrains/*/local-history", enabled: true, recursive: true }
    ],
    linux: [
      { path: "/tmp", enabled: true, recursive: true },
      { path: "~/.cache", enabled: true, recursive: true },
      { path: "/var/cache", enabled: true, recursive: true },
      { path: "/var/log", enabled: true, recursive: true },
      { path: "/var/tmp", enabled: true, recursive: true },
      { path: "~/.local/share/Trash", enabled: true, recursive: true },
      { path: "~/.mozilla/firefox", enabled: true, recursive: true },
      { path: "~/.config/google-chrome/Default/Cache", enabled: true, recursive: true },
      { path: "~/.config/chromium/Default/Cache", enabled: true, recursive: true },
      { path: "~/.thumbnails", enabled: true, recursive: true },
      { path: "~/.local/share/Trash", enabled: true, recursive: true },
      { path: "~/.npm", enabled: true, recursive: true },
      { path: "~/.yarn/cache", enabled: true, recursive: true }
    ]
  },
  fileRules: {
    extensions: [
      ".tmp", ".log", ".cache", ".bak", ".old", ".dmp", ".swp", ".dump", ".chk", 
      ".temp", ".crdownload", ".part", ".download", ".logtxt", ".log.1", ".log.old",
      ".DS_Store", ".localized", ".cache-*", "*.log.*", ".temp-*", ".crash",
      ".exe", ".dmg", ".zip", ".rar", ".pkg", ".iso", ".gz", ".tar",
      ".lock", ".pid", ".sock", ".db", ".sqlite", ".sqlite-journal",
      ".log.gz", ".log.zip", ".log.old.*", ".cache.old.*",
      ".tmp.*", ".temp.*", ".bak.*", ".old.*", ".obsolete",
      ".build", ".sass-cache", ".pytest_cache", ".mypy_cache",
      ".npm-debug.log", ".yarn-debug.log", ".yarn-error.log",
      ".idea", ".vscode", ".project", ".settings", ".classpath",
      ".DS_Store", "._*", "Thumbs.db", ".Spotlight-V100",
      ".Trashes", ".fseventsd", "*.swp", "*.swo"
    ],
    namePatterns: [
      "^temp_", "^cache_", "\\.bak$", "~$", "\\.old$", "^log\\d*\\.",
      "^\\.#", "^#.*#$", "^core\\.", "^tmp\\.", ".*\\.temp$", ".*\\.tmp$",
      ".*\\.cache$", ".*\\.log$", ".*\\.bak$", ".*\\.old$", ".*\\.swp$",
      "^\\._", "^\\.DS_Store$", "^Thumbs\\.db$",
      ".*\\.log\\.[0-9]+$", ".*\\.log\\.[0-9]+\\.gz$",
      ".*\\.cache\\.[0-9]+$", ".*\\.bak\\.[0-9]+$",
      "^npm-debug\\.log.*$", "^yarn-debug\\.log.*$",
      "^yarn-error\\.log.*$", "^\\.npm-debug\\.log.*$",
      "^\\.[^.]+\\.swp$", "^\\.[^.]+\\.swo$",
      ".*\\.pyc$", ".*\\.pyo$", ".*\\.pyd$",
      ".*\\.class$", ".*\\.o$", ".*\\.obj$",
      ".*\\.build$", ".*\\.dist$", ".*\\.egg-info$"
    ],
    minSizeMb: 0,
    maxAgeDays: 7,
    contentTypes: ["text", "binary"],
    maxThreads: 4,
    excludePatterns: [
      "\\.config", "\\.settings", "important", "\\.key$", "\\.pem$",
      "password", "secret", "credential", "token", "auth", "ssh",
      "\\.env$", "\\.env\\.", "config\\.json$",
      ".*password.*", ".*secret.*", ".*key.*\\.json$",
      ".*credential.*", ".*token.*", ".*auth.*",
      "\\.gitignore$", "\\.npmrc$", "\\.yarnrc$"
    ]
  },
  security: {
    secureDelete: false,
    overwritePasses: 3,
    backupEnabled: false,
    backupDir: "~/system_cleaner_backups",
    backupMaxSizeMb: 500,
    askConfirmation: true,
    excludeSystemCritical: true
  }
};

export function getOsType(): string {
  const system = os.platform().toLowerCase();
  if (system === "win32") return "windows";
  if (system === "darwin") return "macos";
  return "linux";
}

export async function loadConfig(): Promise<Config> {
  try {
    const configPath = process.env.MCP_SYSTEM_CLEANER_CONFIG || path.join(os.homedir(), '.mcp-system-cleaner', 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData) as Config;
    
    if (config.version !== DEFAULT_CONFIG.version) {
      return migrateConfig(config);
    }
    return config;
  } catch (error) {
    console.error("加载配置失败:", error);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    const configPath = process.env.MCP_SYSTEM_CLEANER_CONFIG || path.join(os.homedir(), '.mcp-system-cleaner', 'config.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("保存配置失败:", error);
    throw error;
  }
}

export function migrateConfig(oldConfig: Config): Config {
  return { ...DEFAULT_CONFIG, ...oldConfig };
}

export function expandPath(pathStr: string, osType: string): string {
  try {
    if (osType === "windows") {
      // 在Windows上展开环境变量
      Object.keys(process.env).forEach(key => {
        pathStr = pathStr.replace(`%${key}%`, process.env[key] || '');
      });
    }
    return path.resolve(os.homedir(), pathStr.replace(/^~/, ''));
  } catch (error) {
    console.warn(`路径展开失败: ${pathStr}, 错误:`, error);
    return pathStr;
  }
}

export async function analyzeFile(filePath: string, config: Config): Promise<FileInfo | null> {
  try {
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    // 检查排除模式
    if (config.fileRules.excludePatterns.some(pattern => 
      new RegExp(pattern, 'i').test(fileName) || new RegExp(pattern, 'i').test(dirName))) {
      return null;
    }

    // 检查文件扩展名
    const matchesExtension = config.fileRules.extensions.some(e => {
      if (e.includes('*')) {
        // 处理通配符模式
        const pattern = e.replace(/\*/g, '.*').replace(/\./g, '\\.');
        return new RegExp(pattern, 'i').test(fileName);
      }
      return fileName.toLowerCase().endsWith(e.toLowerCase());
    });

    // 检查文件名模式
    const matchesPattern = config.fileRules.namePatterns.some(pattern => {
      try {
        return new RegExp(pattern, 'i').test(fileName);
      } catch (e) {
        console.warn(`无效的正则表达式模式: ${pattern}`);
        return false;
      }
    });

    // 检查特殊系统文件
    const isSystemJunk = /^\.DS_Store$|^Thumbs\.db$|^desktop\.ini$/i.test(fileName) ||
                        /^\.Spotlight-V100$|^\.Trashes$|^\.fseventsd$/i.test(fileName);

    // 检查缓存目录
    const isCacheDir = /cache|temp|tmp|log|logs|crash|dumps/i.test(dirName);

    if (!matchesExtension && !matchesPattern && !isSystemJunk && !isCacheDir) {
      return null;
    }

    // 检查文件年龄
    if (config.fileRules.maxAgeDays > 0) {
      const fileAge = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
      if (fileAge < config.fileRules.maxAgeDays) {
        return null;
      }
    }

    // 检查最小文件大小
    if (stat.size < config.fileRules.minSizeMb * 1024 * 1024) {
      return null;
    }

    return {
      path: filePath,
      size: stat.size,
      modified: stat.mtime.getTime(),
      extension: ext,
      isFile: stat.isFile(),
      isDir: stat.isDirectory()
    };
  } catch (error) {
    console.warn(`文件分析失败: ${filePath}, 错误:`, error);
    return null;
  }
}

export async function secureDelete(filePath: string, passes: number = 3): Promise<void> {
  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    
    for (let i = 0; i < passes; i++) {
      const buffer = Buffer.alloc(fileSize);
      await fs.writeFile(filePath, buffer);
    }
    
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`安全删除失败: ${filePath}, 错误:`, error);
    throw error;
  }
} 