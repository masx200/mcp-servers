import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

// 控制方法枚举
export enum ControlMethod {
  APP_SPECIFIC = "app_specific",
  GENERIC_APPLESCRIPT = "generic_applescript",
  SYSTEM_EVENTS = "system_events",
  KEYBOARD_SHORTCUTS = "keyboard_shortcuts",
  MANUAL_INSTRUCTION = "manual_instruction",
}

// 窗口边界接口
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 控制结果接口
export interface ControlResult {
  success: boolean;
  method: ControlMethod;
  message: string;
  error?: string;
}

// 权限状态接口
export interface PermissionStatus {
  hasAccessibility: boolean;
  canControlCurrentApp: boolean;
  currentApp: string;
  hasAppController: boolean;
  controllerType: string;
  suggestions: string[];
}

// 应用程序控制器接口
export interface AppController {
  name: string;
  aliases: string[];
  supportsDirectControl: boolean;
  getWindowScript: (action: string, bounds: WindowBounds) => string;
  getKeyboardShortcut?: (action: string) => string | null;
}

/**
 * 通用应用程序控制器
 * 负责统一管理所有应用程序的窗口控制逻辑
 */
export class UniversalAppController {
  private appControllers: AppController[] = [];
  private isWindows: boolean;

  constructor(appControllers: AppController[] = []) {
    this.appControllers = appControllers;
    this.isWindows = os.platform() === "win32";
  }

  /**
   * 添加应用程序控制器
   */
  addAppController(controller: AppController): void {
    this.appControllers.push(controller);
  }

  /**
   * 获取当前活跃应用程序
   */
  async getCurrentApplication(): Promise<string> {
    if (this.isWindows) {
      // Windows 实现
      try {
        const script = `
          Add-Type -AssemblyName System.Windows.Forms
          $activeWindow = [System.Windows.Forms.Form]::ActiveForm
          if ($activeWindow) {
            Write-Output $activeWindow.Text
          } else {
            Write-Output "Unknown"
          }
        `;
        const { stdout } = await execAsync(`powershell -Command "${script}"`);
        return stdout.trim() || "Unknown";
      } catch (error) {
        console.error("获取当前应用程序失败 (Windows):", error);
        return "Unknown";
      }
    } else {
      // macOS 实现
      try {
        const script =
          `tell application "System Events" to return name of first process whose frontmost is true`;
        const { stdout } = await execAsync(`osascript -e '${script}'`);
        return stdout.trim();
      } catch (error) {
        console.error("获取当前应用程序失败 (macOS):", error);
        throw new Error("无法获取当前活跃应用程序");
      }
    }
  }

  /**
   * 检查辅助功能权限 (仅 macOS)
   */
  async checkAccessibilityPermission(): Promise<boolean> {
    if (this.isWindows) {
      return true; // Windows 不需要特殊权限
    }

    try {
      const testScript = `tell application "System Events" to return "test"`;
      await execAsync(`osascript -e '${testScript}'`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes("-1719") || errorMsg.includes("不允许辅助访问") ||
        errorMsg.includes("not allowed assistive access")
      ) {
        return false;
      }
      return true; // 其他错误认为有权限
    }
  }

  /**
   * 申请辅助功能权限 (仅 macOS)
   */
  async requestAccessibilityPermission(): Promise<void> {
    if (this.isWindows) {
      return; // Windows 不需要申请权限
    }

    console.error("权限不足，正在尝试打开系统设置...");
    const script =
      'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"';
    try {
      await execAsync(script);
      console.error("成功发送打开系统设置的命令。");
    } catch (e) {
      console.error("打开新版系统设置失败，尝试旧版方法...", e);
      // Fallback for older macOS versions
      const fallbackScript =
        'tell application "System Preferences" to activate & reveal anchor "Privacy_Accessibility" of pane id "com.apple.preference.security"';
      try {
        await execAsync(`osascript -e '${fallbackScript}'`);
        console.error("成功发送打开旧版系统设置的命令。");
      } catch (fallbackError) {
        console.error("打开系统设置的所有方法都失败了。", fallbackError);
      }
    }
  }

  /**
   * 获取应用程序控制器
   */
  getAppController(appName: string): AppController | null {
    const lowerAppName = appName.toLowerCase();
    return this.appControllers.find((controller) =>
      controller.aliases.some((alias) =>
        lowerAppName.includes(alias.toLowerCase())
      )
    ) || null;
  }

