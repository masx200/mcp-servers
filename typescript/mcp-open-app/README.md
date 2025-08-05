# MCP Open App Server

一个基于 MCP (Model Context Protocol)
的轻量级应用程序启动服务器，支持搜索和打开系统中安装的应用程序。

## 功能特性

- 🔍 **跨平台应用搜索**: 支持 macOS、Windows、Linux 三大平台
- 🚀 **应用启动**: 可以通过名称直接启动应用程序
- 🔧 **MCP 协议**: 基于 Model Context Protocol 标准
- 🌐 **多语言**: 支持中文应用名称搜索
- ⚡ **轻量级**: 移除了图标处理等重量级功能，专注于核心功能

## 优化特性

- **简化架构**: 只保留名称、路径、关键词等核心字段
- **高效搜索**: 支持模糊匹配、拼音搜索
- **精准定位**: macOS 只搜索 Applications 文件夹，避免系统级应用干扰
- **无依赖**: 移除了复杂的图标提取和 plist 解析依赖

## 支持的平台

### macOS

- 扫描 `/Applications` 目录
- 扫描 `/System/Applications` 目录（可选）
- 扫描用户 `~/Applications` 目录
- 支持 `.app` 包

### Windows

- 扫描 `C:\Program Files` 目录
- 扫描 `C:\Program Files (x86)` 目录
- 扫描用户程序目录
- 支持 `.exe` 文件

### Linux

- 扫描 `/usr/share/applications` 目录
- 扫描 `/usr/local/share/applications` 目录
- 扫描用户 `~/.local/share/applications` 目录
- 支持 `.desktop` 文件

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

## MCP 工具

服务器提供以下三个工具：

### 1. search_apps

搜索系统中安装的应用程序

**参数:**

- `query` (可选): 搜索关键词，支持应用名称和关键词搜索

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
│       └── linux.ts        # Linux 实现
```

## 依赖包

### 运行时依赖

- `@modelcontextprotocol/sdk`: MCP 协议实现

### 开发依赖

- `typescript`: TypeScript 编译器
- `tsx`: TypeScript 执行器
- `@types/node`: Node.js 类型定义

## 优化说明

本次优化主要进行了以下改进：

1. **移除复杂依赖**: 删除了 `plist`、`simple-plist`、`extract-file-icon` 等依赖
2. **简化数据结构**: AppInfo 接口只保留 `name`、`path`、`keywords` 三个核心字段
3. **精简搜索逻辑**: 移除图标处理、复杂的 plist 解析等重量级功能
4. **优化搜索范围**: macOS 只搜索应用程序文件夹，避免系统级应用
5. **提升性能**: 大幅减少 I/O 操作和计算复杂度

## 许可证

ISC License

## 作者

传杰
