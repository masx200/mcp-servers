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
import archiver from 'archiver';
import SevenZip from "7z-wasm";




const execAsync = promisify(exec);

// Tool definitions
const COMPRESS_ZIP_TOOL: Tool = {
  name: "compress_zip",
  description: "将文件或文件夹压缩为ZIP格式",
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
      }
    },
    required: ["source"]
  }
};

const COMPRESS_RAR_TOOL: Tool = {
  name: "compress_rar",
  description: "将文件或文件夹压缩为RAR格式",
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
      }
    },
    required: ["source"]
  }
};

const COMPRESS_7Z_TOOL: Tool = {
  name: "compress_7z",
  description: "将文件或文件夹压缩为7Z格式",
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
      }
    },
    required: ["source"]
  }
};

const COMPRESS_TAR_TOOL: Tool = {
  name: "compress_tar",
  description: "将文件或文件夹压缩为TAR格式",
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
      }
    },
    required: ["source"]
  }
};

const COMPRESS_TARGZ_TOOL: Tool = {
  name: "compress_targz",
  description: "将文件或文件夹压缩为TAR.GZ格式",
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
      }
    },
    required: ["source"]
  }
};

const EXTRACT_TOOL: Tool = {
  name: "extract",
  description: "解压缩文件到指定目录",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "要解压的压缩文件路径"
      },
      destination: {
        type: "string",
        description: "解压目标目录，如不指定则解压到当前目录"
      }
    },
    required: ["source"]
  }
};

const EXTRACT_TO_DESKTOP_TOOL: Tool = {
  name: "extract_to_desktop",
  description: "解压缩文件到桌面",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "要解压的压缩文件路径"
      }
    },
    required: ["source"]
  }
};

const EXTRACT_TO_CURRENT_FOLDER_TOOL: Tool = {
  name: "extract_to_current_folder",
  description: "解压缩文件到当前文件夹",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "要解压的压缩文件路径"
      }
    },
    required: ["source"]
  }
};