  /**
   * 检查应用程序是否支持窗口控制
   */
  async checkAppWindowControlSupport(appName: string): Promise<boolean> {
    if (this.isWindows) {
      return true; // Windows 通过 Win32 API 控制
    }

    try {
      // 测试是否能获取窗口信息
      const testScript =
        `tell application "${appName}" to return count of windows`;
      await execAsync(`osascript -e '${testScript}'`);
      return true;
    } catch (error) {
      console.error(`应用程序 ${appName} 不支持直接窗口控制:`, error);
      return false;
    }
  }

  /**
   * 获取详细的权限状态和应用程序支持信息
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    const currentApp = await this.getCurrentApplication().catch(() =>
      "未知应用"
    );
    const hasAccessibility = await this.checkAccessibilityPermission();
    const controller = this.getAppController(currentApp);
    const hasAppController = controller !== null;
    const canControlCurrentApp = hasAppController ||
      (hasAccessibility && await this.checkAppWindowControlSupport(currentApp));

    const suggestions: string[] = [];
    let controllerType = "none";

    if (this.isWindows) {
      controllerType = "windows_native";
      suggestions.push("✅ Windows 平台支持原生窗口控制");
    } else if (hasAppController) {
      controllerType = "app_specific";
      suggestions.push(
        `✅ 检测到 "${currentApp}" 有专用控制器，支持无权限操作`,
      );
    } else if (hasAccessibility) {
      controllerType = "system_events";
      suggestions.push(`✅ 有辅助功能权限，可以使用 System Events 控制窗口`);
    } else {
      controllerType = "alternative";
      suggestions.push(
        "⚠️ 没有辅助功能权限，将使用替代方案（键盘快捷键或手动指导）",
      );
      suggestions.push(
        "💡 要获得最佳体验，请在 系统设置 > 隐私与安全性 > 辅助功能 中为您的终端应用授权",
      );
    }

    if (
      !this.isWindows && !hasAppController && hasAccessibility &&
      !canControlCurrentApp
    ) {
      suggestions.push(
        `⚠️ 当前应用 "${currentApp}" 可能不支持标准窗口控制，将尝试多种通用方法`,
      );
    }

    // 添加通用建议
    if (!this.isWindows && !hasAppController) {
      suggestions.push("💡 系统将自动尝试多种通用控制方法来支持您的应用程序");
      suggestions.push("💡 如果自动控制失败，将提供键盘快捷键和手动操作指导");
      suggestions.push(
        "💡 建议安装 Rectangle 或 Magnet 等专业窗口管理工具获得最佳体验",
      );
    }

    return {
      hasAccessibility,
      canControlCurrentApp,
      currentApp,
      hasAppController,
      controllerType,
      suggestions,
    };
  }

  /**
   * 通用窗口控制方法 - 按优先级尝试多种方法
   */
  async controlWindow(
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    console.error(`开始窗口控制: ${action}`, bounds);

    // 1. 首先检查权限状态
    const permissionStatus = await this.getPermissionStatus();
    console.error(`权限状态:`, permissionStatus);

    // 2. 如果是 Windows，直接使用 Windows 方法
    if (this.isWindows) {
      return await this.tryWindowsControl(action, bounds);
    }

    // 3. macOS 按优先级尝试各种方法
    const methods = this.getControlMethods(permissionStatus, action, bounds);

    for (const method of methods) {
      try {
        console.error(`尝试控制方法: ${method.name}`);
        const result = await method.execute();
        if (result.success) {
          console.error(`✅ ${method.name} 成功`);
          return result;
        } else {
          console.error(`❌ ${method.name} 失败: ${result.message}`);
        }
      } catch (error) {
        console.error(`❌ ${method.name} 执行出错:`, error);

        // 检查是否是权限问题
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (
          errorMsg.includes("-1719") || errorMsg.includes("不允许辅助访问") ||
          errorMsg.includes("not allowed assistive access")
        ) {
          console.error("检测到权限问题，尝试申请权限");
          await this.requestAccessibilityPermission();
        }
      }
    }

    // 4. 所有方法都失败，返回手动指导
    return this.getManualInstructions(action, permissionStatus);
  }

