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
import * as os from 'os';
import { UniversalAppController, ControlMethod, WindowBounds, ControlResult, PermissionStatus, AppController } from './controllers/UniversalAppController.js';

const execAsync = promisify(exec);

// --- Tool Definitions ---
const outputSchema = {
  type: "object" as const,
  description: "操作结果",
  properties: {
    status: {
      type: "string",
      description: "操作结果，'success' 或 'error'。",
    },
    message: {
      type: "string",
      description: "额外的信息或错误详情。",
    },
  },
};

const inputSchema = {
  type: "object" as const,
  properties: {},
};

const setWindowLeftHalf: Tool = {
  name: "set_window_left_half",
  description: "将当前窗口置于屏幕左半边。",
  inputSchema,
  outputSchema,
};

const setWindowRightHalf: Tool = {
  name: "set_window_right_half",
  description: "将当前窗口置于屏幕右半边。",
  inputSchema,
  outputSchema,
};

const setWindowTopHalf: Tool = {
  name: "set_window_top_half",
  description: "将当前窗口置于屏幕上半边。",
  inputSchema,
  outputSchema,
};

const setWindowBottomHalf: Tool = {
  name: "set_window_bottom_half",
  description: "将当前窗口置于屏幕下半边。",
  inputSchema,
  outputSchema,
};

const maximizeWindow: Tool = {
  name: "maximize_window",
  description: "最大化当前窗口。",
  inputSchema,
  outputSchema,
};

const minimizeWindow: Tool = {
  name: "minimize_window",
  description: "最小化当前窗口。",
  inputSchema,
  outputSchema,
};

const fullscreenWindow: Tool = {
  name: "fullscreen_window",
  description: "全屏当前窗口。",
  inputSchema,
  outputSchema,
};



const TOOLS: readonly Tool[] = [
  setWindowLeftHalf,
  setWindowRightHalf,
  setWindowTopHalf,
  setWindowBottomHalf,
  maximizeWindow,
  minimizeWindow,
  fullscreenWindow,
];

// --- Universal Window Control ---

