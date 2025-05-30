# MCP Open App Server

一个基于 MCP (Model Context Protocol) 的应用程序启动服务器，支持搜索和打开系统中安装的应用程序。

## 功能特性

- 🔍 **跨平台应用搜索**: 支持 macOS、Windows、Linux 三大平台
- 🚀 **应用启动**: 可以通过名称直接启动应用程序
- 🔧 **MCP 协议**: 基于 Model Context Protocol 标准
- 📱 **图标支持**: 自动获取应用程序图标
- 🌐 **多语言**: 支持中文应用名称搜索

## 支持的平台

### macOS
- 使用 `system_profiler` 获取应用列表
- 支持 `.app` 和 `.prefPane` 文件
- 自动提取应用图标

### Windows
- 扫描开始菜单快捷方式
- 支持 `.lnk` 文件解析
- 使用 PowerShell 读取快捷方式信息

### Linux
- 扫描 `.desktop` 文件
- 支持多个标准应用目录
- 自动查找应用图标

## 安装与使用

### 安装依赖
```bash
npm install
```

### 编译项目
```bash
npm run build
```

### 运行服务器
```bash
npm start
```

### 开发模式
```bash
npm run dev
```

### 测试功能
```bash
node test.js
```

## MCP 工具

服务器提供以下三个工具：

### 1. search_apps
搜索系统中安装的应用程序

**参数:**
- `query` (可选): 搜索关键词，支持应用名称、路径和关键词搜索

**示例:**
```json
{
  "name": "search_apps",
  "arguments": {
    "query": "Chrome"
  }
}
```

### 2. open_app
根据应用名称打开应用程序

**参数:**
- `appName` (必需): 要打开的应用程序名称

**示例:**
```json
{
  "name": "open_app",
  "arguments": {
    "appName": "Google Chrome"
  }
}
```

### 3. get_platform_info
获取当前系统平台信息

**示例:**
```json
{
  "name": "get_platform_info",
  "arguments": {}
}
```

## 项目结构

```
src/
├── index.ts                 # MCP 服务器主入口
├── utils/
│   ├── platform.ts         # 平台检测工具
│   └── app-search/         # 应用搜索模块
│       ├── index.ts        # 主入口
│       ├── darwin.ts       # macOS 实现
│       ├── win.ts          # Windows 实现
│       ├── linux.ts        # Linux 实现
│       └── get-mac-app/    # macOS 专用工具
│           ├── index.ts
│           ├── getApps.ts  # 获取应用列表
│           └── app2png.ts  # 图标转换
```

## 依赖包

### 运行时依赖
- `@modelcontextprotocol/sdk`: MCP 协议实现
- `simple-plist`: macOS plist 文件解析
- `plist`: 另一个 plist 解析库
- `extract-file-icon`: Windows 图标提取 (可选)

### 开发依赖
- `typescript`: TypeScript 编译器
- `tsx`: TypeScript 执行器
- `@types/node`: Node.js 类型定义
- `@types/plist`: plist 类型定义

## 开发说明

本项目将原有的 Electron 应用搜索代码转换为纯 Node.js 实现：

1. **移除 Electron 依赖**: 不再依赖 `electron` 和相关 API
2. **纯 Node.js 实现**: 使用标准 Node.js API 和第三方包
3. **类型安全**: 全面使用 TypeScript 提供类型安全
4. **模块化设计**: 清晰的模块分离，便于维护和扩展
5. **跨平台兼容**: 统一的接口，平台特定的实现

## 许可证

ISC License

## 作者

传杰 