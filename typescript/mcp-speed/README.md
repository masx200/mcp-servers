# MCP Speed Test Service

一个基于MCP（Model Context Protocol）的网络速度测试服务，为 AI Agent 提供网络性能测试工具。

## 功能特点

- 测试网络下载速度
- 测试网络上传速度
- 可配置测试持续时间
- 支持自定义测试URL
- 实时速度监控
- 详细的测试报告

## 安装与配置

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 构建完成后，在 ~/.cursor/mcp.json 中添加以下配置：
{
  "mcpServers": {
    "mcp-server/speed": {
      "command": "npx",
      "args": [
        "-y",
        "你的项目路径/typescript/mcp-speed/dist/index.js"
      ],
      "autoApprove": [
        "test_speed"
      ]
    }
  }
}
```

注意：
1. 请将配置中的"你的项目路径"替换为实际的项目路径
2. `autoApprove` 字段表示允许自动执行的命令，这里配置了 `test_speed`

## 使用示例

### 1. 基本速度测试

```json
{
  "name": "test_speed",
  "arguments": {
    "downloadTestUrl": "https://example.com/test-file",
    "uploadTestUrl": "https://example.com/upload",
    "durationMs": 5000
  }
}
```

### 2. 自定义测试配置

```json
{
  "name": "test_speed",
  "arguments": {
    "downloadTestUrl": "https://custom-server.com/large-file",
    "uploadTestUrl": "https://custom-server.com/upload",
    "durationMs": 10000  // 10秒测试
  }
}
```

## 返回结果说明

服务将返回包含以下信息的JSON响应：

```json
{
  "success": true,
  "message": "网速测试完成",
  "results": {
    "downloadSpeed": "50.25 Mbps",
    "uploadSpeed": "20.15 Mbps",
    "testDuration": "5000ms"
  }
}
```

## 配置说明

### 测试参数
- `downloadTestUrl`: 用于测试下载速度的URL
- `uploadTestUrl`: 用于测试上传速度的URL
- `durationMs`: 测试持续时间（毫秒），默认5000ms

### 测试文件要求
- 下载测试文件建议大小：50MB以上
- 上传测试接口需支持POST请求
- 建议使用CDN加速的测试服务器

## 注意事项

1. 确保提供的测试URL可以正常访问
2. 下载测试URL应该指向一个足够大的文件
3. 上传测试URL应该能够接受POST请求
4. 测试结果可能会受到以下因素影响：
   - 网络条件
   - 服务器负载
   - 本地网络环境
   - 测试服务器位置

## 许可证

MIT 