// 支持的应用程序控制器配置
const APP_CONTROLLERS: AppController[] = [
  {
    name: "Google Chrome",
    aliases: ["chrome", "google chrome"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Google Chrome" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    },
    getKeyboardShortcut: (action: string) => {
      if (action.includes('left') || action.includes('right')) {
        return `tell application "System Events" to keystroke "left" using {control down, option down}`;
      }
      return null;
    }
  },
  {
    name: "Safari",
    aliases: ["safari"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Safari" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Firefox",
    aliases: ["firefox"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Firefox" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Visual Studio Code",
    aliases: ["visual studio code", "code", "vscode"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Visual Studio Code" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Terminal",
    aliases: ["terminal"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Terminal" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "iTerm2",
    aliases: ["iterm2", "iterm"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "iTerm2" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Finder",
    aliases: ["finder"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Finder" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "PyCharm",
    aliases: ["pycharm", "pycharm professional", "pycharm community"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "PyCharm" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "IntelliJ IDEA",
    aliases: ["intellij idea", "idea", "intellij"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "IntelliJ IDEA" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "WebStorm",
    aliases: ["webstorm"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "WebStorm" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Xcode",
    aliases: ["xcode"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Xcode" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Sublime Text",
    aliases: ["sublime text", "sublime"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Sublime Text" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "Atom",
    aliases: ["atom"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      return `tell application "Atom" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
    }
  },
  {
    name: "WPS Office",
    aliases: ["wpsoffice", "wps office", "wps"],
    supportsDirectControl: true,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      // WPS Office 可能需要特殊的窗口控制方法
      return `tell application "System Events"
        tell (first process whose name is "wpsoffice")
          try
            set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
          on error
            try
              set position of front window to {${x}, ${y}}
              delay 0.1
              set size of front window to {${width}, ${height}}
            end try
          end try
        end tell
      end tell`;
    },
    getKeyboardShortcut: (action: string) => {
      // WPS Office 支持标准的窗口管理快捷键
      if (action.includes('left')) {
        return `tell application "System Events" to keystroke "left" using {control down, option down}`;
      } else if (action.includes('right')) {
        return `tell application "System Events" to keystroke "right" using {control down, option down}`;
      }
      return null;
    }
  }
];

// 初始化通用应用程序控制器
const universalController = new UniversalAppController(APP_CONTROLLERS);

// 检查应用程序是否需要特殊处理
function needsAppSpecificHandling(appName: string): boolean {
  const lowerAppName = appName.toLowerCase();
  return APP_CONTROLLERS.some(controller =>
    controller.aliases.some(alias => lowerAppName.includes(alias.toLowerCase()))
  );
}

// 获取应用程序控制器
function getAppController(appName: string): AppController | null {
  const lowerAppName = appName.toLowerCase();
  return APP_CONTROLLERS.find(controller =>
    controller.aliases.some(alias => lowerAppName.includes(alias.toLowerCase()))
  ) || null;
}

// 键盘快捷键备用方案
const KEYBOARD_SHORTCUTS: Record<string, string> = {
  'set-window-left-half': 'tell application "System Events" to keystroke "left" using {control down, option down}',
  'set-window-right-half': 'tell application "System Events" to keystroke "right" using {control down, option down}',
  'maximize-window': 'tell application "System Events" to keystroke "f" using {control down, command down}',
  'minimize-window': 'tell application "System Events" to keystroke "m" using {command down}',
};

// 无权限替代方案 - 使用 Dock 和菜单栏
async function useAlternativeMethod(action: string): Promise<any> {
  try {
    console.error("尝试使用无权限替代方案");

    // 尝试使用键盘快捷键
    const shortcut = KEYBOARD_SHORTCUTS[action];
    if (shortcut) {
      console.error(`使用键盘快捷键: ${action}`);
      await execAsync(`osascript -e '${shortcut}'`);

      return {
        structuredContent: {
          status: "success",
          message: `使用键盘快捷键成功执行: ${action}`
        },
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `使用键盘快捷键成功执行: ${action}`,
            method: "keyboard_shortcut"
          })
        }],
        isError: false,
      };
    }

    // 如果没有对应的快捷键，提供用户指导
    const instructions = getManualInstructions(action);
    return {
      structuredContent: {
        status: "manual_required",
        message: instructions
      },
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "manual_required",
          message: instructions,
          method: "manual_instruction"
        })
      }],
      isError: false,
    };

  } catch (error) {
    console.error("替代方案也失败了:", error);
    throw error;
  }
}

// 获取手动操作指导
function getManualInstructions(action: string): string {
  const instructions: Record<string, string> = {
    'set-window-left-half': '请手动操作：按住 Control + Option + 左箭头键，或拖拽窗口到屏幕左边缘',
    'set-window-right-half': '请手动操作：按住 Control + Option + 右箭头键，或拖拽窗口到屏幕右边缘',
    'set-window-top-half': '请手动操作：拖拽窗口到屏幕上边缘',
    'set-window-bottom-half': '请手动操作：拖拽窗口到屏幕下边缘',
    'maximize-window': '请手动操作：按住 Control + Command + F，或点击窗口左上角的绿色按钮',
    'minimize-window': '请手动操作：按 Command + M，或点击窗口左上角的黄色按钮',
    'fullscreen-window': '请手动操作：按 Control + Command + F，或点击窗口左上角的绿色按钮'
  };

  return instructions[action] || `请手动执行窗口操作: ${action}`;
}

// 新的通用窗口操作函数 - 使用通用控制器
async function controlWindowUniversal(action: string, bounds: WindowBounds): Promise<any> {
  try {
    const result = await universalController.controlWindow(action, bounds);

    if (result.success) {
      return {
        structuredContent: {
          status: "success",
          message: result.message
        },
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: result.message,
            method: result.method
          })
        }],
        isError: false,
      };
    } else {
      return {
        structuredContent: {
          status: "error",
          message: result.message
        },
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: result.message,
            method: result.method,
            error: result.error
          })
        }],
        isError: true,
        errorMessage: result.message,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          message: `窗口控制失败: ${errorMessage}`
        })
      }],
      isError: true,
      errorMessage: `窗口控制失败: ${errorMessage}`,
    };
  }
}

// 改进的窗口操作函数 - 使用新的应用程序控制器系统 (保留向后兼容)
async function moveAndResizeWindow(bounds: WindowBounds, action: string = ""): Promise<any> {
  const { x, y, width, height } = bounds;
  let currentApp = "";

  try {
    currentApp = await universalController.getCurrentApplication();
  } catch (error) {
    console.error("无法获取当前应用程序:", error);
    // 如果无法获取当前应用程序，尝试使用替代方案
    return await useAlternativeMethod(action);
  }

  console.error(`当前应用程序: ${currentApp}`);
  console.error(`目标位置: (${x}, ${y}), 大小: ${width}x${height}`);

  // 获取应用程序控制器
  const controller = getAppController(currentApp);

  if (controller && controller.supportsDirectControl) {
    console.error(`检测到 ${currentApp} 有专用控制器，使用优化方法`);

    try {
      const script = controller.getWindowScript(action, bounds);
      console.error(`尝试专用控制器脚本`);
      const { stdout } = await execAsync(`osascript -e '${script}'`);

      // 检查是否成功（大多数 AppleScript 成功时不返回内容）
      if (!stdout.includes("error")) {
        console.error(`✅ 专用控制器成功`);
        return {
          structuredContent: {
            status: "success",
            message: `窗口位置调整成功（专用控制器: ${controller.name}）`
          },
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: `窗口位置调整成功（专用控制器: ${controller.name}）`,
              method: "app_specific_controller"
            })
          }],
          isError: false,
        };
      } else {
        console.error(`❌ 专用控制器失败: ${stdout}`);
      }
    } catch (error) {
      console.error(`❌ 专用控制器执行出错:`, error);
    }

    // 如果专用控制器失败，尝试键盘快捷键
    if (controller.getKeyboardShortcut) {
      try {
        const shortcutScript = controller.getKeyboardShortcut(action);
        if (shortcutScript) {
          console.error(`尝试应用程序特定的键盘快捷键`);
          await execAsync(`osascript -e '${shortcutScript}'`);
          return {
            structuredContent: {
              status: "success",
              message: `使用键盘快捷键成功（${controller.name}）`
            },
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                message: `使用键盘快捷键成功（${controller.name}）`,
                method: "app_specific_keyboard"
              })
            }],
            isError: false,
          };
        }
      } catch (error) {
        console.error(`❌ 应用程序特定键盘快捷键失败:`, error);
      }
    }
  }

  // 如果没有专用控制器或专用控制器失败，尝试通用方法
  console.error("尝试通用应用程序控制方法");

  const genericMethods = [
    {
      name: `${currentApp} 通用 bounds 设置`,
      script: `tell application "${currentApp}"
                 try
                   set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
                   return "success"
                 on error errorMsg
                   return "error: " & errorMsg
                 end try
               end tell`
    },
    {
      name: `${currentApp} 通用分步设置`,
      script: `tell application "${currentApp}"
                 try
                   set position of front window to {${x}, ${y}}
                   delay 0.1
                   set size of front window to {${width}, ${height}}
                   return "success"
                 on error errorMsg
                   return "error: " & errorMsg
                 end try
               end tell`
    }
  ];

  for (let i = 0; i < genericMethods.length; i++) {
    try {
      console.error(`尝试 ${genericMethods[i].name}`);
      const { stdout } = await execAsync(`osascript -e '${genericMethods[i].script}'`);

      if (stdout.includes("success")) {
        console.error(`✅ ${genericMethods[i].name} 成功`);
        return {
          structuredContent: {
            status: "success",
            message: `窗口位置调整成功（${genericMethods[i].name}）`
          },
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: `窗口位置调整成功（${genericMethods[i].name}）`,
              method: "generic_applescript"
            })
          }],
          isError: false,
        };
      } else {
        console.error(`❌ ${genericMethods[i].name} 失败: ${stdout}`);
      }
    } catch (error) {
      console.error(`❌ ${genericMethods[i].name} 执行出错:`, error);
    }
  }

  // 如果通用方法也失败，尝试 System Events（需要权限）
  console.error("尝试 System Events 方法（需要辅助功能权限）");

  const systemEventsMethods = [
    {
      name: "System Events 直接操作",
      script: `tell application "System Events"
                 tell (first process whose frontmost is true)
                   try
                     set position of front window to {${x}, ${y}}
                     set size of front window to {${width}, ${height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell
               end tell`
    },
    {
      name: "System Events 分步操作",
      script: `tell application "System Events"
                 tell (first process whose frontmost is true)
                   try
                     set the position of the front window to {${x}, ${y}}
                     delay 0.2
                     set the size of the front window to {${width}, ${height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell
               end tell`
    },
    {
      name: "System Events bounds 操作",
      script: `tell application "System Events"
                 tell (first process whose frontmost is true)
                   try
                     set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell
               end tell`
    }
  ];

  for (let i = 0; i < systemEventsMethods.length; i++) {
    try {
      console.error(`尝试 ${systemEventsMethods[i].name}`);
      const { stdout } = await execAsync(`osascript -e '${systemEventsMethods[i].script}'`);

      if (stdout.includes("success")) {
        console.error(`✅ ${systemEventsMethods[i].name} 成功`);
        return {
          structuredContent: {
            status: "success",
            message: `窗口位置调整成功（${systemEventsMethods[i].name}）`
          },
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: `窗口位置调整成功（${systemEventsMethods[i].name}）`,
              method: "system_events"
            })
          }],
          isError: false,
        };
      } else {
        console.error(`❌ ${systemEventsMethods[i].name} 失败: ${stdout}`);
      }
    } catch (error) {
      console.error(`❌ ${systemEventsMethods[i].name} 执行出错:`, error);

      // 检查是否是权限问题
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('-1719') || errorMsg.includes('不允许辅助访问') || errorMsg.includes('not allowed assistive access')) {
        console.error("检测到权限问题，尝试替代方案");
        return await useAlternativeMethod(action);
      }
    }
  }

  // 所有 AppleScript 方法都失败，尝试替代方案
  console.error("所有 AppleScript 方法都失败，尝试替代方案");
  return await useAlternativeMethod(action);
}

// 计算窗口边界
function calculateMacOSWindowBounds(action: string, screenWidth: number, screenHeight: number): WindowBounds {
  const halfWidth = Math.floor(screenWidth / 2);
  const halfHeight = Math.floor(screenHeight / 2);
  const menuBarHeight = 25;

  switch (action) {
    case setWindowLeftHalf.name:
      return { x: 0, y: menuBarHeight, width: halfWidth, height: screenHeight - menuBarHeight };
    case setWindowRightHalf.name:
      return { x: halfWidth, y: menuBarHeight, width: halfWidth, height: screenHeight - menuBarHeight };
    case setWindowTopHalf.name:
      return { x: 0, y: menuBarHeight, width: screenWidth, height: halfHeight };
    case setWindowBottomHalf.name:
      return { x: 0, y: halfHeight, width: screenWidth, height: halfHeight };
    case maximizeWindow.name:
      return { x: 0, y: menuBarHeight, width: screenWidth, height: screenHeight - menuBarHeight };
    default:
      throw new Error(`未知操作: ${action}`);
  }
}

// 检查辅助功能权限
async function checkAccessibilityPermission(): Promise<boolean> {
  try {
    const testScript = `tell application "System Events" to return "test"`;
    await execAsync(`osascript -e '${testScript}'`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('-1719') || errorMsg.includes('不允许辅助访问') || errorMsg.includes('not allowed assistive access')) {
      return false;
    }
    return true; // 其他错误认为有权限
  }
}

// 检查应用程序是否支持窗口控制
async function checkAppWindowControlSupport(appName: string): Promise<boolean> {
  try {
    // 测试是否能获取窗口信息
    const testScript = `tell application "${appName}" to return count of windows`;
    await execAsync(`osascript -e '${testScript}'`);
    return true;
  } catch (error) {
    console.error(`应用程序 ${appName} 不支持直接窗口控制:`, error);
    return false;
  }
}

// 获取详细的权限状态和应用程序支持信息
async function getPermissionStatus(): Promise<{
  hasAccessibility: boolean;
  canControlCurrentApp: boolean;
  currentApp: string;
  hasAppController: boolean;
  controllerType: string;
  suggestions: string[];
}> {
  const currentApp = await universalController.getCurrentApplication().catch(() => "未知应用");
  const hasAccessibility = await checkAccessibilityPermission();
  const controller = getAppController(currentApp);
  const hasAppController = controller !== null;
  const canControlCurrentApp = hasAppController || (hasAccessibility && await checkAppWindowControlSupport(currentApp));

  const suggestions: string[] = [];
  let controllerType = "none";

  if (hasAppController) {
    controllerType = "app_specific";
    suggestions.push(`✅ 检测到 "${currentApp}" 有专用控制器，支持无权限操作`);
  } else if (hasAccessibility) {
    controllerType = "system_events";
    suggestions.push(`✅ 有辅助功能权限，可以使用 System Events 控制窗口`);
  } else {
    controllerType = "alternative";
    suggestions.push("⚠️ 没有辅助功能权限，将使用替代方案（键盘快捷键或手动指导）");
    suggestions.push("💡 要获得最佳体验，请在 系统设置 > 隐私与安全性 > 辅助功能 中为您的终端应用授权");
  }

  if (!hasAppController && hasAccessibility && !canControlCurrentApp) {
    suggestions.push(`⚠️ 当前应用 "${currentApp}" 可能不支持窗口控制，将尝试替代方案`);
  }

  // 添加应用程序特定的建议
  if (!hasAppController) {
    suggestions.push("💡 支持专用控制器的应用程序：Chrome, Safari, Firefox, VS Code, Terminal, iTerm2, Finder, PyCharm, IntelliJ IDEA, WebStorm");
    suggestions.push("💡 切换到这些应用程序可获得更好的窗口控制体验");
  }

  return {
    hasAccessibility,
    canControlCurrentApp,
    currentApp,
    hasAppController,
    controllerType,
    suggestions
  };
}

// 引导用户开启辅助功能权限
async function promptForAccessibilityPermission() {
  console.error("权限不足，正在尝试打开系统设置...");
  const script = 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"';
  try {
    await execAsync(script);
    console.error("成功发送打开系统设置的命令。");
  } catch (e) {
    console.error("打开新版系统设置失败，尝试旧版方法...", e);
    // Fallback for older macOS versions
    const fallbackScript = 'tell application "System Preferences" to activate & reveal anchor "Privacy_Accessibility" of pane id "com.apple.preference.security"';
    try {
      await execAsync(`osascript -e '${fallbackScript}'`);
      console.error("成功发送打开旧版系统设置的命令。");
    } catch (fallbackError) {
      console.error("打开系统设置的所有方法都失败了。", fallbackError);
    }
  }
}

// 使用键盘快捷键作为备用方法
async function useKeyboardShortcuts(action: string): Promise<any> {
  console.error(`尝试使用键盘快捷键执行: ${action}`);

  try {
    let shortcutScript = '';

    switch (action) {
      case setWindowLeftHalf.name:
        // 使用 Rectangle 或 Magnet 等窗口管理工具的快捷键
        shortcutScript = `tell application "System Events"
          keystroke "left" using {control down, option down}
        end tell`;
        break;

      case setWindowRightHalf.name:
        shortcutScript = `tell application "System Events"
          keystroke "right" using {control down, option down}
        end tell`;
        break;

      case maximizeWindow.name:
        // 尝试双击标题栏或使用快捷键
        shortcutScript = `tell application "System Events"
          keystroke "f" using {control down, command down}
        end tell`;
        break;

      case minimizeWindow.name:
        shortcutScript = `tell application "System Events"
          keystroke "m" using {command down}
        end tell`;
        break;

      default:
        throw new Error(`不支持的键盘快捷键操作: ${action}`);
    }

    await execAsync(`osascript -e '${shortcutScript}'`);

    return {
      structuredContent: {
        status: "success",
        message: `已尝试使用键盘快捷键执行 ${action}。如果没有效果，请安装 Rectangle 或 Magnet 等窗口管理工具。`
      },
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "success",
          message: `已尝试使用键盘快捷键执行 ${action}。如果没有效果，请安装 Rectangle 或 Magnet 等窗口管理工具。`
        })
      }],
      isError: false,
    };

  } catch (error) {
    console.error("键盘快捷键方法也失败了:", error);
    throw error;
  }
}

// 处理特殊窗口操作（最小化、全屏）
async function handleSpecialWindowAction(action: string) {
  try {
    const currentApp = await universalController.getCurrentApplication();
    console.error(`执行特殊操作 ${action}，当前应用程序: ${currentApp}`);

    if (action === minimizeWindow.name) {
      // 最小化窗口的多种方法
      const minimizeMethods = [
        {
          name: "System Events miniaturized",
          script: `tell application "System Events"
                     tell (first process whose frontmost is true)
                       set miniaturized of front window to true
                     end tell
                   end tell`
        },
        {
          name: "键盘快捷键 Command+M",
          script: `tell application "System Events"
                     keystroke "m" using {command down}
                   end tell`
        },
        {
          name: "应用程序特定最小化",
          script: `tell application "${currentApp}"
                     try
                       set miniaturized of front window to true
                     end try
                   end tell`
        }
      ];

      for (let i = 0; i < minimizeMethods.length; i++) {
        try {
          console.error(`尝试最小化方法 ${i + 1}: ${minimizeMethods[i].name}`);
          await execAsync(`osascript -e '${minimizeMethods[i].script}'`);
          const successMessage = `窗口已成功最小化（${minimizeMethods[i].name}）`;
          return {
            structuredContent: { status: "success", message: successMessage },
            content: [{ type: "text", text: JSON.stringify({ status: "success", message: successMessage }) }],
            isError: false,
          };
        } catch (error) {
          console.error(`最小化方法 ${i + 1} 失败:`, error);
        }
      }
    } else if (action === fullscreenWindow.name) {
      // 全屏的多种方法
      const fullscreenMethods = [
        {
          name: "Control+Command+F 快捷键",
          script: `tell application "System Events"
                     keystroke "f" using {control down, command down}
                   end tell`
        },
        {
          name: "点击全屏按钮",
          script: `tell application "System Events"
                     tell (first process whose frontmost is true)
                       click button 3 of front window
                     end tell
                   end tell`
        }
      ];

      for (let i = 0; i < fullscreenMethods.length; i++) {
        try {
          console.error(`尝试全屏方法 ${i + 1}: ${fullscreenMethods[i].name}`);
          await execAsync(`osascript -e '${fullscreenMethods[i].script}'`);
          const successMessage = `窗口已成功全屏（${fullscreenMethods[i].name}）`;
          return {
            structuredContent: { status: "success", message: successMessage },
            content: [{ type: "text", text: JSON.stringify({ status: "success", message: successMessage }) }],
            isError: false,
          };
        } catch (error) {
          console.error(`全屏方法 ${i + 1} 失败:`, error);
        }
      }
    }

    throw new Error(`未知的特殊操作: ${action}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`特殊窗口操作失败:`, errorMessage);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          message: `特殊窗口操作失败: ${errorMessage}`
        })
      }],
      isError: true,
      errorMessage: `执行特殊窗口操作失败: ${errorMessage}`,
    };
  }
}

// 主要的窗口操作处理函数
async function handleWindowAction(action: string) {
  if (isWin) {
    return await handleWindowsWindowAction(action);
  }

  try {
    // 获取详细的权限状态
    const permissionStatus = await getPermissionStatus();
    console.error(`权限状态检查:`, permissionStatus);

    // 如果完全没有辅助功能权限，尝试键盘快捷键
    if (!permissionStatus.hasAccessibility) {
      console.error("没有辅助功能权限，尝试使用键盘快捷键...");
      try {
        return await useKeyboardShortcuts(action);
      } catch (shortcutError) {
        console.error("键盘快捷键方法失败，提示用户授权:", shortcutError);
        await promptForAccessibilityPermission();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: `权限不足且备用方法失败。建议：\n${permissionStatus.suggestions.join('\n')}\n\n或者安装 Rectangle、Magnet 等窗口管理工具并使用其快捷键。`
            })
          }],
          isError: true,
          errorMessage: "权限不足且备用方法失败",
        };
      }
    }

    // 如果有权限但当前应用不支持，给出更具体的建议
    if (!permissionStatus.canControlCurrentApp) {
      console.error(`当前应用 ${permissionStatus.currentApp} 不支持窗口控制，尝试备用方法...`);
      try {
        return await useKeyboardShortcuts(action);
      } catch (shortcutError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: `当前应用 "${permissionStatus.currentApp}" 不支持窗口控制。建议：\n${permissionStatus.suggestions.join('\n')}`
            })
          }],
          isError: true,
          errorMessage: `应用 ${permissionStatus.currentApp} 不支持窗口控制`,
        };
      }
    }

    // 获取屏幕尺寸
    const getScreenDimScript = `tell application "Finder" to get bounds of window of desktop`;
    const { stdout: screenBounds } = await execAsync(`osascript -e '${getScreenDimScript}'`);
    const [,, screenWidth, screenHeight] = screenBounds.trim().split(", ").map(Number);

    // 处理特殊操作
    if ([minimizeWindow.name, fullscreenWindow.name].includes(action)) {
      return await handleSpecialWindowAction(action);
    }

    // 计算窗口边界
    const bounds = calculateMacOSWindowBounds(action, screenWidth, screenHeight);

    // 使用窗口操作函数
    return await moveAndResizeWindow(bounds, action);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`执行窗口操作 '${action}' 失败:`, errorMessage);

    // 最后尝试键盘快捷键作为备用
    try {
      console.error("主要方法失败，最后尝试键盘快捷键...");
      return await useKeyboardShortcuts(action);
    } catch (shortcutError) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: `所有方法都失败了: ${errorMessage}\n\n建议：\n1. 检查系统设置 > 隐私与安全性 > 辅助功能\n2. 安装 Rectangle 或 Magnet 等窗口管理工具\n3. 尝试切换到其他应用程序`
            }),
          },
        ],
        isError: true,
        errorMessage: `执行窗口操作失败: ${errorMessage}`,
      };
    }
  }
}



