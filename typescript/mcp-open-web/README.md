# MCP Open Web Server

一个Model Context Protocol (MCP)服务器，提供网页打开和搜索功能。

## 功能

### open_web

使用系统默认浏览器打开指定网址。

**参数：**

- `url` (string, 必需): 要打开的网址，支持自动添加https://协议

**示例：**

```json
{
  "name": "open_web",
  "arguments": {
    "url": "https://github.com"
  }
}
```

### web_search

使用指定搜索引擎搜索关键词。

**参数：**

- `query` (string, 必需): 要搜索的关键词
- `engine` (string, 可选): 搜索引擎，支持
  `baidu`、`google`、`bing`、`sogou`、`so360`，默认为 `baidu`

**示例：**

```json
{
  "name": "web_search",
  "arguments": {
    "query": "苏超联赛",
    "engine": "baidu"
  }
}
```

## 支持的搜索引擎

- **百度** (`baidu`): https://baidu.com/s?wd=关键词
- **Google** (`google`): https://www.google.com/search?q=关键词
- **Bing** (`bing`): https://www.bing.com/search?q=关键词
- **搜狗** (`sogou`): https://www.sogou.com/web?query=关键词
- **360搜索** (`so360`): https://www.so.com/s?q=关键词

## 安装和运行

1. 安装依赖：

```bash
npm install
```

2. 构建项目：

```bash
npm run build
```

3. 运行服务器：

```bash
npm start
```

## 开发

监听文件变化并自动重新构建：

```bash
npm run dev
```

## 依赖

- `@modelcontextprotocol/sdk`: MCP SDK
- `open`: 用于打开浏览器的跨平台库

## 许可证

MIT
