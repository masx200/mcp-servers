# MCP-SYSTEM_CLEANER

基于 MCP 协议的跨平台系统垃圾清理服务，为 AI Agent 提供智能化系统清理工具

## 功能特性

- 🧹 支持 Windows、macOS 和 Linux 系统垃圾清理
- 🔍 智能识别并清理临时文件、缓存、日志等垃圾
- 🌐 支持清理各大浏览器缓存和垃圾文件
- 📂 查找和分析大文件，帮助释放磁盘空间
- 🗑️ 快速清空各平台回收站
- ⚡ 多线程加速清理过程
- 🔒 系统关键文件保护机制

## 清理目标

### Windows

- 临时文件夹 (%TEMP%, Windows\Temp)
- 浏览器缓存 (Chrome, Edge, Firefox)
- 系统缓存 (Prefetch, WER, SoftwareDistribution)
- 应用程序崩溃转储和日志文件
- Internet 临时文件
- 回收站

### macOS

- 系统缓存 (~/Library/Caches)
- 应用程序缓存和日志
- 浏览器缓存 (Safari, Chrome, Firefox)
- Xcode 生成的临时文件
- 系统和应用程序日志
- 废纸篓

### Linux

- 临时文件夹 (/tmp, /var/tmp)
- 用户缓存 (~/.cache)
- 系统缓存 (/var/cache)
- 日志文件 (/var/log)
- 浏览器缓存 (Firefox, Chrome, Chromium)
- 缩略图缓存
- 回收站

## 快速开始

### 环境要求

- Python 3.12+
- 适用于 Windows, macOS 和 Linux 系统

### 安装依赖

```bash
uv pip install psutil
```

### 运行

```bash
mcp dev server.py
```

### json配置

```bash
"system_cleaner": {
    "command": "uv",
    "args": [
      "--directory",
      "path/mcp-servers/mcp/python/mcp-system-cleaner",
      "run",
      "server.py"
    ],
    "disabled": false,
    "autoApprove": []
  }
```

### API 说明

- 服务基于 MCP 协议提供以下核心工具：

- clean_system() - 执行全系统垃圾清理
- find_large_files() - 查找并分析大文件
- empty_recycle_bin() - 清空系统回收站
- clean_browser_cache() - 清理浏览器缓存
- clean_specific_paths() - 清理指定路径
