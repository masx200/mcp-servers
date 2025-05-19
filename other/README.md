# MCP Servers - Other

这个目录包含使用 TypeScript 实现的其他 MCP 服务。

## 项目结构

该目录使用 pnpm 工作区（workspace）管理多个 TypeScript 项目。

```
other/
├── mcp-server-baidu-map/   # 百度地图 MCP 服务
├── mcp-sample-service/     # 示例 MCP 服务
├── package.json            # 主要项目配置
└── pnpm-workspace.yaml     # pnpm 工作区配置
```

## 开发指南

### 安装依赖

在此目录下运行以下命令安装所有项目的依赖：

```bash
pnpm install
```

### 构建所有项目

```bash
pnpm build
```

### 开发模式运行所有项目

```bash
pnpm dev
```

### 运行所有已构建的项目

```bash
pnpm start
```

### 添加新项目

1. 创建新的项目目录
2. 添加必要的 `package.json` 和 `tsconfig.json` 文件
3. 在 `pnpm-workspace.yaml` 中添加新项目
4. 运行 `pnpm install` 更新依赖

## 技术栈

- TypeScript
- pnpm 工作区
- @modelcontextprotocol/sdk
