#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { chmod } from 'fs/promises';
import archiver from 'archiver';
import SevenZip from "7z-wasm";

const execAsync = promisify(exec);

// Tool definitions
const COMPRESS_TOOL: Tool = {
  name: "compress",
  description: "将文件或文件夹压缩为指定格式",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "要压缩的文件或文件夹路径"
      },
      destination: {
        type: "string",
        description: "压缩文件的输出路径（包括文件名）"
      },
      format: {
        type: "string",
        description: "压缩格式，支持：zip、7z、tar、tar.gz",
        enum: ["zip", "7z", "tar", "tar.gz"]
      }
    },
    required: ["source", "format"]
  }
};

const EXTRACT_TOOL: Tool = {
  name: "extract",
  description: "解压缩文件到指定位置",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "要解压的压缩文件路径"
      },
      destination: {
        type: "string",
        description: "解压目标位置，可选值：'specified'（指定目录），'desktop'（桌面），'current'（当前文件夹）。默认为'current'。",
        enum: ["specified", "desktop", "current"]
      },
      target_dir: {
        type: "string",
        description: "当destination为'specified'时，指定解压的目标目录路径"
      }
    },
    required: ["source"]
  }
};

const COMPRESSION_TOOLS = [
  COMPRESS_TOOL,
  EXTRACT_TOOL
] as const;

// Helper functions
function getDesktopPath() {
  return path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop');
}

function getCurrentDirectory() {
  return process.cwd();
}

function ensureExtension(filePath:any, extension:any) {
  if (!filePath.endsWith(`.${extension}`)) {
    return `${filePath}.${extension}`;
  }
  return filePath;
}

function getDefaultDestination(source:any, extension:any) {
  const basename = path.basename(source);
  return path.join(path.dirname(source), `${basename}.${extension}`);
}

