# Document Writer Server

文档写入服务，支持将剪切板内容、本地文件或结构化数据精准插入Office/WPS文档指定位置，支持复杂格式继承与自动化排版优化。

## 功能特点

- 支持Word/Excel/PowerPoint格式
- 支持多种内容类型（剪切板、文本、文件、结构化数据）
- 支持精确定位到文档特定位置
- 支持自动格式处理（Markdown、HTML、图片缩放等）
- 支持批量操作
- 支持版本备份与回滚
- 支持多种异常处理机制

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用示例

### 将剪切板表格插入Excel A1单元格并保存
```bash
python server.py --target="report.xlsx" --content=clipboard --position="Sheet1!A1" --save
```

### 导入CSV到Word书签位置（追加模式）
```bash
python server.py --target="data.doc" --content=file:data.csv --position="TableAnchor" --mode=append
```

### 插入JSON数据到PPT第三页标题
```bash
python server.py --target="presentation.pptx" --content='{"text":"年度总结"}' --position="slide:3#Title"
```

## 参数说明

- **目标文档路径**（必选，支持doc/docx/xls/xlsx/ppt/pptx）
- **插入内容**（必选，支持以下类型）：
  - clipboard：直接读取系统剪切板内容（文本/图片/文件）
  - text：直接写入的字符串（支持HTML/Markdown格式解析）
  - file：本地文件路径（支持文本/图片/CSV/PDF等格式）
  - data：结构化数据（JSON/YAML，用于表格填充）
- **插入位置**（可选，根据不同文档类型定义）：
  - Word：书签名称（如Bookmark1）/段落索引（如p:2）
  - Excel：工作表名+单元格（如Sheet1!A1）/命名区域（如SalesData）
  - PPT：幻灯片序号+占位符（如slide:3#Title）
- **插入模式**（可选，append/overwrite/merge，默认append）：
  - append：在指定位置后新增内容
  - overwrite：替换目标位置原有内容
  - merge：与现有内容合并（如Excel单元格公式保留）
- **格式处理**（可选）：
  - 图片缩放（可选，百分比或固定尺寸如50%/300x200）
  - 表格样式（可选，预设样式名如LightGrid/MediumShading）
  - 字体映射（可选，替换缺失字体为系统默认字体）
- **保存选项**（必选）：
  - 覆盖保存（true/false，默认false，false时追加_modified后缀）
  - 输出格式（可选，强制转换文档格式如doc→docx）
  - 版本兼容（可选，如Word的兼容模式（97-2003））

## 异常处理

| 错误代码 | 含义 | 解决方案 |
|---------|------|---------|
| DOC_LOCKED | 文档被占用 | 使用--force-unlock尝试解除占用 |
| FONT_MISSING | 缺失字体 | 通过--font-map=宋体:SimSun手动映射 |
| DATA_OVERFLOW | Excel单元格溢出 | 启用--auto-expand-rows自动增加行数 |
| FORMAT_UNSUPPORTED | 不支持的格式 | 使用支持的文档格式 |
| IMAGE_TOO_LARGE | 图片分辨率过大 | 图片尺寸不应超过10000x10000 |
| CONFLICT_ERROR | 合并冲突 | 查看_conflict.log文件了解详情 |
| VBA_REMOVED | VBA代码被移除 | 在Office环境下编辑包含宏的文档 |

## 特殊功能

- **版本回滚**：修改前自动创建原文件名_version1.bak备份，可通过--revert=2回退到第2版
- **API扩展**：支持HTTP端点接收内容，实时同步远程数据到文档
- **WPS兼容**：自动处理WPS特有功能，实现跨办公软件兼容

## 项目结构

```
mcp-server-document-writer/
├── server.py          # 主服务器代码
├── requirements.txt   # 依赖库列表
├── pyproject.toml     # 项目配置 (uv/pip兼容)
└── README.md          # 使用文档
```

## 注意事项

1. 使用前确保安装了所有必要的依赖
2. 对于大文件操作，建议先创建备份
3. 对于加密文档，需要提供密码参数
4. PDF文件内容插入依赖Ghostscript，需要单独安装

## 许可证

此项目基于MIT许可证开源，详情请查看LICENSE文件。 