// --- Windows Support ---
const isWin = os.platform() === 'win32';

async function handleWindowsWindowAction(action: string) {
  try {
    let powershellScript = '';

    switch (action) {
      case setWindowLeftHalf.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
$halfWidth = [math]::Floor($screenWidth / 2)
[Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, $halfWidth, $screenHeight, 0x0040)
Write-Output "success"`;
        break;

      case setWindowRightHalf.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
$halfWidth = [math]::Floor($screenWidth / 2)
[Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, $halfWidth, 0, $halfWidth, $screenHeight, 0x0040)
Write-Output "success"`;
        break;

      case setWindowTopHalf.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
$halfHeight = [math]::Floor($screenHeight / 2)
[Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, $screenWidth, $halfHeight, 0x0040)
Write-Output "success"`;
        break;

      case setWindowBottomHalf.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
$halfHeight = [math]::Floor($screenHeight / 2)
[Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, $halfHeight, $screenWidth, $halfHeight, 0x0040)
Write-Output "success"`;
        break;

      case maximizeWindow.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
[Win32]::ShowWindow($hwnd, 3)
Write-Output "success"`;
        break;

      case minimizeWindow.name:
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
[Win32]::ShowWindow($hwnd, 2)
Write-Output "success"`;
        break;

      case fullscreenWindow.name:
        // Windows 全屏通过按 F11 键实现
        powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("{F11}")
Write-Output "success"`;
        break;

      default:
        throw new Error(`Windows 平台暂不支持操作: ${action}`);
    }

    const { stdout } = await execAsync(`powershell -Command "${powershellScript}"`);

    if (stdout.includes("success")) {
      const successMessage = `Windows 窗口操作成功: ${action}`;
      return {
        structuredContent: { status: "success", message: successMessage },
        content: [{ type: "text", text: JSON.stringify({ status: "success", message: successMessage }) }],
        isError: false,
      };
    } else {
      throw new Error("PowerShell 脚本执行失败");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Windows 窗口操作失败:`, errorMessage);
    return {
      content: [{ type: "text", text: JSON.stringify({ status: "error", message: errorMessage }) }],
      isError: true,
      errorMessage: `Windows 窗口操作失败: ${errorMessage}`,
    };
  }
}

