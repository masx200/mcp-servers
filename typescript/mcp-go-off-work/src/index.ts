#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import * as os from "os";

// 日志记录函数
function logMessage(message: string, level: "INFO" | "ERROR" = "INFO") {
  console.error(`[${new Date().toISOString()}] [${level}] ${message}`);
}

type ToolResult = {
  content: {
      type: "text";
      text: string;
  }[];
  isError?: undefined;
  errorMessage?: undefined;
};

const SHUTDOWN_SYSTEM_TOOL: Tool = {
    name: "shutdown_system",
    description: "关闭系统",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "关机前的延迟（秒）" },
            force: { type: "boolean", description: "强制关机，无需确认" }
        }
    }
};

const SLEEP_SYSTEM_TOOL: Tool = {
    name: "sleep_system",
    description: "让系统进入睡眠模式",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "进入睡眠前的延迟（秒，默认 0）" }
        }
    }
};

const HIBERNATE_SYSTEM_TOOL: Tool = {
    name: "hibernate_system", 
    description: "让系统进入休眠模式",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "进入休眠前的延迟（秒，默认 0）" }
        }
    }
};

const LOCK_SCREEN_TOOL: Tool = {
    name: "lock_screen",
    description: "锁定屏幕",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "锁定前的延迟（秒，默认 0）" }
        }
    }
};

const RESTART_SYSTEM_TOOL: Tool = {
    name: "restart_system",
    description: "重启系统",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "重启前的延迟（秒，默认 0）" },
            force: { type: "boolean", description: "强制重启，无需确认" }
        }
    }
};

const TURN_OFF_DISPLAY_TOOL: Tool = {
    name: "turn_off_display",
    description: "关闭显示器",
    inputSchema: {
        type: "object",
        properties: {
            delay: { type: "number", description: "关闭显示器前的延迟（秒，默认 0）" }
        }
    }
};


const TOOLS: readonly Tool[] = [
    SHUTDOWN_SYSTEM_TOOL,
    SLEEP_SYSTEM_TOOL,
    HIBERNATE_SYSTEM_TOOL,
    LOCK_SCREEN_TOOL,
    RESTART_SYSTEM_TOOL,
    TURN_OFF_DISPLAY_TOOL,
];

async function executeWithDelay(cmd: string, delay: number = 0): Promise<ToolResult> {
    return new Promise((resolve) => {
        const execute = () => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        content: [{ type: "text", text: `执行命令失败: ${error.message}` }]
                    });
                    return;
                }
                resolve({
                    content: [{ type: "text", text: stdout || "命令执行成功" }]
                });
            });
        };

        if (delay > 0) {
            setTimeout(execute, delay * 1000);
            resolve({
                content: [{ type: "text", text: `命令将在 ${delay} 秒后执行` }]
            });
        } else {
            execute();
        }
    });
}

async function handleShutdownSystem({ delay = 0, force = false }: {delay?: number, force?: boolean}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    logMessage(`关机命令: 延迟: ${delay}s, 强制: ${force}`, "INFO");
    
    if (platform === 'win32') {
        cmd = `shutdown /s${force ? ' /f' : ''} /t ${delay}`;
    } else if (platform === 'darwin') {
        const forceFlag = force ? ' with force' : '';
        cmd = `osascript -e 'tell app "System Events" to shut down${forceFlag}'`;
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    } else {
        cmd = `shutdown -h +${Math.floor(delay / 60)}${force ? ' now' : ''}`;
    }

    return executeWithDelay(cmd, 0);
}

async function handleSleepSystem({ delay = 0 }: {delay?: number}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
    } else if (platform === 'darwin') {
        cmd = 'pmset sleepnow';
    } else {
        cmd = 'systemctl suspend';
    }
    
    return executeWithDelay(cmd, delay);
}

async function handleHibernateSystem({ delay = 0 }: {delay?: number}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = 'shutdown /h';
    } else if (platform === 'darwin') {
        cmd = `osascript -e 'tell application "System Events" to sleep'`;
    } else {
        cmd = 'systemctl hibernate';
    }
    
    return executeWithDelay(cmd, delay);
}

async function handleLockScreen({ delay = 0 }: {delay?: number}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = 'rundll32.exe user32.dll,LockWorkStation';
    } else if (platform === 'darwin') {
        cmd = `osascript -e 'tell application "System Events" to keystroke "q" using {control down, command down}'`;
    } else {
        cmd = 'xdg-screensaver lock || gnome-screensaver-command -l || xscreensaver-command -lock';
    }
    
    return executeWithDelay(cmd, delay);
}

async function handleRestartSystem({ delay = 0, force = false }: {delay?: number, force?: boolean}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    logMessage(`重启命令: 延迟: ${delay}s, 强制: ${force}`, "INFO");
    
    if (platform === 'win32') {
        cmd = `shutdown /r${force ? ' /f' : ''} /t ${delay}`;
    } else if (platform === 'darwin') {
        const forceFlag = force ? ' with force' : '';
        cmd = `osascript -e 'tell app "System Events" to restart${forceFlag}'`;
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    } else {
        cmd = `shutdown -r +${Math.floor(delay / 60)}${force ? ' now' : ''}`;
    }

    return executeWithDelay(cmd, 0);
}

async function handleTurnOffDisplay({ delay = 0 }: {delay?: number}): Promise<ToolResult> {
    const platform = os.platform();
    let cmd = '';
    
    if (platform === 'win32') {
        cmd = `powershell -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern int SendMessage(int hWnd, int hMsg, int wParam, int lParam);}'; [Win32]::SendMessage(-1, 0x0112, 0xF170, 2)"`;
    } else if (platform === 'darwin') {
        cmd = 'pmset displaysleepnow';
    } else {
        cmd = 'xset dpms force off';
    }
    
    return executeWithDelay(cmd, delay);
}



const server = new Server(
  {
    name: "mcp-go-off-work",
    version: "1.0.0",
    description: "一个方便的 MCP 服务器，用于处理下班后的例行程序。可用操作：关机、睡眠、休眠、锁定屏幕、重启、关闭显示器、静音通知、将状态设置为离开、启动放松应用以及运行系统清理。"
  },
  {
    capabilities: {
      tools: TOOLS.reduce((acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      }, {} as Record<string, Tool>),
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const toolInput = request.params.arguments;

    switch (toolName) {
        case "shutdown_system":
            return await handleShutdownSystem(toolInput as any);
        case "sleep_system":
            return await handleSleepSystem(toolInput as any);
        case "hibernate_system":
            return await handleHibernateSystem(toolInput as any);
        case "lock_screen":
            return await handleLockScreen(toolInput as any);
        case "restart_system":
            return await handleRestartSystem(toolInput as any);
        case "turn_off_display":
            return await handleTurnOffDisplay(toolInput as any);
        default:
            return {
                content: [],
                isError: true,
                errorMessage: `未找到工具 '${toolName}'。`,
            };
    }
});

// 启动服务器
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logMessage("MCP 下班服务器已成功启动，并加载了所有下班工具。", "INFO");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`启动 MCP 下班服务器失败: ${errorMessage}`, "ERROR");
    process.exit(1);
  }
}

runServer();
