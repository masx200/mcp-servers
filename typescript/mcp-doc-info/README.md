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

| 平台 | 文件创建 | 文件打开 |
|------|----------|----------|
| Windows | `type nul` | `start` |
| macOS | `touch` | `open` |
| Linux | `touch` | `xdg-open` |

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

3. 运行测试：
```bash
npm test
```

4. 构建项目：
```bash
npm run build
```

## 注意事项

1. **软件检测**
   - auto 模式优先检测 Microsoft Office
   - 未安装时自动尝试 WPS
   - 两者均未安装时报错

2. **路径处理**
   - 自动创建不存在的目录
   - 支持相对路径和绝对路径
   - 支持 ~ 表示用户主目录

3. **文件格式**
   - 默认使用最新格式（docx/xlsx/pptx）
   - 支持旧版格式（doc/xls/ppt）
   - 自动添加正确的扩展名

4. **文件打开**
   - 依赖系统默认程序关联
   - 打开失败时记录警告
   - 不影响文档创建结果

## 许可证

[MIT](LICENSE)

---

