# MCP 文档创建器

一个用于创建空白办公文档的 TypeScript 库，支持 Microsoft Office 和 WPS Office。

## 功能特点

- 创建空白 Word、Excel、PowerPoint 文档
- 支持 Microsoft Office 和 WPS Office
- 自动检测已安装的办公软件
- 可自定义文件命名和保存路径
- 跨平台支持（Windows/macOS/Linux）
- 自动处理文件冲突
- 支持新旧格式（.docx/.xlsx/.pptx 和 .doc/.xls/.ppt）

## 环境要求

- Node.js >= 14
- 已安装 Microsoft Office 或 WPS Office
- TypeScript >= 4.0

## 安装

1. 克隆项目到本地：
```bash
git clone https://github.com/your-username/mcp-servers.git
cd mcp-servers/typescript/mcp-doc-info
```

2. 安装依赖：
```bash
npm install
```

3. 编译 TypeScript：
```bash
npm run build
```

## 使用方法

```typescript
import { createOfficeDoc } from './src';

// 创建 Word 文档
const docPath = await createOfficeDoc({
  type: 'word',
  software: 'wps',
  path: '~/Documents',
  filename: '测试文档.docx'
});

// 创建 Excel 文档
const excelPath = await createOfficeDoc({
  type: 'excel',
  filename: '数据统计.xlsx'
});

// 创建 PowerPoint 文档
const pptPath = await createOfficeDoc({
  type: 'ppt',
  openImmediately: false
});
```

## 参数说明

| 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| type | 'word' \| 'excel' \| 'ppt' | 是 | - | 文档类型 |
| software | 'auto' \| 'office' \| 'wps' | 否 | 'auto' | 使用的办公软件 |
| path | string | 否 | 桌面 | 保存路径 |
| filename | string | 否 | 自动生成 | 文件名 |
| overwrite | boolean | 否 | false | 是否覆盖已存在文件 |
| openImmediately | boolean | 否 | true | 是否立即打开文件 |

## 文件命名规则

- 未提供文件名时，自动生成格式：`新建{类型}文档_年月日时分.扩展名`
- 文件名中的非法字符（/\:*?"<>|）会自动替换为下划线
- 文件名冲突时自动追加序号（如：`新建Word文档(1).docx`）

## 平台支持

- Windows：使用 `type nul` 创建文件，`start` 打开文件
- macOS：使用 `touch` 创建文件，`open` 打开文件
- Linux：使用 `touch` 创建文件，`xdg-open` 打开文件

## 错误处理

库提供了详细的错误信息，包括以下场景：
- 软件未安装
- 路径无效或权限不足
- 文件创建/打开失败

## 注意事项

1. 软件检测逻辑
   - auto 模式优先检测 Microsoft Office，若未安装则尝试 WPS
   - 指定 office 或 wps 但未检测到对应软件时，会报错终止

2. 路径与冲突处理
   - 路径不存在时自动递归创建目录
   - 权限不足时会报错
   - 非覆盖模式下文件名冲突时，自动追加序号

3. 格式与兼容性
   - 默认使用最新格式：Word（docx）、Excel（xlsx）、PPT（pptx）
   - 若需旧版格式（doc/xls/ppt），需在文件名中显式指定扩展名

4. 立即打开限制
   - 依赖系统默认程序关联
   - 若关联错误（如.docx 用记事本打开），记录警告但不中断流程
   - 文件被占用或软件启动失败时，提示"文档创建成功但打开失败"

## 开发

1. 安装开发依赖：
```bash
npm install
```

2. 运行测试：
```bash
npm test
```

3. 运行示例：
```bash
npm start
```

## 许可证

MIT 