// --- Server Setup ---
const server = new Server(
  {
    name: "mcp-split-screen",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: input } = request.params;
  console.error(`收到工具调用: ${toolName}`, input);

  try {
    // macOS 平台的权限检查在具体的操作函数中进行，避免重复检查
    // 注释掉这里的权限检查，因为每个操作函数内部都有更智能的权限处理
    /*
    if (os.platform() === 'darwin') {
      const hasPermission = await checkAccessibilityPermission();
      if (!hasPermission) {
        await promptForAccessibilityPermission();
        const errorMessage = "权限不足，无法操作窗口。已为您打开系统设置，请为本程序（如 Terminal, iTerm, VSCode 等）授予“辅助功能”权限后，重新运行命令。";
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: errorMessage
            })
          }],
          isError: true,
          errorMessage: errorMessage,
        };
      }
    }
    */

    if (isWin) {
      // Windows 平台处理所有基本窗口操作
      if ([setWindowLeftHalf.name, setWindowRightHalf.name, setWindowTopHalf.name,
           setWindowBottomHalf.name, maximizeWindow.name, minimizeWindow.name,
           fullscreenWindow.name].includes(toolName)) {
        return handleWindowsWindowAction(toolName);
      }
    }

    // 使用新的通用控制器处理窗口操作
    switch (toolName) {
      case setWindowLeftHalf.name:
      case setWindowRightHalf.name:
      case setWindowTopHalf.name:
      case setWindowBottomHalf.name:
      case maximizeWindow.name:
        // 获取屏幕尺寸并计算窗口边界
        if (isWin) {
          // Windows 使用通用控制器
          return controlWindowUniversal(toolName, { x: 0, y: 0, width: 0, height: 0 }); // Windows 会自动计算
        } else {
          // macOS 需要计算具体边界
          const getScreenDimScript = `tell application "Finder" to get bounds of window of desktop`;
          const { stdout: screenBounds } = await execAsync(`osascript -e '${getScreenDimScript}'`);
          const [,, screenWidth, screenHeight] = screenBounds.trim().split(", ").map(Number);
          const bounds = calculateMacOSWindowBounds(toolName, screenWidth, screenHeight);
          return controlWindowUniversal(toolName, bounds);
        }
      case minimizeWindow.name:
      case fullscreenWindow.name:
        // 特殊操作使用通用控制器
        return controlWindowUniversal(toolName, { x: 0, y: 0, width: 0, height: 0 });
      default:
        throw new Error(`未知工具: ${toolName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`工具执行失败 '${toolName}':`, errorMessage);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ status: "error", message: errorMessage }),
        },
      ],
      isError: true,
      errorMessage: `工具执行失败: ${errorMessage}`,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Split Screen Server 已启动");
  console.error(`平台: ${isWin ? 'Windows' : 'macOS'}`);
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});