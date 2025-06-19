/**
 * 示例：如何为新应用程序添加控制器支持
 * 
 * 这个文件展示了如何扩展通用应用程序控制器，
 * 为新的应用程序添加专用的窗口控制支持。
 */

import { UniversalAppController, AppController, WindowBounds } from '../controllers/UniversalAppController.js';

// 示例 1: 为 Notion 添加控制器
const notionController: AppController = {
  name: "Notion",
  aliases: ["notion", "notion.so"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    return `tell application "Notion" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  },
  // 可选：提供键盘快捷键备用方案
  getKeyboardShortcut: (action: string) => {
    if (action.includes('left')) {
      return `tell application "System Events" to keystroke "left" using {control down, option down}`;
    }
    if (action.includes('right')) {
      return `tell application "System Events" to keystroke "right" using {control down, option down}`;
    }
    return null;
  }
};

// 示例 2: 为 Slack 添加控制器
const slackController: AppController = {
  name: "Slack",
  aliases: ["slack"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    // Slack 可能需要特殊的窗口控制方法
    return `tell application "Slack"
              try
                set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
              on error
                -- 如果直接设置 bounds 失败，尝试分步设置
                set position of front window to {${x}, ${y}}
                delay 0.1
                set size of front window to {${width}, ${height}}
              end try
            end tell`;
  }
};

// 示例 3: 为 Discord 添加控制器（可能需要特殊处理）
const discordController: AppController = {
  name: "Discord",
  aliases: ["discord"],
  supportsDirectControl: false, // Discord 可能不支持直接控制
  getWindowScript: (action: string, bounds: WindowBounds) => {
    // 即使不支持直接控制，也提供一个基本的脚本
    const { x, y, width, height } = bounds;
    return `tell application "Discord" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  },
  // 为不支持直接控制的应用提供键盘快捷键
  getKeyboardShortcut: (action: string) => {
    const shortcuts: Record<string, string> = {
      'set_window_left_half': 'tell application "System Events" to keystroke "left" using {control down, option down}',
      'set_window_right_half': 'tell application "System Events" to keystroke "right" using {control down, option down}',
      'maximize_window': 'tell application "System Events" to keystroke "f" using {control down, command down}',
      'minimize_window': 'tell application "System Events" to keystroke "m" using {command down}',
    };
    return shortcuts[action] || null;
  }
};

// 示例 4: 为 Figma 添加控制器（Web 应用）
const figmaController: AppController = {
  name: "Figma",
  aliases: ["figma"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    // Figma 作为 Web 应用，可能在浏览器中运行
    // 这里假设它有独立的桌面应用
    return `tell application "Figma" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  }
};

// 示例：如何在运行时添加新的控制器
export function addCustomControllers(universalController: UniversalAppController) {
  // 添加所有自定义控制器
  universalController.addAppController(notionController);
  universalController.addAppController(slackController);
  universalController.addAppController(discordController);
  universalController.addAppController(figmaController);
  
  console.log("已添加自定义应用程序控制器：Notion, Slack, Discord, Figma");
}

// 示例：创建一个完全自定义的控制器
export function createCustomController(
  appName: string, 
  aliases: string[], 
  supportsDirectControl: boolean = true
): AppController {
  return {
    name: appName,
    aliases: aliases,
    supportsDirectControl: supportsDirectControl,
    getWindowScript: (action: string, bounds: WindowBounds) => {
      const { x, y, width, height } = bounds;
      
      // 基本的窗口控制脚本模板
      if (supportsDirectControl) {
        return `tell application "${appName}"
                  try
                    set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
                  on error
                    try
                      set position of front window to {${x}, ${y}}
                      delay 0.1
                      set size of front window to {${width}, ${height}}
                    end try
                  end try
                end tell`;
      } else {
        // 对于不支持直接控制的应用，返回一个基本脚本
        return `tell application "${appName}" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
      }
    },
    getKeyboardShortcut: (action: string) => {
      // 提供标准的键盘快捷键
      const shortcuts: Record<string, string> = {
        'set_window_left_half': 'tell application "System Events" to keystroke "left" using {control down, option down}',
        'set_window_right_half': 'tell application "System Events" to keystroke "right" using {control down, option down}',
        'maximize_window': 'tell application "System Events" to keystroke "f" using {control down, command down}',
        'minimize_window': 'tell application "System Events" to keystroke "m" using {command down}',
      };
      return shortcuts[action] || null;
    }
  };
}

// 使用示例
export function exampleUsage() {
  // 创建通用控制器
  const controller = new UniversalAppController();
  
  // 添加预定义的控制器
  addCustomControllers(controller);
  
  // 动态创建新的控制器
  const customApp = createCustomController(
    "MyCustomApp", 
    ["mycustomapp", "custom app"], 
    true
  );
  controller.addAppController(customApp);
  
  // 现在控制器支持所有这些应用程序
  console.log("通用控制器已配置完成，支持多个应用程序");
}

/**
 * 添加新应用程序控制器的步骤：
 * 
 * 1. 确定应用程序名称和别名
 * 2. 测试应用程序是否支持 AppleScript 窗口控制
 * 3. 创建 AppController 对象
 * 4. 实现 getWindowScript 方法
 * 5. 可选：实现 getKeyboardShortcut 方法作为备用
 * 6. 将控制器添加到 UniversalAppController
 * 
 * 测试方法：
 * 在终端中运行以下命令测试应用程序是否支持窗口控制：
 * osascript -e 'tell application "应用程序名称" to get bounds of front window'
 * 
 * 如果返回窗口边界信息，说明支持基本的窗口控制。
 */
