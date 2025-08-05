# MCP 图片上传服务器

一个基于 Model Context Protocol (MCP)
的图片上传服务器，支持将本地图片文件上传到云端并返回可访问的 URL。

## 功能特性

- 🖼️ 支持多种图片格式：jpg, jpeg, png, gif, webp, bmp, tiff, svg
- 🚀 快速上传到云端存储
- 🔗 返回可直接访问的图片 URL
- ⚡ 基于 MCP 协议，易于集成
- 🛡️ 完善的错误处理和验证
- 📝 详细的日志输出

## 安装

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd typescript/mcp-image-upload
pnpm install
```

### 构建项目

```bash
pnpm build
```

## 使用方法

### 1. 直接运行

```bash
pnpm start
```

### 2. 作为 MCP 服务器

在您的 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "图片上传": {
      "command": "node",
      "args": ["/path/to/mcp-image-upload/dist/index.js"],
      "env": {}
    }
  }
}
```

### 3. 使用 npx

```json
{
  "mcpServers": {
    "图片上传": {
      "command": "npx",
      "args": ["-y", "@mcpcn/mcp-image-upload"],
      "env": {}
    }
  }
}
```

## 工具说明

### upload_image

上传本地图片文件到云端，返回可访问的图片 URL。

**参数：**

- `path` (string, 必需): 要上传的图片文件的本地路径

**支持的格式：**

- JPG/JPEG
- PNG
- GIF
- WebP
- BMP
- TIFF
- SVG

**示例：**

```javascript
{
  "name": "upload_image",
  "arguments": {
    "path": "/Users/username/Pictures/image.jpg"
  }
}
```

**返回：** 成功时返回包含图片 URL 的文本消息。

## API 接口

本服务器使用以下 API 进行图片上传：

- **接口地址**: `https://www.mcpcn.cc/api/fileUploadAndDownload/uploadMcpFile`
- **请求方法**: POST
- **请求格式**: multipart/form-data
- **文件字段名**: `file`

## 错误处理

服务器提供完善的错误处理，包括：

- 文件不存在错误
- 不支持的文件格式错误
- 网络连接错误
- 服务器响应错误
- 上传超时错误

## 开发

### 开发模式

```bash
pnpm dev
```

### 清理构建文件

```bash
pnpm clean
```

### 完整重新构建

```bash
pnpm prepare
```

## 项目结构

```
mcp-image-upload/
├── src/
│   └── index.ts          # 主要服务器实现
├── dist/
│   └── index.js          # 构建输出文件
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md            # 使用说明
```

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **Node.js** - 运行时环境
- **@modelcontextprotocol/sdk** - MCP 协议实现
- **form-data** - multipart/form-data 支持
- **node-fetch** - HTTP 请求库

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0

- 初始版本
- 支持基本的图片上传功能
- 完整的错误处理
- MCP 协议集成
