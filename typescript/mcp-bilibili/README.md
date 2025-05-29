# MCP Bilibili Server

一个基于 MCP (Model Context Protocol) 的B站扫码授权与API集成服务。

## 功能特性
- 支持B站OAuth2扫码授权，获取access_token
- 可扩展集成用户信息、视频管理等API
- MCP工具标准接口

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start
```

## 可用工具

### bilibili_oauth_login
通过B站扫码授权，获取access_token。

**参数**: 无

**返回值**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  ...
}
```

## 目录结构建议
- index.ts  主入口，注册工具
- oauth.ts  扫码授权逻辑
- user.ts   用户API（可选）
- video.ts  视频API（可选）

## 参考文档
- [B站开放平台文档](https://open.bilibili.com/doc/) 