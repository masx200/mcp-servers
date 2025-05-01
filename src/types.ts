export type DocType = 'word' | 'excel' | 'ppt';
export type Software = 'auto' | 'office' | 'wps';

export interface CreateDocOptions {
  /** 文档类型 */
  type: DocType;
  /** 使用的软件 */
  software?: Software;
  /** 保存路径 */
  path?: string;
  /** 文件名 */
  filename?: string;
  /** 是否覆盖已存在文件 */
  overwrite?: boolean;
  /** 是否立即打开 */
  openImmediately?: boolean;
}

export interface FileExtensions {
  [key: string]: {
    new: string;
    old: string;
  };
}

export interface SoftwareInfo {
  name: string;
  checkPaths: string[];
  executable: string;
} 