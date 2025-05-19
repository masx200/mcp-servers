#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ServerResult
} from "@modelcontextprotocol/sdk/types.js";
import { join, dirname, parse, sep } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { format } from 'date-fns';
import { platform, homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureDirSync } from 'fs-extra';

// ================== types.ts ==================
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

// ================== file-utils.ts ==================
const execAsync = promisify(exec);

export async function ensureDir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  await fsWriteFile(path, content);
}

export async function exists(path: string): Promise<boolean> {
  return existsSync(path);
}

export async function openFile(path: string, software: SoftwareType): Promise<void> {
  // 根据平台和软件类型构建命令
  let command = '';

  if (platform() === 'win32') {
    // Windows平台
    if (software === 'wps') {
      // 尝试定位WPS可执行文件
      const possibleWpsPaths = [
        'C:\\Program Files\\Kingsoft\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files (x86)\\Kingsoft\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files\\WPS Office\\office6\\wps.exe',
        'C:\\Program Files (x86)\\WPS Office\\office6\\wps.exe',
        // 从AppData目录查找
        join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'ksolaunch.exe'),
        join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'office6', 'wps.exe')
      ];

      let wpsBinary = '';
      for (const possiblePath of possibleWpsPaths) {
        if (existsSync(possiblePath)) {
          wpsBinary = possiblePath;
          break;
        }
      }

      if (wpsBinary) {
        // 使用确切的WPS可执行文件路径和start命令（避免命令行窗口）
        command = `start "" "${wpsBinary}" "${path}"`;
      } else {
        // 备用方法尝试使用文件关联
        command = `start "" "${path}"`;
      }
    } else if (software === 'office') {
      // 尝试使用MS Office打开
      // 先检查WINWORD.EXE是否存在
      const possibleOfficePaths = [
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
        'C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\Office16\\WINWORD.EXE'
      ];

      let officeBinary = '';
      for (const possiblePath of possibleOfficePaths) {
        if (existsSync(possiblePath)) {
          officeBinary = possiblePath;
          break;
        }
      }

      if (officeBinary) {
        // 使用确切的Office可执行文件路径和start命令
        command = `start "" "${officeBinary}" "${path}"`;
      } else {
        // 备用方法使用文件关联
        command = `start "" "${path}"`;
      }
    } else {
      // 默认使用系统关联程序打开
      command = `start "" "${path}"`;
    }
  } else if (platform() === 'darwin') {
    // macOS平台
    if (software === 'wps') {
      // 检查WPS Office是否存在特定路径
      const wpsPaths = [
        '/Applications/wpsoffice.app',
        '/Applications/WPS Office.app'
      ];

      let wpsPath = '';
      for (const possiblePath of wpsPaths) {
        if (existsSync(possiblePath)) {
          wpsPath = possiblePath;
          break;
        }
      }

      // 优先使用找到的WPS路径，其次尝试通用名称，最后用默认程序打开
      if (wpsPath) {
        command = `open -a "${wpsPath}" "${path}" || open "${path}"`;
        process.stderr.write(`使用WPS路径: ${wpsPath} 打开文件\n`);
      } else {
        // 尝试使用WPS Office常见名称
        command = `open -a "WPS Office" "${path}" || open -a "wpsoffice" "${path}" || open "${path}"`;
      }
    } else if (software === 'office') {
      // 尝试使用MS Office打开
      command = `open -a "Microsoft Word" "${path}" || open "${path}"`;
    } else {
      // 默认使用系统关联程序打开
      command = `open "${path}"`;
    }
  } else {
    // Linux平台
    if (software === 'wps') {
      // 尝试使用WPS打开
      command = `wps "${path}" 2>/dev/null || xdg-open "${path}"`;
    } else if (software === 'office') {
      // 尝试使用MS Office打开(可能通过Wine或原生Linux版本)
      command = `libreoffice "${path}" 2>/dev/null || xdg-open "${path}"`;
    } else {
      // 默认使用系统关联程序打开
      command = `xdg-open "${path}"`;
    }
  }

  try {
    process.stderr.write(`执行命令: ${command}\n`);
    await execAsync(command);
  } catch (error) {
    console.warn(`警告: 指定软件打开文件失败，尝试使用系统默认程序打开`);
    // 如果指定的程序打开失败，尝试使用默认程序
    try {
      const defaultCommand = platform() === 'win32'
        ? `start "" "${path}"`
        : platform() === 'darwin'
          ? `open "${path}"`
          : `xdg-open "${path}"`;

      await execAsync(defaultCommand);
    } catch (fallbackError) {
      throw new Error(`无法打开文件: ${error instanceof Error ? error.message : String(error)}\n备用命令也失败: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }
}

// ================== utils.ts ==================
export const FILE_EXTENSIONS: FileExtensions = {
  word: { new: '.docx', old: '.doc' },
  excel: { new: '.xlsx', old: '.xls' },
  ppt: { new: '.pptx', old: '.ppt' }
};

export const SOFTWARE_INFO: Partial<Record<SoftwareType, SoftwareInfo>> = {
  office: {
    name: 'Microsoft Office',
    checkPaths: [
      // Windows 路径
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files\\Microsoft Office\\Office15',
      'C:\\Program Files\\Microsoft Office\\Office14',
      'C:\\Program Files (x86)\\Microsoft Office\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\Office15',
      'C:\\Program Files (x86)\\Microsoft Office\\Office14',
      'C:\\Program Files\\Microsoft Office\\root\\Office16',
      'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16',
      // macOS 路径
      '/Applications/Microsoft Office 2016',
      '/Applications/Microsoft Office 2019',
      '/Applications/Microsoft Office 2021',
      '/Applications/Microsoft Word.app',
      '/Applications/Microsoft Excel.app',
      '/Applications/Microsoft PowerPoint.app',
      // Linux 路径 (可能通过Wine安装)
      '/usr/bin/libreoffice',
      '/usr/bin/openoffice',
      '/opt/libreoffice'
    ],
    executable: 'WINWORD.EXE'
  },
  wps: {
    name: 'WPS Office',
    checkPaths: [
      // macOS 路径 - 将 wpsoffice.app 放在最前面
      '/Applications/wpsoffice.app',
      '/Applications/WPS Office.app',
      // Windows 路径
      'C:\\Program Files\\Kingsoft\\WPS Office',
      'C:\\Program Files (x86)\\Kingsoft\\WPS Office',
      'C:\\Program Files\\WPS Office',
      'C:\\Program Files (x86)\\WPS Office',
      'C:\\Program Files\\WPS',
      'C:\\Program Files (x86)\\WPS',
      'C:\\Program Files\\WPS Office 2019',
      'C:\\Program Files (x86)\\WPS Office 2019',
      'C:\\Program Files\\WPS Office 2016',
      'C:\\Program Files (x86)\\WPS Office 2016',
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office'),
      // Linux 路径
      '/usr/bin/wps',
      '/usr/bin/wpp',
      '/usr/bin/et',
      '/opt/kingsoft/wps-office',
      '/opt/wps-office',
      '/usr/share/applications/wps-office'
    ],
    executable: 'wps.exe'
  }
};

export function getDesktopPath(): string {
  return join(homedir(), 'Desktop');
}

export function generateFileName(type: DocType): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  return `新建${type}文档_${timestamp}${FILE_EXTENSIONS[type].new}`;
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

export async function generateUniquePath(path: string, overwrite: boolean): Promise<string> {
  if (overwrite) {
    return path;
  }

  const { dir, name, ext } = parse(path);
  let counter = 1;
  let finalPath = path;

  while (await exists(finalPath)) {
    finalPath = join(dir, `${name}(${counter})${ext}`);
    counter++;
  }

  return finalPath;
}

export async function checkSoftwareInstalled(software: SoftwareType): Promise<SoftwareType | null> {
  if (software === 'auto') {
    // 自动检测模式：优先检测 Microsoft Office
    const hasOffice = await checkSoftwareInstalled('office');
    if (hasOffice) {
      process.stderr.write('检测到 Microsoft Office 已安装\n');
      return 'office';
    }

    // Microsoft Office 未安装，尝试检测 WPS Office
    const hasWPS = await checkSoftwareInstalled('wps');
    if (hasWPS) {
      process.stderr.write('检测到 WPS Office 已安装\n');
      return 'wps';
    }

    return null;
  }

  const info = SOFTWARE_INFO[software];
  if (!info) {
    return null;
  }

  // macOS 平台上的特殊处理
  if (platform() === 'darwin' && software === 'wps') {
    // 在macOS上特别检查WPS常见的可执行文件路径
    const wpsPaths = [
      '/Applications/wpsoffice.app',
      '/Applications/WPS Office.app',
      '/Applications/wpsoffice.app/Contents/MacOS/wpsoffice',
      '/Applications/WPS Office.app/Contents/MacOS/wpsoffice'
    ];

    for (const path of wpsPaths) {
      if (existsSync(path)) {
        process.stderr.write(`检测到 WPS Office 安装在: ${path}\n`);
        return 'wps';
      }
    }
  }

  // Windows 平台上的特殊处理
  if (platform() === 'win32' && software === 'wps') {
    // 在Windows上检查WPS常见的可执行文件路径
    const wpsPaths = [
      'C:\\Program Files\\Kingsoft\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files (x86)\\Kingsoft\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files\\WPS Office\\office6\\wps.exe',
      'C:\\Program Files (x86)\\WPS Office\\office6\\wps.exe',
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'ksolaunch.exe'),
      join(homedir(), 'AppData', 'Local', 'Kingsoft', 'WPS Office', 'office6', 'wps.exe')
    ];

    for (const path of wpsPaths) {
      if (existsSync(path)) {
        return 'wps';
      }
    }
  }

  // 首先检查预定义路径
  for (const path of info.checkPaths) {
    if (existsSync(path)) {
      // Windows 平台上进一步验证 WPS 实际可执行文件
      if (platform() === 'win32' && software === 'wps') {
        // 检查 WPS 可执行文件
        const exePath = join(path, 'office6', 'wps.exe');
        if (existsSync(exePath)) {
          return software;
        }
        // 如果找不到wps.exe，继续检查其他路径
        continue;
      }

      return software;
    }
  }

  // 在Windows上使用注册表检查
  if (platform() === 'win32') {
    try {
      // 使用require以便在浏览器环境中不会导致错误
      const { execSync } = require('child_process');
      const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths" /s').toString();

      if (software === 'office') {
        if (output.includes('WINWORD.EXE') || output.includes('EXCEL.EXE') || output.includes('POWERPNT.EXE')) {
          return 'office';
        }
      } else if (software === 'wps') {
        if (output.includes('wps.exe') || output.includes('et.exe') || output.includes('wpp.exe')) {
          return 'wps';
        }
      }
    } catch (error) {
      // 注册表查询失败，忽略错误继续执行
    }
  }

  return null;
}

export async function createOfficeDocUtil(options: CreateOfficeDocOptions): Promise<CreateDocResult> {
  const result: CreateDocResult = {
    success: false,
    warnings: []
  };

  try {
    // 参数验证和默认值设置
    const {
      type = 'word',  // 默认创建 Word 文档
      software = 'auto',  // 默认自动检测
      path = getDesktopPath(),  // 默认保存到桌面
      filename,  // 可选，不指定则自动生成
      overwrite = false,  // 默认不覆盖
      openImmediately = true  // 默认自动打开
    } = options;

    // 验证文档类型
    if (!['word', 'excel', 'ppt'].includes(type)) {
      result.error = `无效的文档类型: ${type}，必须是 word、excel 或 ppt`;
      return result;
    }

    // 验证软件类型
    if (!['auto', 'office', 'wps'].includes(software)) {
      result.error = `无效的软件类型: ${software}，必须是 auto、office 或 wps`;
      return result;
    }

    // 检查软件是否安装
    const installedSoftware = await checkSoftwareInstalled(software);
    if (!installedSoftware) {
      result.error = 'Neither Microsoft Office nor WPS Office is installed';
      return result;
    }

    // 确保目录存在
    try {
      await ensureDir(path);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `无法创建目录: ${errorMessage}`;
      return result;
    }

    // 生成文件名
    let finalFilename: string;
    if (filename) {
      // 如果提供了文件名，确保它有正确的扩展名
      finalFilename = sanitizeFileName(filename);
      const extensions = FILE_EXTENSIONS[type];
      if (!finalFilename.endsWith(extensions.new) && !finalFilename.endsWith(extensions.old)) {
        finalFilename += extensions.new;
      }
    } else {
      // 自动生成文件名
      finalFilename = generateFileName(type);
    }

    // 生成最终的文件路径
    const finalPath = await generateUniquePath(join(path, finalFilename), overwrite);

    // 创建空文件
    try {
      await writeFile(finalPath, '');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `无法创建文件: ${errorMessage}`;
      return result;
    }

    // 如果设置了自动打开，则打开文件
    if (openImmediately && installedSoftware !== 'auto') {
      try {
        await openFile(finalPath, installedSoftware);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.warnings!.push(`警告：无法自动打开文件: ${errorMessage}`);
      }
    }

    // 设置成功结果
    result.success = true;
    result.path = finalPath;
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.error = `创建文档失败: ${errorMessage}`;
    return result;
  }
}

// 工具定义
const CREATE_OFFICE_DOC_TOOL: Tool = {
  name: "create_office_doc",
  description: "创建新的办公文档，支持 Word、Excel 和 PowerPoint 格式",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "文档类型 (word, excel, ppt)"
      },
      software: {
        type: "string",
        description: "使用的软件 (auto, office, wps)"
      },
      path: {
        type: "string",
        description: "保存路径"
      },
      filename: {
        type: "string",
        description: "文件名"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖已存在文件"
      },
      openImmediately: {
        type: "boolean",
        description: "是否立即打开"
      }
    },
    required: ["type"]
  }
};

const GET_SUPPORTED_SOFTWARE_TOOL: Tool = {
  name: "get_supported_software",
  description: "获取系统上已安装的办公软件信息",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

const TOOLS = [
  CREATE_OFFICE_DOC_TOOL,
  GET_SUPPORTED_SOFTWARE_TOOL
] as const;

// 服务器设置
const server = new Server(
  {
    name: "doc-info",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: Object.fromEntries(
        TOOLS.map(tool => [tool.name, tool])
      ),
    },
  },
);

// 重定向控制台输出到 stderr，避免干扰 MCP 协议
console.log = (...args) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  process.stderr.write(`[INFO] ${message}\n`);
};

console.error = (...args) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  process.stderr.write(`[ERROR] ${message}\n`);
};

console.warn = (...args) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  process.stderr.write(`[WARN] ${message}\n`);
};

// 日志函数
const logger = {
  info: (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    process.stderr.write(`[INFO] ${message}\n`);
  },
  error: (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    process.stderr.write(`[ERROR] ${message}\n`);
  },
  warn: (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    process.stderr.write(`[WARN] ${message}\n`);
  }
};

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<ServerResult> => {
  try {
    switch (request.params.name) {
      case "create_office_doc": {
        const args = request.params.arguments || {};

        // 处理类型验证
        if (!args.type || typeof args.type !== 'string' ||
          !['word', 'excel', 'ppt'].includes(args.type)) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "无效的文档类型，必须是word、excel或ppt"
              })
            }],
            isError: true
          };
        }

        // 验证软件类型
        if (args.software !== undefined &&
          typeof args.software === 'string' &&
          !['auto', 'office', 'wps'].includes(args.software)) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "无效的软件类型，必须是auto、office或wps"
              })
            }],
            isError: true
          };
        }

        // 构建参数对象
        const options: CreateOfficeDocOptions = {
          type: args.type as DocType,
        };

        // 处理可选参数
        if (args.software !== undefined) options.software = args.software as SoftwareType;
        if (args.path !== undefined) options.path = args.path as string;
        if (args.filename !== undefined) options.filename = args.filename as string;
        if (args.overwrite !== undefined) options.overwrite = !!args.overwrite;
        if (args.openImmediately !== undefined) options.openImmediately = !!args.openImmediately;

        const result = await createOfficeDocUtil(options);

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success
        };
      }

      case "get_supported_software": {
        const hasOffice = await checkSoftwareInstalled('office');
        const hasWPS = await checkSoftwareInstalled('wps');
        const result = {
          office: hasOffice !== null,
          wps: hasWPS !== null
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: false
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `未知工具: ${request.params.name}`
            })
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: `错误: ${error instanceof Error ? error.message : String(error)}`
        })
      }],
      isError: true
    };
  }
});

// 启动服务器
async function runServer() {
  try {
    // 设置进程错误处理
    process.on('uncaughtException', (error) => {
      logger.error(`未捕获的异常: ${error instanceof Error ? error.message : String(error)}`);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error(`未处理的 Promise 拒绝: ${reason instanceof Error ? reason.message : String(reason)}`);
    });

    // 设置退出处理
    process.on('SIGINT', () => {
      logger.info('正在关闭 MCP 服务器...');
      process.exit(0);
    });

    // 启动服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("文档创建 MCP 服务器已通过 stdio 运行");
  } catch (error) {
    logger.error(`服务器启动失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// 处理命令行模式
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  logger.info(`
文档创建 MCP 服务器 - 帮助信息

说明:
  此服务用于在 Cursor 中通过 MCP 框架创建和管理 Office 文档，支持 Word、Excel 和 PowerPoint。

使用方法: 
  npm start -- [选项]

选项:
  --help, -h      显示此帮助信息

工具:
  create_office_doc       - 创建新的办公文档
  get_supported_software  - 获取系统上已安装的办公软件信息

配置示例 (~/.cursor/mcp.json):
{
  "mcpServers": {
    "doc-info": {
      "command": "node",
      "args": [
        "项目路径/typescript/mcp-doc-info/dist/index.js"
      ],
      "autoApprove": [
        "create_office_doc",
        "get_supported_software"
      ]
    }
  }
}
  `);
  process.exit(0);
} else {
  logger.info("正在启动文档创建 MCP 服务器...");
  runServer().catch((error) => {
    logger.error(`运行服务器时发生致命错误: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}