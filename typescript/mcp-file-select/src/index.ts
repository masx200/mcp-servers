#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { platform } from "os";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Escapes special characters in strings for AppleScript
 */
function escapeString(str: string): string {
  // Escape for both AppleScript and shell
  return str
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"');
}

interface FileSelectParams {
  /** Optional prompt message */
  prompt?: string;
  /** Optional default location */
  defaultLocation?: string;
  /** Optional file type filter (e.g., {"public.image": ["png", "jpg"]}) */
  fileTypes?: string[];
  /** Whether to allow multiple selection */
  multiple?: boolean;
}

interface FileSelectResult {
  /** Selected file paths */
  paths: string[];
  /** Whether the operation was cancelled by user */
  cancelled?: boolean;
  /** Message describing the result */
  message?: string;
}

/**
 * Validates file selection parameters
 */
function validateFileSelectParams(params: FileSelectParams): void {
  if (params.prompt && typeof params.prompt !== "string") {
    throw new Error(
      "Prompt must be a string",
    );
  }

  if (params.defaultLocation && typeof params.defaultLocation !== "string") {
    throw new Error(
      "Default location must be a string",
    );
  }

  if (params.multiple !== undefined && typeof params.multiple !== "boolean") {
    throw new Error(
      "Multiple selection flag must be a boolean",
    );
  }

  if (params.fileTypes && params.fileTypes.length > 0) {
    if (!Array.isArray(params.fileTypes)) {
      throw new Error(
        "File types must be an array",
      );
    }
    for (const fileType of params.fileTypes) {
      if (typeof fileType !== "string") {
        throw new Error(
          "File type must be a string",
        );
      }
    }
  }
}

function buildMacOSCommand(params: FileSelectParams): string {
  let script = "choose file";
  if (params.multiple) script += " with multiple selections allowed";
  if (params.prompt) script += ` with prompt "${escapeString(params.prompt)}"`;
  if (params.defaultLocation) {
    script += ` default location "${escapeString(params.defaultLocation)}"`;
  }
  if (params.fileTypes) {
    const extensions = Object.values(params.fileTypes).flat();
    if (extensions.length > 0) {
      script += ` of type {${extensions.map((ext) => `"${ext}"`).join(", ")}}`;
    }
  }

  // 处理多选和单选的路径转换
  if (params.multiple) {
    script = `set fileList to ${script}
set pathString to ""
repeat with aFile in fileList
  if pathString is equal to "" then
    set pathString to POSIX path of aFile
  else
    set pathString to pathString & "," & POSIX path of aFile
  end if
end repeat
return pathString`;
  } else {
    script = `POSIX path of (${script})`;
  }

  return `osascript -e '${script}'`;
}

function buildWindowsCommand(params: FileSelectParams): string {
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    ${params.prompt ? `$dialog.Title = "${escapeString(params.prompt)}"` : ""}
    ${params.multiple ? "$dialog.Multiselect = $true" : ""}
    ${
    params.defaultLocation
      ? `$dialog.InitialDirectory = "${escapeString(params.defaultLocation)}"`
      : ""
  }
    $dialog.ShowDialog() | Out-Null
    $dialog.FileNames -join ","
  `;
  return `powershell -Command "${psScript.replace(/\n\s+/g, " ")}"`;
}

// 新增：检查并安装 zenity
async function ensureZenityInstalled(): Promise<void> {
  try {
    // 检查 zenity 是否已安装
    await execAsync("which zenity || zenity --version").catch(() => {});
  } catch {
    try {
      // 根据发行版选择包管理器
      const { stdout: distro } = await execAsync(
        "grep ^ID= /etc/os-release | cut -d= -f2",
      );
      const pkgManager =
        distro.trim() === "debian" || distro.trim() === "ubuntu"
          ? "apt"
          : "dnf";
      await execAsync(`sudo ${pkgManager} install -y zenity`);
      console.error("zenity 安装成功！");
    } catch (installError) {
      throw new Error(
        `自动安装 zenity 失败，请手动运行以下命令安装：\n` +
          `  Ubuntu/Debian: sudo apt install zenity\n` +
          `  Fedora/RHEL: sudo dnf install zenity`,
      );
    }
  }
}

// 修改 Linux 命令构建逻辑
async function buildLinuxCommand(params: FileSelectParams): Promise<string> {
  await ensureZenityInstalled(); // 确保 zenity 存在
  let cmd = "zenity --file-selection";
  if (params.multiple) cmd += ' --multiple --separator=","';
  if (params.prompt) cmd += ` --title="${escapeString(params.prompt)}"`;
  if (params.defaultLocation) {
    cmd += ` --filename="${escapeString(params.defaultLocation)}"`;
  }
  return cmd;
}

/**
 * Prompts user to select file(s) using native file picker
 */
async function selectFile(params: FileSelectParams): Promise<FileSelectResult> {
  validateFileSelectParams(params);

  let command: string;
  const os = platform();

  switch (os) {
    case "darwin":
      command = buildMacOSCommand(params);
      break;
    case "win32":
      command = buildWindowsCommand(params);
      break;
    case "linux":
      command = await buildLinuxCommand(params); // 注意改为异步
      break;
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }

  try {
    const { stdout } = await execAsync(command);
    const paths = stdout
      .trim()
      .split(",")
      .map((path) => path.trim())
      .filter((path) => path.length > 0);

    return {
      paths,
      message: `成功选择了 ${paths.length} 个文件`,
    };
  } catch (error) {
    const err = error as Error;

    // 检查是否为用户取消操作
    if (
      err.message.includes("用户已取消") ||
      err.message.includes("User canceled") ||
      err.message.includes("cancelled") ||
      err.message.includes("cancel") ||
      err.message.includes("closed") ||
      err.message.includes("-128")
    ) {
      return {
        paths: [],
        cancelled: true,
        message: "用户取消了文件选择",
      };
    }

    throw new Error(`Failed to select file: ${err.message}`);
  }
}

class FileSelectServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "file-select-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "select_file",
          description:
            "打开文件选择对话框，当需要操作一个文件或目录，却不知道具体路径时，可以调用该工具让用户选择",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "可选的提示消息",
              },
              defaultLocation: {
                type: "string",
                description: "可选的默认目录路径",
              },
              fileTypes: {
                type: "array",
                items: {
                  type: "string",
                },
                description: '可选的文件类型过滤器 (例如: ["png", "jpg"])',
              },
              multiple: {
                type: "boolean",
                description: "是否允许多选",
              },
            },
            additionalProperties: false,
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (
          !request.params.arguments ||
          typeof request.params.arguments !== "object"
        ) {
          throw new McpError(ErrorCode.InvalidParams, "Invalid parameters");
        }

        switch (request.params.name) {
          case "select_file": {
            const { prompt, defaultLocation, fileTypes, multiple } = request
              .params.arguments as Record<string, unknown>;

            const params: FileSelectParams = {
              prompt: typeof prompt === "string" ? prompt : undefined,
              defaultLocation: typeof defaultLocation === "string"
                ? defaultLocation
                : undefined,
              fileTypes: Array.isArray(fileTypes)
                ? fileTypes as string[]
                : undefined,
              multiple: typeof multiple === "boolean" ? multiple : undefined,
            };

            const result = await selectFile(params);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`,
            );
        }
      } catch (error) {
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("File Select MCP server running on stdio");
  }
}

const server = new FileSelectServer();
server.run().catch(console.error);
