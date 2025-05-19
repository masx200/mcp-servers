# MCP Office Document Creator

基于 MCP 协议的多平台空白文档创建服务，支持 Windows、macOS 和 Linux 系统，为 AI Agent 提供智能化办公文档创建能力。

## 功能特点

- 支持创建空白 Word、Excel、PowerPoint 文档
- 自动检测并使用 Microsoft Office 或 WPS Office
- 多平台兼容（Windows、macOS、Linux）
- 自定义保存路径和文件名
- 自动处理文件名冲突（重命名或覆盖）
- 创建后可选自动打开文档

## 安装与配置

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 构建完成后，在 ~/.cursor/mcp.json 中添加以下配置：
{
  "mcpServers": {
    "doc-info": {
      "command": "node",
      "args": [
        "你的项目路径/typescript/mcp-doc-info/dist/index.js"
      ],
      "autoApprove": [
        "create_office_doc",
        "get_supported_software"
      ]
    }
  }
}
```

注意：
1. 请将配置中的"你的项目路径"替换为实际的项目路径
2. `autoApprove` 字段表示允许自动执行的命令，这里配置了 `create_office_doc` 和 `get_supported_software`

## 使用示例

### 1. 创建空白文档

```json
// 创建 Word 文档（最简配置）
{
  "name": "create_office_doc",
  "arguments": {
    "type": "word"
  }
}

// 创建 Excel 文档（完整配置）
{
  "name": "create_office_doc",
  "arguments": {
    "type": "excel",
    "software": "wps",
    "path": "C:/工作文件",
    "filename": "财务报表.xlsx",
    "overwrite": false,
    "openImmediately": true
  }
}

// 创建 PPT 文档
{
  "name": "create_office_doc",
  "arguments": {
    "type": "ppt",
    "software": "office"
  }
}
```

### 2. 检测系统已安装的办公软件

```json
{
  "name": "get_supported_software",
  "arguments": {}
}
```

响应示例：
```json
{
  "office": true,
  "wps": false
}
```

## 参数说明

### create_office_doc

| 参数 | 类型 | 必选 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | 是 | - | 文档类型：word、excel、ppt |
| software | string | 否 | auto | 使用软件：auto、office、wps |
| path | string | 否 | 桌面 | 保存路径 |
| filename | string | 否 | 自动生成 | 文件名 |
| overwrite | boolean | 否 | false | 是否覆盖已存在文件 |
| openImmediately | boolean | 否 | true | 是否立即打开 |

### 自动文件命名规则

当未指定 filename 参数时，将按以下格式自动生成文件名：

```
新建{type}文档_yyyyMMddHHmmss.扩展名
```

例如：`新建word文档_20230415143022.docx`

## 软件检测逻辑

1. `auto` 模式（默认）：
   - 先检测 Microsoft Office，未安装则尝试 WPS Office
   - 两者均未安装时返回错误

2. 指定 `office` 或 `wps`：
   - 仅检测指定的软件
   - 未安装则返回错误

## 注意事项

1. 文件路径规则：
   - Windows: 支持绝对路径（C:/path）或相对路径
   - MacOS/Linux: 支持绝对路径（/path）、相对路径或HOME路径（~/path）

2. 文件覆盖/冲突处理：
   - 默认不覆盖，自动重命名为 "原文件名(1).扩展名"
   - 设置 overwrite=true 时，将直接覆盖同名文件

3. 文件格式：
   - 默认使用新格式：.docx、.xlsx、.pptx
   - 可在文件名中指定旧格式：.doc、.xls、.ppt

4. 注意事项：
   - 创建文件需要目标目录的写入权限
   - 自动打开功能依赖系统有关联的默认应用程序
   - 启动时会检测系统安装的办公软件

## 许可证

MIT

---