  /**
   * 获取控制方法列表（按优先级排序）
   */
  private getControlMethods(
    permissionStatus: PermissionStatus,
    action: string,
    bounds: WindowBounds,
  ) {
    const methods: Array<
      { name: string; execute: () => Promise<ControlResult> }
    > = [];

    // 1. 应用程序特定控制器（最高优先级）
    if (permissionStatus.hasAppController) {
      const controller = this.getAppController(permissionStatus.currentApp);
      if (controller) {
        methods.push({
          name: `${controller.name} 专用控制器`,
          execute: () => this.tryAppSpecificControl(controller, action, bounds),
        });

        // 应用程序特定的键盘快捷键
        if (controller.getKeyboardShortcut) {
          methods.push({
            name: `${controller.name} 专用快捷键`,
            execute: () => this.tryAppSpecificKeyboard(controller, action),
          });
        }
      }
    }

    // 2. 增强的通用 AppleScript 控制（多种方法）
    methods.push({
      name: `${permissionStatus.currentApp} 增强通用控制`,
      execute: () =>
        this.tryEnhancedGenericControl(
          permissionStatus.currentApp,
          action,
          bounds,
        ),
    });

    // 3. System Events 控制（需要权限）- 增强版本
    if (permissionStatus.hasAccessibility) {
      methods.push({
        name: "增强 System Events 控制",
        execute: () =>
          this.tryEnhancedSystemEventsControl(
            permissionStatus.currentApp,
            action,
            bounds,
          ),
      });
    }

    // 4. 键盘快捷键备用方案
    methods.push({
      name: "键盘快捷键",
      execute: () => this.tryKeyboardShortcuts(action),
    });

    return methods;
  }

