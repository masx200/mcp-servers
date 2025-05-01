export interface ScanPath {
  path: string;
  enabled: boolean;
  recursive: boolean;
}

export interface FileRules {
  extensions: string[];
  namePatterns: string[];
  minSizeMb: number;
  maxAgeDays: number;
  contentTypes: string[];
  maxThreads: number;
  excludePatterns: string[];
}

export interface SecurityConfig {
  secureDelete: boolean;
  overwritePasses: number;
  backupEnabled: boolean;
  backupDir: string;
  backupMaxSizeMb: number;
  askConfirmation: boolean;
  excludeSystemCritical: boolean;
}

export interface Config {
  version: string;
  scanPaths: {
    windows: ScanPath[];
    macos: ScanPath[];
    linux: ScanPath[];
  };
  fileRules: FileRules;
  security: SecurityConfig;
}

export interface FileInfo {
  path: string;
  size: number;
  modified: number;
  extension: string;
  isFile: boolean;
  isDir: boolean;
}

export interface CleanupStats {
  totalFreed: number;
  totalFreedMb: number;
  success: string[];
  failed: Array<{ path: string; error: string }>;
  dryRun: boolean;
}

export interface SystemStatus {
  os: string;
  config: Config;
  disks: Record<string, {
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  memory: {
    total: number;
    available: number;
    percent: number;
    used: number;
    free: number;
  };
  cpu: number;
  warning: string;
}

export interface ScanResults {
  tempFiles: FileInfo[];
  cacheFiles: FileInfo[];
  logFiles: FileInfo[];
  largeFiles: FileInfo[];
}

export interface ScanStats {
  totalFiles: number;
  totalSizeMb: number;
  categories: Record<string, {
    count: number;
    sizeMb: number;
  }>;
}

export interface LargeFileInfo {
  path: string;
  size: number;
  sizeMb: number;
  modified: number;
}

export interface LargeFileSearchResult {
  largeFiles: LargeFileInfo[];
  totalSizeMb: number;
  scannedCount: number;
  elapsedSeconds: number;
  timedOut: boolean;
} 