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