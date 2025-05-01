# MCP 文档创建器

一个用于创建空白办公文档的 TypeScript 库，支持 Microsoft Office 和 WPS Office。

## 功能特点

- **文档创建**：支持创建空白 Word、Excel、PowerPoint 文档
- **软件支持**：兼容 Microsoft Office 和 WPS Office
- **智能检测**：自动检测已安装的办公软件
- **灵活配置**：可自定义文件命名和保存路径
- **跨平台**：支持 Windows/macOS/Linux
- **冲突处理**：自动处理文件命名冲突
- **格式兼容**：支持新旧格式（.docx/.xlsx/.pptx 和 .doc/.xls/.ppt）
- **命令行支持**：提供丰富的命令行参数配置选项

## 环境要求

- Node.js >= 14
- TypeScript >= 4.0
- 已安装 Microsoft Office 或 WPS Office

## 快速开始

1. 安装依赖：
```bash
npm install mcp-doc-info
```

2. 基本使用：
```typescript
import { createOfficeDoc } from 'mcp-doc-info';

// 创建 Word 文档
const docPath = await createOfficeDoc({
  type: 'word',
  filename: '测试文档.docx'
});

// 创建 Excel 文档
const excelPath = await createOfficeDoc({
  type: 'excel',
  path: '~/Documents',
  software: 'wps'
});

// 创建 PowerPoint 文档
const pptPath = await createOfficeDoc({
  type: 'ppt',
  filename: '年度报告.pptx',
  path: '~/工作汇报',
  software: 'wps',
  openImmediately: true
});
```

## 命令行使用

该库现在支持通过命令行参数创建文档，可以直接使用npm脚本或者全局安装后使用。

### 基本命令

```bash
# 使用默认设置（创建Word文档到桌面）
npm start

# 显示帮助信息
npm run help
```

### 使用命令行参数

```bash
# 创建Word文档
npm start -- --type word --software wps --path "~/工作汇报" --filename "年度报告.doc"

# 使用简写形式
npm start -- -t excel -s office -p "~/Documents" -f "财务数据.xlsx" -o false

# 创建PPT文档并立即打开
npm start -- -t ppt --path "~/工作汇报" -f "季度演示.ppt"
```

### 可用参数

| 参数 | 简写 | 说明 | 默认值 | 示例 |
|------|------|------|--------|------|
| --type | -t | 文档类型 (word/excel/ppt) | word | --type excel |
| --software | -s | 使用软件 (auto/office/wps) | auto | --software wps |
| --path | -p | 保存路径 | 桌面 | --path "~/Documents" |
| --filename | -f | 文件名 | 自动生成 | --filename "报告.docx" |
| --overwrite | -o | 覆盖已存在文件 | false | --overwrite true |
| --open | - | 立即打开文件 | true | --open false |
| --help | -h | 显示帮助信息 | - | --help |

### 预定义脚本

```bash
# 创建Word文档
npm run create:word -- --filename "报告.doc"

# 创建Excel文档
npm run create:excel -- --software wps

# 创建PPT文档
npm run create:ppt -- --path "~/演示文稿"
```

## API 文档

### createOfficeDoc(options: CreateOfficeDocOptions): Promise<CreateDocResult>

创建办公文档的主要函数。

#### 参数说明

| 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| type | 'word' \| 'excel' \| 'ppt' | 是 | - | 文档类型 |
| software | 'auto' \| 'office' \| 'wps' | 否 | 'auto' | 使用的办公软件 |
| path | string | 否 | 桌面 | 保存路径 |
| filename | string | 否 | 自动生成 | 文件名 |
| overwrite | boolean | 否 | false | 是否覆盖已存在文件 |
| openImmediately | boolean | 否 | true | 是否立即打开文件 |

#### 返回值

```typescript
interface CreateDocResult {
  success: boolean;      // 是否成功
  path?: string;         // 文件路径
  error?: string;        // 错误信息
  warnings?: string[];   // 警告信息
}
```

## 示例

### 1. 创建 Word 文档
```typescript
const result = await createOfficeDoc({
  type: 'word',
  filename: '测试文档.docx',
  path: '~/Documents',
  software: 'wps'
});
```

### 2. 创建 Excel 文档（自动命名）
```typescript
const result = await createOfficeDoc({
  type: 'excel',
  path: '~/工作数据'
});
```

### 3. 创建 PPT 文档（指定路径）
```typescript
const result = await createOfficeDoc({
  type: 'ppt',
  filename: '年度报告.pptx',
  path: '~/工作汇报',
  software: 'wps',
  openImmediately: true
});
```

## 文件命名规则

- **自动命名**：格式为 `新建{类型}文档_年月日时分.扩展名`
- **非法字符**：自动替换为下划线（/\:*?"<>|）
- **冲突处理**：自动追加序号（如：`新建Word文档(1).docx`）

## 平台支持

| 平台 | 文件创建 | 文件打开 | 软件检测 |
|------|----------|----------|----------|
| Windows | `type nul` | `start` | 注册表+路径搜索 |
| macOS | `touch` | `open -a` | mdfind+路径搜索 |
| Linux | `touch` | `xdg-open` | which+find搜索 |

### macOS 和 Linux 增强支持

- **智能软件检测**：使用系统命令(mdfind, find, which等)自动查找已安装的办公软件
- **多路径支持**：增加对各种可能的安装路径的支持
- **专用软件打开**：根据指定软件使用合适的命令打开文件
- **优雅的错误处理**：如指定的软件打开失败，自动回退到系统默认程序

## 错误处理

库提供了详细的错误信息，包括以下场景：

- **软件未安装**：检测不到指定的办公软件
- **路径无效**：无法访问或创建指定路径
- **权限不足**：没有足够的文件系统权限
- **文件冲突**：文件已存在且不允许覆盖
- **打开失败**：无法通过默认程序打开文件

## 开发指南

1. 克隆项目：
```bash
git clone https://github.com/your-username/mcp-servers.git
cd mcp-servers/typescript/mcp-doc-info
```

2. 安装依赖：
```bash
npm install
```

3. 构建项目：
```bash
npm run build
```

4. 运行项目：
```bash
# 基本运行
npm start

# 使用参数
npm start -- --type excel --software wps --filename "数据.xlsx"

# 查看帮助
npm run help
```

5. 全局安装（可选）：
```bash
# 将包链接到全局
npm link

# 直接使用命令
mcp-doc --type word --filename "报告.doc"
```

## 注意事项

1. **软件检测**
   - auto 模式优先检测 Microsoft Office
   - 未安装时自动尝试 WPS
   - 两者均未安装时报错
   - 在macOS和Linux上使用系统命令查找安装路径

2. **路径处理**
   - 自动创建不存在的目录
   - 支持相对路径和绝对路径
   - 支持 ~ 表示用户主目录

3. **文件格式**
   - 默认使用最新格式（docx/xlsx/pptx）
   - 支持旧版格式（doc/xls/ppt）
   - 自动添加正确的扩展名

4. **文件打开**
   - 根据指定的软件类型选择打开命令
   - 打开失败时尝试使用系统默认程序
   - 记录警告但不影响文档创建结果

## 许可证

[MIT](LICENSE)

---

