// 示例：如何为新应用程序添加控制器支持

// 1. 在 APP_CONTROLLERS 数组中添加新的控制器
{
  name: "应用程序名称",
  aliases: ["应用程序别名1", "别名2", "别名3"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    return `tell application "应用程序名称" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
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
}

// 2. 具体示例：添加 Notion 支持
{
  name: "Notion",
  aliases: ["notion"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    return `tell application "Notion" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  }
}

// 3. 具体示例：添加 Slack 支持
{
  name: "Slack",
  aliases: ["slack"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    return `tell application "Slack" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  }
}

// 4. 具体示例：添加 Discord 支持
{
  name: "Discord",
  aliases: ["discord"],
  supportsDirectControl: true,
  getWindowScript: (action: string, bounds: WindowBounds) => {
    const { x, y, width, height } = bounds;
    return `tell application "Discord" to set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`;
  }
}
