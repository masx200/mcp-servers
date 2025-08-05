# MCP System Cleaner

一个基于MCP协议的跨平台系统垃圾清理服务，支持Windows、macOS和Linux系统，为 AI
Agent 提供智能化系统清理工具。

## 功能特点

- 系统垃圾文件扫描和清理（临时文件、缓存、日志等）
- 大文件查找和清理
- 回收站清空
- 系统状态监控
- 支持多平台（Windows、macOS、Linux）
- 智能文件分析和安全清理
- 可配置的清理规则和路径

## 安装与配置

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 构建完成后，在 ~/.cursor/mcp.json 中添加以下配置：
{
  "mcpServers": {
    "mcp-server/clear": {
      "command": "npx",
      "args": [
        "-y",
        "你的项目路径/typescript/mcp-system-cleaner/dist/index.js"
      ],
      "autoApprove": [
        "get_system_status",
        "scan_system",
        "clean_files",
        "empty_recycle_bin",
        "find_large_files",
        "update_config"
      ]
    }
  }
}
```

注意：

1. 请将配置中的"你的项目路径"替换为实际的项目路径
2. `autoApprove` 字段表示允许自动执行的命令，这里配置了 `get_system_status`,
   `scan_system`, `clean_files`, `empty_recycle_bin`, `find_large_files`,
   `update_config`

## 使用示例

### 1. 扫描并清理系统垃圾

```json
// 1. 先扫描系统
{
  "name": "scan_system",
  "arguments": {}
}

// 2. 清理特定类型的文件
{
  "name": "clean_files",
  "arguments": {
    "category": "temp_files",
    "dryRun": true  // 建议先使用试运行模式
  }
}
```

### 2. 查找和删除大文件

```json
// 1. 查找大文件
{
  "name": "find_large_files",
  "arguments": {
    "minSizeMb": 100,
    "maxFiles": 10
  }
}

// 2. 删除找到的大文件
{
  "name": "clean_files",
  "arguments": {
    "fileList": ["/path/to/large/file1", "/path/to/large/file2"],
    "dryRun": true  // 建议先使用试运行模式
  }
}
```

### 3. 清空回收站

```json
{
  "name": "empty_recycle_bin",
  "arguments": {}
}
```

### 4. 查看系统状态

```json
{
  "name": "get_system_status",
  "arguments": {}
}
```

### 5. 自定义配置

```json
{
  "name": "update_config",
  "arguments": {
    "newConfig": {
      "fileRules": {
        "minSizeMb": 5,
        "maxAgeDays": 30,
        "extensions": [".tmp", ".log", ".cache"]
      }
    }
  }
}
```

## 配置说明

### 扫描路径

- 默认包含系统临时目录、应用缓存、浏览器缓存等
- 可通过 update_config 自定义添加或移除路径

### 文件规则

- 支持按扩展名、文件名模式、大小、年龄筛选
- 内置多种临时文件和日志文件模式
- 智能排除系统关键文件

### 安全特性

- 支持安全删除（多次覆写）
- 排除关键系统文件
- 可选的备份功能
- 试运行模式

## 注意事项

1. 清理系统文件需要管理员/root权限
2. 建议在清理前：
   - 先使用 scan_system 扫描
   - 使用 dryRun 进行试运行
   - 检查要删除的文件列表
3. 某些系统目录可能需要特殊权限
4. 建议定期清理而不是等到磁盘空间不足

## 许可证

MIT
