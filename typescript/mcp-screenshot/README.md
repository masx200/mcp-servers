# 截图MCP服务器

跨平台截图MCP服务器，支持macOS、Windows和Linux系统。

## 功能特性

- 📸 全屏截图
- 🪟 窗口截图
- ✂️ 区域选择截图
- 🖼️ 多种格式支持（PNG、JPG、PDF、TIFF）
- 🖱️ 隐藏光标选项
- 🌗 窗口阴影控制
- ⏰ 时间戳命名
- 🖥️ 跨平台支持（macOS、Windows、Linux）

## 工具

### take_screenshot

截取屏幕截图

**参数：**

- `path` (必需): 保存截图的文件路径
- `type` (必需): 截图类型（fullscreen, window, selection）
- `format` (可选): 图片格式（png, jpg, pdf, tiff），默认png
- `hideCursor` (可选): 是否隐藏鼠标光标
- `shadow` (可选): 是否包含窗口阴影（仅窗口截图）
- `timestamp` (可选): 是否在文件名添加时间戳

## 安装和使用

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行
pnpm start
```

## 平台支持

- **macOS**: 使用系统内置的`screencapture`命令
- **Windows**: 使用PowerShell的Graphics API
- **Linux**: 优先使用gnome-screenshot，备选scrot、ImageMagick等

## Linux依赖

Linux系统需要安装截图工具之一：

- gnome-screenshot（GNOME桌面默认）
- scrot
- ImageMagick (import命令)
- xwd

## 示例

全屏截图：

```json
{
  "path": "/path/to/screenshot.png",
  "type": "fullscreen",
  "format": "png",
  "hideCursor": true,
  "timestamp": true
}
```

窗口截图：

```json
{
  "path": "/path/to/window.jpg",
  "type": "window",
  "format": "jpg",
  "shadow": false
}
```

区域选择截图：

```json
{
  "path": "/path/to/selection.png",
  "type": "selection"
}
```
