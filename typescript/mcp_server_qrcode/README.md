# MCP QRCode Server

一个基于MCP协议的二维码生成和解码服务器，提供简单易用的二维码处理功能。

## 功能特点

- 生成高质量二维码图片
- 支持解码本地或在线二维码图片
- 高容错率的二维码生成
- 支持自定义输出路径
- 支持HTTP URL和本地文件路径

## 安装

```bash
# 安装依赖
npm install

# 编译TypeScript
npm run build

# 启动服务
npm start
```

## 使用方法

### 生成二维码

使用 `generate_qrcode` 工具生成二维码图片：

```json
{
  "name": "generate_qrcode",
  "arguments": {
    "text": "要编码的文本内容",
    "outputPath": "/path/to/output/qrcode.png"
  }
}
```

参数说明：
- `text`: 要编码到二维码中的文本内容
- `outputPath`: 二维码图片的输出路径（包含文件名）

### 解码二维码

使用 `decode_qrcode` 工具解码二维码图片：

```json
{
  "name": "decode_qrcode",
  "arguments": {
    "imagePath": "qrcode.png"
  }
}
```

参数说明：
- `imagePath`: 二维码图片的路径，支持本地文件路径或HTTP URL

## 示例

### 生成二维码示例

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

### 解码二维码示例

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