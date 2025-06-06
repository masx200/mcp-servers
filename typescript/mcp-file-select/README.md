# 文件选择MCP服务器

跨平台文件选择对话框MCP服务器，支持macOS、Windows和Linux系统。

## 功能特性

- 📁 原生文件选择对话框
- 🎯 自定义提示消息
- 📂 默认目录设置
- 🏷️ 文件类型过滤
- 📄 单选/多选支持
- 🖥️ 跨平台支持（macOS、Windows、Linux）

## 工具

### select_file
打开原生文件选择对话框

**参数：**
- `prompt` (可选): 对话框提示消息
- `defaultLocation` (可选): 默认打开的目录路径
- `fileTypes` (可选): 文件类型过滤器
- `multiple` (可选): 是否允许多选文件

**返回值：**
```json
{
  "paths": [
    "/path/to/selected/file1.txt",
    "/path/to/selected/file2.png"
  ]
}
```

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

- **macOS**: 使用AppleScript的`choose file`
- **Windows**: 使用PowerShell的OpenFileDialog
- **Linux**: 使用zenity文件选择器（自动安装）

## 文件类型过滤器

macOS支持UTI（Uniform Type Identifier）格式：
```json
{
  "fileTypes": {
    "public.image": ["png", "jpg", "jpeg"],
    "public.text": ["txt", "md"]
  }
}
```

Windows和Linux使用扩展名过滤。

## 示例

基本文件选择：
```json
{
  "prompt": "请选择一个文件"
}
```

多选图片文件：
```json
{
  "prompt": "选择图片文件",
  "multiple": true,
  "fileTypes": {
    "public.image": ["png", "jpg", "jpeg", "gif"]
  }
}
```

指定默认目录：
```json
{
  "prompt": "选择配置文件",
  "defaultLocation": "/Users/username/Documents",
  "fileTypes": {
    "public.json": ["json"]
  }
}
```

返回结果：
```json
{
  "paths": [
    "/Users/username/Documents/config.json"
  ]
}
``` 