async function handleCompress(source: string, format: string, destination?: string): Promise<any> {
  try {
    const sourcePath = path.resolve(source);

    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{
          type: "text",
          text: `错误：源文件或目录 '${sourcePath}' 不存在。`
        }],
        isError: true
      };
    }

    // 根据格式选择不同的压缩方法
    switch (format.toLowerCase()) {
      case 'zip':
        return handleCompressZip(sourcePath, destination);
      case '7z':
        return handleCompress7z(sourcePath, destination);
      case 'tar':
        return handleCompressTar(sourcePath, destination);
      case 'tar.gz':
        return handleCompressTarGz(sourcePath, destination);
      default:
        return {
          content: [{
            type: "text",
            text: `不支持的压缩格式: ${format}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `压缩错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleCompressZip(source: string, destination?: string): Promise<any> {
  try {
    const sourcePath = path.resolve(source);
    const destPath = destination ? path.resolve(destination) : getDefaultDestination(sourcePath, 'zip');

    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });

    output.on('close', () => {
      console.error(`${archive.pointer()} total bytes`);
      console.error('archiver has been finalized and the output file descriptor has closed.');
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      // 压缩文件夹内容，而不是整个路径
      archive.directory(sourcePath, false);
    } else {
      // 压缩单个文件
      archive.file(sourcePath, { name: path.basename(sourcePath) });
    }

    await archive.finalize();

    return {
      content: [{
        type: "text",
        text: `成功压缩为ZIP格式: ${destPath}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `ZIP压缩错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// 定义SevenZip初始化选项的接口
interface SevenZipOptions {
  locateFile?: (filename: string) => string;
  wasmBinary?: ArrayBuffer;
}

async function handleCompress7z(source: string, destination?: string): Promise<any> {
  // Ensure finalDestPathAbs is initialized as a string before try block
  let finalDestPathAbs: string;
  if (destination) {
    finalDestPathAbs = ensureExtension(path.resolve(destination), '7z');
  } else {
    finalDestPathAbs = getDefaultDestination(path.resolve(source), '7z');
    // getDefaultDestination already adds .7z if it generates a name, but ensureExtension handles if source itself had .7z
    finalDestPathAbs = ensureExtension(finalDestPathAbs, '7z');
  }

  try {
    console.error("开始7z压缩...");

    // 先尝试使用命令行工具压缩（如果系统中有安装）
    try {
      console.error("尝试使用系统7z命令行工具...");
      const sourcePath = path.resolve(source);
      // Use finalDestPathAbs which is already resolved and extension-ensured
      // If system command is attempted, it should use the already determined finalDestPathAbs

      if (!fs.existsSync(sourcePath)) {
        return { content: [{ type: "text", text: `错误: 源文件或目录 '${sourcePath}' 不存在。` }], isError: true };
      }

      const command = `7z a '${finalDestPathAbs}' '${sourcePath}'`;
      await execAsync(command);

      console.error(`使用系统7z命令行工具成功压缩: ${finalDestPathAbs}`);
      return {
        content: [{ type: "text", text: `成功压缩为7Z格式: ${finalDestPathAbs}` }],
        isError: false
      };
    } catch (cmdError: any) {
      console.error("系统7z命令行工具不可用或执行失败:", cmdError.message);
      console.error("尝试使用7z-wasm库...");
    }

    // 如果命令行工具失败，继续使用7z-wasm库
    const sourcePathAbs = path.resolve(source);
    // finalDestPathAbs is already determined and correctly extensioned from the top

    if (!fs.existsSync(sourcePathAbs)) {
      return { content: [{ type: "text", text: `错误: 源文件或目录 '${sourcePathAbs}' 不存在。` }], isError: true };
    }

    const sourceParentAbs = path.dirname(sourcePathAbs);
    const sourceBasename = path.basename(sourcePathAbs);
    // The filename for the archive, to be used within the VFS and as the name on host before potential move
    const archiveOutputName = path.basename(finalDestPathAbs);

    // This is where the archive will temporarily be created on the host system
    // due to NODEFS mounting sourceParentAbs.
    const tempArchiveHostPath = path.join(sourceParentAbs, archiveOutputName);

    // Attempt to locate 7zz.wasm more robustly
    let resolvedWasmPath = '';
    const wasmFileName = '7zz.wasm';
    // Common paths to check for 7zz.wasm relative to __dirname or 7z-wasm package
    const potentialWasmPaths = [
      path.resolve(__dirname, 'node_modules', '7z-wasm', wasmFileName), // Original attempt if structure is flat
      path.resolve(__dirname, '..', 'node_modules', '7z-wasm', wasmFileName), // If __dirname is in dist/, node_modules is ../
      path.resolve(__dirname, 'node_modules', '7z-wasm', 'dist', wasmFileName), // Common dist folder in package
      path.resolve(__dirname, '..', 'node_modules', '7z-wasm', 'dist', wasmFileName)
    ];

    for (const p of potentialWasmPaths) {
      if (fs.existsSync(p)) {
        resolvedWasmPath = p;
        break;
      }
    }

    if (!resolvedWasmPath) {
      try {
        // Try resolving via require.resolve for the package and then look for common subpaths
        const sevenWasmPackageDir = path.dirname(require.resolve('7z-wasm/package.json')); // Get package root
        const packageWasmPaths = [
          path.join(sevenWasmPackageDir, 'dist', wasmFileName),
          path.join(sevenWasmPackageDir, wasmFileName)
        ];
        for (const p of packageWasmPaths) {
          if (fs.existsSync(p)) {
            resolvedWasmPath = p;
            break;
          }
        }
      } catch (e) {
        console.error("尝试通过 require.resolve('7z-wasm') 定位 WASM 文件失败。", e);
      }
    }

    console.error("最终尝试的WASM文件路径:", resolvedWasmPath);
    console.error("WASM文件是否存在:", resolvedWasmPath ? fs.existsSync(resolvedWasmPath) : false);

    if (!resolvedWasmPath || !fs.existsSync(resolvedWasmPath)) {
        return {
            content: [{ type: "text", text: `错误: 7zz.wasm 未找到。请检查7z-wasm包的安装和结构，并确认wasm文件位置，或者安装系统7z命令行工具。` }],
            isError: true
        };
    }

    // Read the Wasm binary content
    const wasmFileBuffer = fs.readFileSync(resolvedWasmPath);
    const wasmBinary = wasmFileBuffer.buffer.slice(
      wasmFileBuffer.byteOffset,
      wasmFileBuffer.byteOffset + wasmFileBuffer.byteLength
    );

    const options: SevenZipOptions = {
      wasmBinary: wasmBinary
    };

    const sevenZip = await SevenZip(options);
    console.error("SevenZip初始化成功");

    const mountPointVFS = "/vfs_mounted_dir";

    try {
      // Attempt to unmount and remove directory if it exists from a previous run
      // These operations might throw an error if the path doesn't exist or isn't a mount point,
      // so we catch and log, then proceed to create.
      try {
        sevenZip.FS.unmount(mountPointVFS);
        console.error(`VFS 清理: 已卸载可能的旧挂载点 ${mountPointVFS}`);
      } catch (e: any) {
        // console.error(`VFS 清理: 卸载 ${mountPointVFS} 时出错 (可能未挂载或不存在): ${e.message}`);
      }
      try {
        sevenZip.FS.rmdir(mountPointVFS);
        console.error(`VFS 清理: 已删除可能的旧目录 ${mountPointVFS}`);
      } catch (e: any) {
        // console.error(`VFS 清理: 删除目录 ${mountPointVFS} 时出错 (可能不存在): ${e.message}`);
      }
    } catch (e) {
      // Should not happen with individual try-catches above, but as a safeguard.
      // console.error(`VFS 清理挂载点 ${mountPointVFS} 时出现非预期错误: `, e.message);
    }

    console.error(`VFS: 创建挂载点目录 ${mountPointVFS}`);
    sevenZip.FS.mkdir(mountPointVFS);

    console.error(`VFS: 挂载主机目录 '${sourceParentAbs}' 到VFS路径 '${mountPointVFS}'`);
    sevenZip.FS.mount(sevenZip.NODEFS, { root: sourceParentAbs }, mountPointVFS);

    console.error(`VFS: 切换当前工作目录到 '${mountPointVFS}'`);
    sevenZip.FS.chdir(mountPointVFS);

    console.error(`执行7z命令: VFS当前工作目录: ${sevenZip.FS.cwd()}, (预期映射到主机: ${sourceParentAbs})`);
    console.error(`压缩源 (VFS相对路径): '${sourceBasename}' 到目标 (VFS相对路径): '${archiveOutputName}'`);

    sevenZip.callMain(["a", archiveOutputName, sourceBasename]);

    console.error(`7z命令执行完毕。预期压缩包在VFS路径: '${mountPointVFS}/${archiveOutputName}'`);
    console.error(`对应的主机临时路径: '${tempArchiveHostPath}'`);

    console.error(`VFS: 卸载 '${mountPointVFS}'`);
    sevenZip.FS.unmount(mountPointVFS);
    console.error(`VFS: 删除目录 '${mountPointVFS}'`);
    sevenZip.FS.rmdir(mountPointVFS);

    if (!fs.existsSync(tempArchiveHostPath)) {
      console.error(`错误: 压缩后临时文件未在主机上找到: ${tempArchiveHostPath}`);
      return {
        content: [{ type: "text", text: `7Z压缩后错误: 临时输出文件 ${tempArchiveHostPath} 未创建。请检查7z-wasm的输出和文件系统权限。` }],
        isError: true
      };
    }

    // If the temporary path is different from the final desired path, move/rename the file.
    if (path.resolve(tempArchiveHostPath) !== path.resolve(finalDestPathAbs)) {
      console.error(`移动临时压缩包 '${tempArchiveHostPath}' 到最终目标 '${finalDestPathAbs}'`);
      const finalDestDir = path.dirname(finalDestPathAbs);
      if (!fs.existsSync(finalDestDir)) {
        console.error(`创建目标目录: ${finalDestDir}`);
        fs.mkdirSync(finalDestDir, { recursive: true });
      }
      fs.renameSync(tempArchiveHostPath, finalDestPathAbs);
    } else {
      console.error(`压缩包已在最终目标位置创建: ${finalDestPathAbs}`);
    }

    return {
      content: [{ type: "text", text: `成功压缩为7Z格式: ${finalDestPathAbs}` }],
      isError: false
    };

  } catch (error: any) {
    // Check if the archive was created despite a late FS error from wasm
    if (error && error.errno === 10 && error.message === 'FS error' && finalDestPathAbs && fs.existsSync(finalDestPathAbs)) {
      const successMessage = `成功压缩为7Z格式: ${finalDestPathAbs}`;
      const warningMessage = `注意: 压缩成功，但在7z-wasm内部文件系统清理时发生了一个小错误 (FS error, errno: 10)。这通常与源文件/目录中的问题（如损坏的符号链接，请检查7-Zip输出的警告）有关，但压缩文件本身应可用。错误详情: ${error?.message}`;
      console.warn(warningMessage);
      return {
        content: [{ type: "text", text: successMessage }],
        isError: false, // Indicate overall success as archive exists
        hasWarning: true // Add a flag for warnings
      };
    }

    return {
      content: [{ type: "text", text: `7Z压缩错误: ${error?.message || '未知错误'}. 堆栈跟踪: ${error?.stack || '无堆栈信息'}. 详情请查看服务端日志。` }],
      isError: true
    };
  }
}

async function handleCompressTar(source: string, destination?: string) {
  try {
    const sourcePath = path.resolve(source);
    let destPath = destination ? path.resolve(destination) : getDefaultDestination(sourcePath, 'tar');
    destPath = ensureExtension(destPath, 'tar');

    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{
          type: "text",
          text: `错误: 源文件或目录 '${sourcePath}' 不存在。`
        }],
        isError: true
      };
    }

    // 获取源文件/文件夹的基本名称和父目录
    const sourceBasename = path.basename(sourcePath);
    const sourceParent = path.dirname(sourcePath);

    // 使用 tar 命令时，先切换到父目录，然后只压缩基本名称
    // 这样可以确保只压缩指定的文件或文件夹，而不是整个路径
    const command = `cd '${sourceParent}' && tar -cf '${destPath}' '${sourceBasename}'`;

    await execAsync(command);

    return {
      content: [{
        type: "text",
        text: `成功压缩为TAR格式: ${destPath}`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `TAR压缩错误: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleCompressTarGz(source: string, destination?: string) {
  try {
    const sourcePath = path.resolve(source);
    let destPath = destination ? path.resolve(destination) : getDefaultDestination(sourcePath, 'tar.gz');

    if (!destPath.endsWith('.tar.gz')) {
      destPath = `${destPath}.tar.gz`;
    }

    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{
          type: "text",
          text: `错误: 源文件或目录 '${sourcePath}' 不存在。`
        }],
        isError: true
      };
    }

    // 获取源文件/文件夹的基本名称和父目录
    const sourceBasename = path.basename(sourcePath);
    const sourceParent = path.dirname(sourcePath);

    // 使用 tar 命令时，先切换到父目录，然后只压缩基本名称
    // 这样可以确保只压缩指定的文件或文件夹，而不是整个路径
    const command = `cd '${sourceParent}' && tar -czf '${destPath}' '${sourceBasename}'`;

    await execAsync(command);

    return {
      content: [{
        type: "text",
        text: `成功压缩为TAR.GZ格式: ${destPath}`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `TAR.GZ压缩错误: ${error.message}`
      }],
      isError: true
    };
  }
}

async function setDirectoryPermissions(dir: string) {
  try {
    // Windows 系统使用不同的权限处理方式
    if (process.platform === 'win32') {
      try {
        const command = `icacls "${dir}" /grant Everyone:F /T /Q`; // Added /Q for quiet to suppress success messages
        await execAsync(command);
        console.error(`Windows: Successfully applied permissions to "${dir}" using icacls.`);
      } catch (error) {
        console.error(`Windows 设置权限时出错 for "${dir}": ${error}`);
        // Don't re-throw, allow other operations to continue if possible
      }
    } else {
      // Unix/Linux 系统使用之前的权限设置逻辑
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        // Skip if fullPath is a symbolic link to avoid errors with lstat/chmod on broken links
        // or if we don't have permissions to stat it.
        let stat;
        try {
          stat = fs.lstatSync(fullPath); // Use lstat to avoid following symlinks for stat
        } catch (statError) {
          console.error(`无法获取文件状态 ${fullPath}: ${statError}. 跳过权限设置。`);
          continue;
        }

        // Set file/directory permissions
        // 755 for directories (drwxr-xr-x)
        // 644 for files (-rw-r--r--)
        // For symbolic links, we typically don't change their permissions,
        // but the permissions of the target they point to.
        // However, chmod on a symlink can sometimes affect the target,
        // depending on the OS. Here, we're acting on fullPath directly.
        // If it's a symlink, chmod might fail or affect the target.
        // For simplicity, we'll attempt to chmod. If it's a symlink and chmod fails,
        // it will be caught. If it succeeds, it's likely changing the target's permissions.
        if (!stat.isSymbolicLink()) { // Only chmod if not a symlink
            const mode = stat.isDirectory() ? 0o755 : 0o644;
            try {
                await chmod(fullPath, mode);
            } catch (chmodError) {
                console.error(`设置权限时出错 ${fullPath} to ${mode.toString(8)}: ${chmodError}`);
            }
        }


        // 如果是目录，递归处理
        if (stat.isDirectory()) {
          await setDirectoryPermissions(fullPath);
        }
      }
    }
  } catch (error) {
    // Log the error but don't let it break the entire extraction process
    console.error(`在目录 "${dir}" 中设置权限时发生顶层错误: ${error}`);
  }
}

async function handleExtract(source: string, destination: string = 'current', targetDir?: string): Promise<any> {
  try {
    const sourcePath = path.resolve(source);

    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{ type: "text", text: `错误: 源文件 '${sourcePath}' 不存在。` }],
        isError: true
      };
    }

    let extractDir: string;
    switch (destination) {
      case 'desktop':
        extractDir = getDesktopPath();
        break;
      case 'current':
        extractDir = getCurrentDirectory();
        break;
      case 'specified':
        if (!targetDir) {
          return {
            content: [{ type: "text", text: `错误: 当destination为'specified'时，必须提供target_dir参数。` }],
            isError: true
          };
        }
        extractDir = targetDir;
        break;
      default:
        extractDir = getCurrentDirectory();
    }

    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    const ext = path.extname(sourcePath).toLowerCase();
    let command: string | undefined;

    // Logic for .7z extraction has been removed.
    // Existing logic for other formats (zip, tar, tar.gz)
    if (process.platform === 'win32') {
      if (ext === '.zip') {
        command = `powershell -command "Expand-Archive -Path '${sourcePath}' -DestinationPath '${extractDir}' -Force"`;
      } else if (ext === '.tar') {
        command = `tar -xf '${sourcePath}' -C '${extractDir}'`;
      } else if (ext === '.gz' && sourcePath.endsWith('.tar.gz')) {
        command = `tar -xzf '${sourcePath}' -C '${extractDir}'`;
      } // No 7z handling here anymore
    } else {
      // Unix/Linux commands
      if (ext === '.zip') {
        command = `unzip -o '${sourcePath}' -d '${extractDir}'`; // 添加 -o 覆盖
      } else if (ext === '.tar') {
        command = `tar -xf '${sourcePath}' -C '${extractDir}'`;
      } else if (ext === '.gz' && sourcePath.endsWith('.tar.gz')) {
        command = `tar -xzf '${sourcePath}' -C '${extractDir}'`;
      } // No 7z handling here anymore
    }

    if (!command) {
      return {
        content: [{ type: "text", text: `不支持的文件扩展名: ${ext} (无法确定解压命令). 7z解压已移除.` }],
        isError: true
      };
    }

    console.info(`Executing extraction command: ${command}`);
    await execAsync(command);

    // DEBUG: Check files in extractDir after generic system command execution
    try {
        const filesInExtractDir = fs.readdirSync(extractDir);
        console.error(`DEBUG: 通用系统命令解压后，主机目录 '${extractDir}' 中的文件: ${filesInExtractDir.join(', ') || '[空目录]'} (数量: ${filesInExtractDir.length})`);
        if (filesInExtractDir.length === 0) {
            console.warn(`DEBUG 警告: 通用系统命令解压后，主机目录 '${extractDir}' 为空。`);
        }
    } catch (e: any) {
        console.error(`DEBUG 错误: 通用系统命令解压后，读取主机目录 '${extractDir}' 失败:`, e.message);
    }
    await setDirectoryPermissions(extractDir);
    return {
      content: [{ type: "text", text: `成功解压 '${sourcePath}' 到 '${extractDir}' 并设置了适当的权限` }],
      isError: false
    };

  } catch (error: any) {
    // Use source (function parameter) directly in catch block for robustness in logging,
    // even though sourcePath should be in scope.
    console.error(`解压时发生意外错误 for ${source /* instead of sourcePath */}:`, error.message, error.stack);
    return {
      content: [{ type: "text", text: `解压时发生意外错误: ${error.message}` }],
      isError: true
    };
  }
}

// Server setup
const server = new Server(
  {
    name: "mcp-server/file-compression",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: COMPRESSION_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("MCP Server: Received CallToolRequest:", JSON.stringify(request, null, 2));
  try {
    switch (request.params.name) {
      case "compress": {
        const { source, format, destination } = request.params.arguments as {
          source: string;
          format: string;
          destination?: string;
        };
        return await handleCompress(source, format, destination);
      }

      case "extract": {
        const { source, destination, target_dir } = request.params.arguments as {
          source: string;
          destination?: string;
          target_dir?: string;
        };
        return await handleExtract(source, destination, target_dir);
      }

      default:
        return {
          content: [{
            type: "text",
            text: `未知工具: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File Compression MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});