const COMPRESSION_TOOLS = [
  COMPRESS_ZIP_TOOL,
  COMPRESS_RAR_TOOL,
  COMPRESS_7Z_TOOL,
  COMPRESS_TAR_TOOL,
  COMPRESS_TARGZ_TOOL,
  EXTRACT_TOOL,
  EXTRACT_TO_DESKTOP_TOOL,
  EXTRACT_TO_CURRENT_FOLDER_TOOL
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


async function handleCompressZip(source: string, destination?: string): Promise<any> {
  try {
    const sourcePath = path.resolve(source);
    const destPath = destination ? path.resolve(destination) : getDefaultDestination(sourcePath, 'zip');

    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log('archiver has been finalized and the output file descriptor has closed.');
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
        text: `Successfully compressed to ZIP: ${destPath}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error compressing to ZIP: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleCompressRar(source: string, destination?: string) {
  try {
    if (!destination) {
      destination = getDefaultDestination(source, 'rar');
    } else {
      destination = ensureExtension(destination, 'rar');
    }
    
    // Check if source exists
    if (!fs.existsSync(source)) {
      return {
        content: [{
          type: "text",
          text: `Error: Source file or directory '${source}' does not exist.`
        }],
        isError: true
      };
    }
    
    // RAR requires the rar command-line utility to be installed
    const command = `rar a '${destination}' '${source}'`;
    
    await execAsync(command);
    
    return {
      content: [{
        type: "text",
        text: `Successfully compressed '${source}' to '${destination}'`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `Error compressing to RAR: ${error.message}. Make sure 'rar' command-line utility is installed.`
      }],
      isError: true
    };
  }
}

// 定义SevenZip初始化选项的接口
interface SevenZipOptions {
  locateFile?: (filename: string) => string;
}

async function handleCompress7z(source: string, destination?:any) {
  try {
    console.log("Starting 7z compression...");
    
    // 尝试获取7z-wasm模块路径
    const modulePathAttempt = (() => {
      try {
        return require.resolve('7z-wasm');
      } catch (e) {
        return 'Module path resolution failed';
      }
    })();
    console.log("7z-wasm module path attempt:", modulePathAttempt);
    
    // 尝试检查wasm文件是否存在
    const wasmPath = path.resolve(__dirname, 'node_modules', '7z-wasm', '7zz.wasm');
    console.log("Checking WASM file at:", wasmPath);
    console.log("WASM file exists:", fs.existsSync(wasmPath));
    
    // 初始化选项
    const options: SevenZipOptions = {
      locateFile: (filename: string): string => {
        console.log("Locating file:", filename);
        if (filename.endsWith('.wasm')) {
          console.log("Using WASM path:", wasmPath);
          return wasmPath;
        }
        return filename;
      }
    };

    const sevenZip = await SevenZip(options);
    console.log("SevenZip initialized successfully");
    
    if (!destination) {
      destination = getDefaultDestination(source, '7z');
    } else {
      destination = ensureExtension(destination, '7z');
    }
    
    // 检查源路径是否存在
    if (!fs.existsSync(source)) {
      return {
        content: [{
          type: "text",
          text: `Error: Source file or directory '${source}' does not exist.`
        }],
        isError: true
      };
    }

    // 在Node.js环境中，我们可以直接挂载本地文件系统
    const mountRoot = "/nodefs";
    sevenZip.FS.mkdir(mountRoot);
    
    // 挂载包含源文件的目录
    const sourceParent = path.dirname(path.resolve(source));
    sevenZip.FS.mount(sevenZip.NODEFS, { root: sourceParent }, mountRoot);
    
    // 获取目标文件的绝对路径
    const destinationAbsPath = path.resolve(destination);
    
    // 获取源文件的基本名称
    const sourceBasename = path.basename(source);
    
    // 切换到挂载目录
    sevenZip.FS.chdir(mountRoot);
    
    console.log("Executing 7z command...");
    console.log("Source:", sourceBasename);
    console.log("Destination:", destinationAbsPath);
    
    // 执行7z命令进行压缩
    sevenZip.callMain(["a", destinationAbsPath, sourceBasename]);
    
    return {
      content: [{
        type: "text",
        text: `Successfully compressed '${source}' to '${destinationAbsPath}'`
      }],
      isError: false
    };
  } catch (error: any) {
    console.error("Error details:", error);
    return {
      content: [{
        type: "text",
        text: `Error compressing to 7Z: ${error?.message || 'Unknown error'}`
      }],
      isError: true
    };
  }
}


async function handleCompressTar(source: string, destination?: string) {
  try {
    const sourcePath = path.resolve(source);
    
    if (!destination) {
      destination = getDefaultDestination(sourcePath, 'tar');
    } else {
      destination = ensureExtension(destination, 'tar');
    }
    
    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{
          type: "text",
          text: `Error: Source file or directory '${sourcePath}' does not exist.`
        }],
        isError: true
      };
    }
    
    // 获取源文件/文件夹的基本名称和父目录
    const sourceBasename = path.basename(sourcePath);
    const sourceParent = path.dirname(sourcePath);
    
    // 使用 tar 命令时，先切换到父目录，然后只压缩基本名称
    // 这样可以确保只压缩指定的文件或文件夹，而不是整个路径
    const command = `cd '${sourceParent}' && tar -cf '${destination}' '${sourceBasename}'`;
    
    await execAsync(command);
    
    return {
      content: [{
        type: "text",
        text: `Successfully compressed '${sourcePath}' to '${destination}'`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `Error compressing to TAR: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleCompressTarGz(source: string, destination?: string) {
  try {
    const sourcePath = path.resolve(source);
    
    if (!destination) {
      destination = getDefaultDestination(sourcePath, 'tar.gz');
    } else {
      if (!destination.endsWith('.tar.gz')) {
        destination = `${destination}.tar.gz`;
      }
    }
    
    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      return {
        content: [{
          type: "text",
          text: `Error: Source file or directory '${sourcePath}' does not exist.`
        }],
        isError: true
      };
    }
    
    // 获取源文件/文件夹的基本名称和父目录
    const sourceBasename = path.basename(sourcePath);
    const sourceParent = path.dirname(sourcePath);
    
    // 使用 tar 命令时，先切换到父目录，然后只压缩基本名称
    // 这样可以确保只压缩指定的文件或文件夹，而不是整个路径
    const command = `cd '${sourceParent}' && tar -czf '${destination}' '${sourceBasename}'`;
    
    await execAsync(command);
    
    return {
      content: [{
        type: "text",
        text: `Successfully compressed '${sourcePath}' to '${destination}'`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `Error compressing to TAR.GZ: ${error.message}`
      }],
      isError: true
    };
  }
}


async function handleExtract(source: string, destination?: string) {
  try {
    // Check if source exists
    if (!fs.existsSync(source)) {
      return {
        content: [{
          type: "text",
          text: `Error: Source file '${source}' does not exist.`
        }],
        isError: true
      };
    }
    
    // If destination is not specified, extract to the same directory as the source
    if (!destination) {
      destination = path.dirname(source);
    }
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    let command;
    const ext = path.extname(source).toLowerCase();
    
    if (process.platform === 'win32') {
      // Windows commands
      if (ext === '.zip') {
        command = `powershell -command "Expand-Archive -Path '${source}' -DestinationPath '${destination}' -Force"`;
      } else if (ext === '.rar') {
        command = `unrar x '${source}' '${destination}'`;
      } else if (ext === '.7z') {
        command = `7z x '${source}' -o'${destination}'`;
      } else if (ext === '.tar') {
        command = `tar -xf '${source}' -C '${destination}'`;
      } else if (ext === '.gz' && source.endsWith('.tar.gz')) {
        command = `tar -xzf '${source}' -C '${destination}'`;
      } else {
        return {
          content: [{
            type: "text",
            text: `Unsupported file extension: ${ext}`
          }],
          isError: true
        };
      }
    } else {
      // Unix/Linux commands
      if (ext === '.zip') {
        command = `unzip '${source}' -d '${destination}'`;
      } else if (ext === '.rar') {
        command = `unrar x '${source}' '${destination}'`;
      } else if (ext === '.7z') {
        command = `7z x '${source}' -o'${destination}'`;
      } else if (ext === '.tar') {
        command = `tar -xf '${source}' -C '${destination}'`;
      } else if (ext === '.gz' && source.endsWith('.tar.gz')) {
        command = `tar -xzf '${source}' -C '${destination}'`;
      } else {
        return {
          content: [{
            type: "text",
            text: `Unsupported file extension: ${ext}`
          }],
          isError: true
        };
      }
    }
    
    await execAsync(command);
    
    return {
      content: [{
        type: "text",
        text: `Successfully extracted '${source}' to '${destination}'`
      }],
      isError: false
    };
  } catch (error:any) {
    return {
      content: [{
        type: "text",
        text: `Error extracting file: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleExtractToDesktop(source:any) {
  const desktopPath = getDesktopPath();
  return handleExtract(source, desktopPath);
}

async function handleExtractToCurrentFolder(source:any) {
  const currentDir = getCurrentDirectory();
  return handleExtract(source, currentDir);
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
  try {
    switch (request.params.name) {
      case "compress_zip": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleCompressZip(source, destination);
      }
      
      case "compress_rar": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleCompressRar(source, destination);
      }
      
      case "compress_7z": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleCompress7z(source, destination);
      }
      
      case "compress_tar": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleCompressTar(source, destination);
      }
      
      case "compress_targz": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleCompressTarGz(source, destination);
      }
      
      case "extract": {
        const { source, destination } = request.params.arguments as { 
          source: string;
          destination?: string;
        };
        return await handleExtract(source, destination);
      }
      
      case "extract_to_desktop": {
        const { source } = request.params.arguments as { source: string };
        return await handleExtractToDesktop(source);
      }
      
      case "extract_to_current_folder": {
        const { source } = request.params.arguments as { source: string };
        return await handleExtractToCurrentFolder(source);
      }
      
      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
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