  /**
   * Windows 窗口控制
   */
  private async tryWindowsControl(
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    try {
      let powershellScript = "";
      const { x, y, width, height } = bounds;

      switch (action) {
        case "set_window_left_half":
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
            [Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, ${x}, ${y}, ${width}, ${height}, 0x0040)
            Write-Output "success"`;
          break;

        case "maximize_window":
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

        case "minimize_window":
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

        default:
          // 通用窗口位置设置
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
            [Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, ${x}, ${y}, ${width}, ${height}, 0x0040)
            Write-Output "success"`;
      }

      const { stdout } = await execAsync(
        `powershell -Command "${powershellScript}"`,
      );

      if (stdout.includes("success")) {
        return {
          success: true,
          method: ControlMethod.APP_SPECIFIC,
          message: `Windows 窗口操作成功: ${action}`,
        };
      } else {
        throw new Error("PowerShell 脚本执行失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        success: false,
        method: ControlMethod.APP_SPECIFIC,
        message: `Windows 窗口操作失败: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 应用程序特定控制器
   */
  private async tryAppSpecificControl(
    controller: AppController,
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    try {
      const script = controller.getWindowScript(action, bounds);
      const { stdout } = await execAsync(`osascript -e '${script}'`);

      if (!stdout.includes("error")) {
        return {
          success: true,
          method: ControlMethod.APP_SPECIFIC,
          message: `窗口位置调整成功（专用控制器: ${controller.name}）`,
        };
      } else {
        throw new Error(`专用控制器失败: ${stdout}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        success: false,
        method: ControlMethod.APP_SPECIFIC,
        message: `专用控制器失败: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 应用程序特定键盘快捷键
   */
  private async tryAppSpecificKeyboard(
    controller: AppController,
    action: string,
  ): Promise<ControlResult> {
    try {
      const shortcutScript = controller.getKeyboardShortcut!(action);
      if (!shortcutScript) {
        throw new Error("没有对应的键盘快捷键");
      }

      await execAsync(`osascript -e '${shortcutScript}'`);
      return {
        success: true,
        method: ControlMethod.KEYBOARD_SHORTCUTS,
        message: `使用键盘快捷键成功（${controller.name}）`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        success: false,
        method: ControlMethod.KEYBOARD_SHORTCUTS,
        message: `应用程序特定键盘快捷键失败: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 增强的通用 AppleScript 控制 - 支持更多应用程序
   */
  private async tryEnhancedGenericControl(
    appName: string,
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    const { x, y, width, height } = bounds;

    // 更全面的通用控制方法，按成功率排序
    const enhancedMethods = [
      {
        name: `${appName} 直接 bounds 设置`,
        script: `tell application "${appName}"
                   try
                     set bounds of front window to {${x}, ${y}, ${x + width}, ${
          y + height
        }}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
      {
        name: `${appName} 分步设置（位置+大小）`,
        script: `tell application "${appName}"
                   try
                     set position of front window to {${x}, ${y}}
                     delay 0.1
                     set size of front window to {${width}, ${height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
      {
        name: `${appName} 窗口属性设置`,
        script: `tell application "${appName}"
                   try
                     tell front window
                       set position to {${x}, ${y}}
                       set size to {${width}, ${height}}
                     end tell
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
      {
        name: `${appName} 窗口1设置`,
        script: `tell application "${appName}"
                   try
                     set bounds of window 1 to {${x}, ${y}, ${x + width}, ${
          y + height
        }}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
      {
        name: `${appName} 文档窗口设置`,
        script: `tell application "${appName}"
                   try
                     set bounds of document window 1 to {${x}, ${y}, ${
          x + width
        }, ${y + height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
    ];

    for (const method of enhancedMethods) {
      try {
        console.error(`尝试: ${method.name}`);
        const { stdout } = await execAsync(`osascript -e '${method.script}'`);
        if (stdout.includes("success")) {
          return {
            success: true,
            method: ControlMethod.GENERIC_APPLESCRIPT,
            message: `窗口位置调整成功（${method.name}）`,
          };
        } else if (stdout.includes("error:")) {
          console.error(`${method.name} 返回错误: ${stdout}`);
        }
      } catch (error) {
        console.error(`${method.name} 执行异常:`, error);
        // 继续尝试下一个方法
      }
    }

    return {
      success: false,
      method: ControlMethod.GENERIC_APPLESCRIPT,
      message: `增强通用 AppleScript 控制失败`,
      error: "所有增强通用方法都失败",
    };
  }

  /**
   * 通用 AppleScript 控制 (保留原方法作为备用)
   */
  private async tryGenericAppleScript(
    appName: string,
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    const { x, y, width, height } = bounds;

    const genericMethods = [
      {
        name: `${appName} 通用 bounds 设置`,
        script: `tell application "${appName}"
                   try
                     set bounds of front window to {${x}, ${y}, ${x + width}, ${
          y + height
        }}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
      {
        name: `${appName} 通用分步设置`,
        script: `tell application "${appName}"
                   try
                     set position of front window to {${x}, ${y}}
                     delay 0.1
                     set size of front window to {${width}, ${height}}
                     return "success"
                   on error errorMsg
                     return "error: " & errorMsg
                   end try
                 end tell`,
      },
    ];

    for (const method of genericMethods) {
      try {
        const { stdout } = await execAsync(`osascript -e '${method.script}'`);
        if (stdout.includes("success")) {
          return {
            success: true,
            method: ControlMethod.GENERIC_APPLESCRIPT,
            message: `窗口位置调整成功（${method.name}）`,
          };
        }
      } catch (error) {
        // 继续尝试下一个方法
      }
    }

    return {
      success: false,
      method: ControlMethod.GENERIC_APPLESCRIPT,
      message: `通用 AppleScript 控制失败`,
      error: "所有通用方法都失败",
    };
  }

  /**
   * 增强的 System Events 控制 - 支持更多应用程序类型
   */
  private async tryEnhancedSystemEventsControl(
    appName: string,
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    const { x, y, width, height } = bounds;

    // 更全面的 System Events 控制方法
    const enhancedSystemEventsMethods = [
      {
        name: "System Events 前台进程控制",
        script: `tell application "System Events"
                   tell (first process whose frontmost is true)
                     try
                       set position of front window to {${x}, ${y}}
                       delay 0.1
                       set size of front window to {${width}, ${height}}
                       return "success"
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
      {
        name: "System Events 指定进程控制",
        script: `tell application "System Events"
                   tell process "${appName}"
                     try
                       set position of front window to {${x}, ${y}}
                       delay 0.1
                       set size of front window to {${width}, ${height}}
                       return "success"
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
      {
        name: "System Events bounds 直接设置",
        script: `tell application "System Events"
                   tell (first process whose frontmost is true)
                     try
                       set bounds of front window to {${x}, ${y}, ${
          x + width
        }, ${y + height}}
                       return "success"
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
      {
        name: "System Events 窗口1控制",
        script: `tell application "System Events"
                   tell (first process whose frontmost is true)
                     try
                       set position of window 1 to {${x}, ${y}}
                       delay 0.1
                       set size of window 1 to {${width}, ${height}}
                       return "success"
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
      {
        name: "System Events 所有窗口检查",
        script: `tell application "System Events"
                   tell (first process whose frontmost is true)
                     try
                       if (count of windows) > 0 then
                         set position of first window to {${x}, ${y}}
                         delay 0.1
                         set size of first window to {${width}, ${height}}
                         return "success"
                       else
                         return "error: no windows found"
                       end if
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
    ];

    for (const method of enhancedSystemEventsMethods) {
      try {
        console.error(`尝试: ${method.name}`);
        const { stdout } = await execAsync(`osascript -e '${method.script}'`);
        if (stdout.includes("success")) {
          return {
            success: true,
            method: ControlMethod.SYSTEM_EVENTS,
            message: `窗口位置调整成功（${method.name}）`,
          };
        } else if (stdout.includes("error:")) {
          console.error(`${method.name} 返回错误: ${stdout}`);
        }
      } catch (error) {
        console.error(`${method.name} 执行异常:`, error);
        // 继续尝试下一个方法
      }
    }

    return {
      success: false,
      method: ControlMethod.SYSTEM_EVENTS,
      message: `增强 System Events 控制失败`,
      error: "所有增强 System Events 方法都失败",
    };
  }

  /**
   * System Events 控制 (保留原方法作为备用)
   */
  private async trySystemEventsControl(
    action: string,
    bounds: WindowBounds,
  ): Promise<ControlResult> {
    const { x, y, width, height } = bounds;

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
                 end tell`,
      },
      {
        name: "System Events bounds 操作",
        script: `tell application "System Events"
                   tell (first process whose frontmost is true)
                     try
                       set bounds of front window to {${x}, ${y}, ${
          x + width
        }, ${y + height}}
                       return "success"
                     on error errorMsg
                       return "error: " & errorMsg
                     end try
                   end tell
                 end tell`,
      },
    ];

    for (const method of systemEventsMethods) {
      try {
        const { stdout } = await execAsync(`osascript -e '${method.script}'`);
        if (stdout.includes("success")) {
          return {
            success: true,
            method: ControlMethod.SYSTEM_EVENTS,
            message: `窗口位置调整成功（${method.name}）`,
          };
        }
      } catch (error) {
        // 继续尝试下一个方法
      }
    }

    return {
      success: false,
      method: ControlMethod.SYSTEM_EVENTS,
      message: `System Events 控制失败`,
      error: "所有 System Events 方法都失败",
    };
  }

  /**
   * 键盘快捷键控制
   */
  private async tryKeyboardShortcuts(action: string): Promise<ControlResult> {
    const shortcuts: Record<string, string> = {
      "set_window_left_half":
        'tell application "System Events" to keystroke "left" using {control down, option down}',
      "set_window_right_half":
        'tell application "System Events" to keystroke "right" using {control down, option down}',
      "maximize_window":
        'tell application "System Events" to keystroke "f" using {control down, command down}',
      "minimize_window":
        'tell application "System Events" to keystroke "m" using {command down}',
    };

    const shortcut = shortcuts[action];
    if (!shortcut) {
      return {
        success: false,
        method: ControlMethod.KEYBOARD_SHORTCUTS,
        message: `不支持的键盘快捷键操作: ${action}`,
        error: "没有对应的快捷键",
      };
    }

    try {
      await execAsync(`osascript -e '${shortcut}'`);
      return {
        success: true,
        method: ControlMethod.KEYBOARD_SHORTCUTS,
        message:
          `已尝试使用键盘快捷键执行 ${action}。如果没有效果，请安装 Rectangle 或 Magnet 等窗口管理工具。`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        success: false,
        method: ControlMethod.KEYBOARD_SHORTCUTS,
        message: `键盘快捷键失败: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取手动操作指导
   */
  private getManualInstructions(
    action: string,
    permissionStatus: PermissionStatus,
  ): ControlResult {
    const instructions: Record<string, string> = {
      "set_window_left_half":
        "请手动操作：按住 Control + Option + 左箭头键，或拖拽窗口到屏幕左边缘",
      "set_window_right_half":
        "请手动操作：按住 Control + Option + 右箭头键，或拖拽窗口到屏幕右边缘",
      "set_window_top_half": "请手动操作：拖拽窗口到屏幕上边缘",
      "set_window_bottom_half": "请手动操作：拖拽窗口到屏幕下边缘",
      "maximize_window":
        "请手动操作：按住 Control + Command + F，或点击窗口左上角的绿色按钮",
      "minimize_window":
        "请手动操作：按 Command + M，或点击窗口左上角的黄色按钮",
      "fullscreen_window":
        "请手动操作：按 Control + Command + F，或点击窗口左上角的绿色按钮",
    };

    const instruction = instructions[action] || `请手动执行窗口操作: ${action}`;
    const suggestions = permissionStatus.suggestions.join("\n");

    return {
      success: false,
      method: ControlMethod.MANUAL_INSTRUCTION,
      message:
        `所有自动方法都失败了。\n\n${instruction}\n\n建议：\n${suggestions}\n\n或者安装 Rectangle、Magnet 等窗口管理工具并使用其快捷键。`,
    };
  }
}
