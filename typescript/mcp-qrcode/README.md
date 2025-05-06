# MCP QRCode Server

一个基于MCP协议的二维码生成和解码服务器，为 AI Agent 提供简单易用的二维码处理功能。

## 功能特点

- 生成高质量二维码图片
- 支持解码本地或在线二维码图片
- 高容错率的二维码生成
- 支持自定义输出路径
- 支持HTTP URL和本地文件路径

## 安装与配置

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 构建完成后，在 ~/.cursor/mcp.json 中添加以下配置：
{
  "mcpServers": {
    "mcp-server/qrcode": {
      "command": "node",
      "args": [
        "你的项目路径/typescript/mcp-qrcode/dist/index.js"
      ],
      "autoApprove": [
        "generate_qrcode",
        "decode_qrcode"
      ]
    }
  }
}
```

注意：
1. 请将配置中的"你的项目路径"替换为实际的项目路径
2. `autoApprove` 字段表示允许自动执行的命令，这里配置了 `generate_qrcode` 和 `decode_qrcode`

## 使用示例

### 1. 生成二维码

```json
{
  "name": "generate_qrcode",
  "arguments": {
    "text": "https://example.com",
    "outputPath": "./example_qr.png"
  }
}
```

成功响应：
```json
{
  "success": true,
  "message": "成功生成二维码",
  "outputPath": "./example_qr.png",
  "encodedText": "https://example.com"
}
```

### 2. 解码二维码

```json
{
  "name": "decode_qrcode",
  "arguments": {
    "imagePath": "https://example.com/qrcode.png"
  }
}
```

成功响应：
```json
{
  "success": true,
  "message": "成功解码二维码",
  "decodedText": "https://example.com"
}
```

## 配置说明

### 二维码生成
- 支持自定义输出路径
- 使用高纠错级别(H)，具有较强的容错能力
- 支持多种图片格式（PNG、JPEG等）

### 二维码解码
- 支持本地文件路径
- 支持HTTP URL（超时设置为10秒）
- 支持多种图片格式

### 安全特性
- 自动验证输入参数
- 安全的文件路径处理
- 错误处理和日志记录

## 注意事项

1. 生成二维码时，确保输出目录存在或有权限创建
2. 解码在线图片时，确保URL可访问且超时设置为10秒
3. 生成的二维码使用高纠错级别(H)，具有较强的容错能力
4. 支持的图片格式包括PNG、JPEG等常见格式

## 错误处理

服务会返回详细的错误信息，常见错误包括：

- 创建输出目录失败
- 生成二维码失败
- 获取图片数据失败
- 解码二维码失败
- 未检测到二维码

## 许可证

MIT License