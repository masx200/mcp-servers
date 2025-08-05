# MCP 网速测试服务

一个基于 MCP（Model Context
Protocol）的网速测试服务，内置多个测试服务器，无需用户提供测试URL即可测试网络延迟、下载速度和上传速度。

## 功能特点

- 🚀 **延迟测试**: 测试网络延迟（ping）
- ⬇️ **下载速度测试**: 测试网络下载速度
- ⬆️ **上传速度测试**: 测试网络上传速度
- 🏢 **多服务器支持**: 内置 Cloudflare、Fast.com、GitHub CDN 等测试服务器
- 📊 **详细报告**: 提供结构化的 JSON 测试结果
- 🔧 **灵活配置**: 支持指定测试类型、持续时间和服务器

## 安装与配置

### 1. 安装依赖并构建

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 配置 MCP 客户端

在您的 MCP 客户端配置文件中添加以下配置：

#### Claude Desktop (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "mcp-speed-tester": {
      "command": "node",
      "args": [
        "/path/to/mcp-speed-tester/dist/index.js"
      ],
      "autoApprove": [
        "test_network_speed"
      ]
    }
  }
}
```

#### VS Code 等其他客户端

```json
{
  "mcpServers": {
    "mcp-speed-tester": {
      "command": "npx",
      "args": [
        "-y",
        "@mcpcn/mcp-speed-tester"
      ]
    }
  }
}
```

## 使用方法

### 工具：test_network_speed

#### 参数说明

- `testType` (可选): 测试类型
  - `"ping"`: 仅测试延迟
  - `"download"`: 仅测试下载速度
  - `"upload"`: 仅测试上传速度
  - `"full"`: 全面测试（默认）
- `durationMs` (可选): 测试持续时间（毫秒），默认 10000ms
- `serverName` (可选): 指定测试服务器名称

#### 使用示例

##### 1. 全面测试（默认）

```json
{
  "name": "test_network_speed",
  "arguments": {}
}
```

##### 2. 仅测试下载速度

```json
{
  "name": "test_network_speed",
  "arguments": {
    "testType": "download",
    "durationMs": 5000
  }
}
```

##### 3. 指定服务器测试

```json
{
  "name": "test_network_speed",
  "arguments": {
    "testType": "full",
    "serverName": "Cloudflare"
  }
}
```

##### 4. 仅测试延迟

```json
{
  "name": "test_network_speed",
  "arguments": {
    "testType": "ping"
  }
}
```

## 内置测试服务器

1. **Cloudflare**: 支持延迟、下载、上传测试
2. **Fast.com (Netflix)**: 支持延迟、下载测试
3. **GitHub CDN**: 支持延迟、下载测试

## 返回结果示例

```json
{
  "success": true,
  "message": "网络速度测试完成",
  "testType": "full",
  "duration": "10000ms",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": {
    "ping": {
      "Cloudflare": "23ms",
      "Fast.com (Netflix)": "45ms",
      "GitHub CDN": "31ms"
    },
    "download": {
      "Cloudflare": "85.42 Mbps",
      "Fast.com (Netflix)": "测试失败: 超时",
      "GitHub CDN": "92.15 Mbps"
    },
    "upload": {
      "Cloudflare": "42.18 Mbps",
      "Fast.com (Netflix)": "不支持上传测试",
      "GitHub CDN": "不支持上传测试"
    }
  }
}
```

## 技术细节

### 测试原理

- **延迟测试**: 通过 HTTP GET 请求测量往返时间
- **下载速度**: 下载指定大小的文件并计算传输速度
- **上传速度**: 上传数据块并计算传输速度

### 默认配置

- 下载测试时间: 10秒
- 上传测试时间: 10秒
- 测试文件大小: 50MB（下载）
- 数据块大小: 64KB（上传）

## 故障排除

### 常见问题

1. **测试失败**: 检查网络连接和防火墙设置
2. **部分服务器失败**: 正常现象，程序会自动尝试其他服务器
3. **上传测试不支持**: 某些服务器不支持上传测试

### 日志调试

服务器会在 stderr 输出运行日志，可以查看详细的错误信息。

## 开发

### 本地开发

```bash
# 开发模式运行
npm run dev

# 构建
npm run build

# 生产运行
npm run start
```

### 添加新测试服务器

在 `src/index.ts` 中的 `TEST_SERVERS` 数组添加新的服务器配置：

```typescript
{
  name: "新服务器名称",
  downloadUrl: "https://example.com/test-file",
  uploadUrl: "https://example.com/upload", // 可选
  pingUrl: "https://example.com"
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
