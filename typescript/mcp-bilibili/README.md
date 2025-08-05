# MCP Bilibili Server

一个基于 MCP (Model Context Protocol)
的B站开放平台集成服务，支持用户认证、视频管理、完整的视频投稿流程等功能。

## 🚀 功能特性

### 🔐 用户认证系统

- **本地Token缓存**: 自动缓存访问令牌，避免频繁授权
- **OAuth 2.0安全认证**: 采用B站官方授权机制
- **扫码快速授权**: 自动打开浏览器，手机扫码即可完成授权

### 📊 用户信息管理

- **基础信息查询**: 获取用户昵称、头像、openid等
- **统计数据获取**: 关注数、粉丝数、投稿数等维度数据
- **投稿历史查询**: 查看已发布的视频列表及详细信息

### 🎬 完整投稿流程

- **视频分区查询**: 获取所有可用的投稿分区
- **视频上传预处理**: 获取上传参数和token
- **视频分片上传**: 支持大文件分片上传
- **视频分片合并**: 完成分片文件合并
- **封面图片上传**: 支持JPEG、PNG格式封面
- **稿件投稿提交**: 完成视频发布到B站

## 📦 安装配置

### 方式一：NPX 直接运行（推荐）

```bash
# 如果遇到模块依赖问题，可以先本地安装
npm install -g @mcpcn/mcp-bilibili

# 然后直接运行
mcp-bilibili
```

### 方式二：本地开发安装

```bash
# 克隆项目
git clone https://github.com/mcpcn/mcp-servers
cd mcp-servers/typescript/mcp-bilibili

# 安装依赖
npm install

# 构建项目
npm run build

# 运行
npm start
```

### 方式三：MCP 客户端配置

在你的 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "bilibili": {
      "command": "npx",
      "args": ["@mcpcn/mcp-bilibili"]
    }
  }
}
```

或者使用本地安装：

```json
{
  "mcpServers": {
    "bilibili": {
      "command": "mcp-bilibili"
    }
  }
}
```

## 🎯 完整使用流程

### 第一步：用户认证

```bash
# 1. 检查本地是否有有效token
bilibili_check_local_token

# 2. 如果没有，生成授权链接（会自动打开浏览器）
bilibili_web_authorize_link

# 3. 扫码授权后，获取访问令牌
bilibili_web_poll_and_token --state "返回的state值"
```

> ⚠️ **重要提醒**：授权时请确保勾选所有权限项目：
>
> - 📱 基础信息
> - 📊 投稿效果管理
> - 🎬 UP主视频稿件管理
> - 📈 视频稿件数据管理

### 第二步：查询用户信息

```bash
# 获取用户基本信息
bilibili_get_user_info --access_token "你的token"

# 获取用户统计数据
bilibili_get_user_stat --access_token "你的token"

# 查看投稿历史
bilibili_get_video_list --access_token "你的token"
```

### 第三步：视频投稿流程

```bash
# 1. 获取可用分区列表
bilibili_get_video_categories --access_token "你的token"

# 2. 视频上传预处理
bilibili_upload_video_preprocess --access_token "你的token" --filename "video.mp4"

# 3. 上传视频分片（支持大文件）
bilibili_upload_video_chunk --upload_token "预处理返回的token" --video_file_path "/path/to/video.mp4"

# 4. 完成视频分片合并
bilibili_complete_video_upload --upload_token "预处理返回的token"

# 5. 上传封面图片
bilibili_upload_cover --access_token "你的token" --cover_file_path "/path/to/cover.jpg"

# 6. 提交稿件完成投稿
bilibili_submit_archive --access_token "你的token" --upload_token "预处理返回的token" --title "视频标题" --tag "标签1,标签2" --tid 分区ID --cover "封面URL"
```

## 🛠️ API 工具详细说明

### 认证相关

#### `bilibili_check_local_token`

检查本地缓存的访问令牌是否有效

**参数**: 无

**返回**:

```json
{
  "hasValidToken": true,
  "access_token": "有效的访问令牌",
  "refresh_token": "刷新令牌",
  "expires_at": 1640995200,
  "message": "Token有效"
}
```

#### `bilibili_web_authorize_link`

生成B站授权链接并自动打开浏览器

**参数**: 无

**返回**:

```json
{
  "state": "unique_state_id",
  "authorize_url": "https://passport.bilibili.com/oauth2/authorize?...",
  "tips": "已自动在本地浏览器打开授权链接，请扫码授权"
}
```

#### `bilibili_web_poll_and_token`

轮询获取授权码并换取访问令牌

**参数**:

- `state`: 授权时生成的唯一标识

**返回**:

```json
{
  "access_token": "访问令牌",
  "refresh_token": "刷新令牌",
  "expires_in": 2592000
}
```

### 用户信息

#### `bilibili_get_user_info`

获取用户基本信息

**参数**:

- `access_token`: 访问令牌

**返回**:

```json
{
  "name": "用户昵称",
  "face": "头像URL",
  "openid": "用户唯一标识"
}
```

#### `bilibili_get_user_stat`

获取用户统计数据

**参数**:

- `access_token`: 访问令牌

**返回**:

```json
{
  "following": 123,
  "follower": 456,
  "arc_passed_total": 78
}
```

#### `bilibili_get_video_list`

获取用户投稿视频列表

**参数**:

- `access_token`: 访问令牌

**返回**: 包含视频ID、标题、封面、分区、状态等信息的数组

### 视频投稿

#### `bilibili_get_video_categories`

获取B站视频分区列表

**参数**:

- `access_token`: 访问令牌

**返回**:

```json
[
  {
    "id": 188,
    "parent": 3,
    "name": "科技",
    "desc": "科技分区描述"
  }
]
```

#### `bilibili_upload_video_preprocess`

视频上传预处理，获取上传参数

**参数**:

- `access_token`: 访问令牌
- `filename`: 视频文件名

**返回**:

```json
{
  "upload_token": "上传令牌"
}
```

#### `bilibili_upload_video_chunk`

上传视频文件分片

**参数**:

- `upload_token`: 上传令牌
- `video_file_path`: 本地视频文件路径
- `part_number`: 分片编号（可选，默认1）

**返回**:

```json
{
  "success": true,
  "message": "分片上传成功"
}
```

#### `bilibili_complete_video_upload`

完成视频分片合并

**参数**:

- `upload_token`: 上传令牌

**返回**:

```json
{
  "success": true,
  "message": "视频合并成功"
}
```

#### `bilibili_upload_cover`

上传视频封面

**参数**:

- `access_token`: 访问令牌
- `cover_file_path`: 本地封面图片路径

**返回**:

```json
{
  "url": "https://archive.biliimg.com/bfs/archive/xxx.jpg"
}
```

#### `bilibili_submit_archive`

提交视频稿件

**参数**:

- `access_token`: 访问令牌
- `upload_token`: 上传令牌
- `title`: 视频标题（长度<80）
- `tag`: 视频标签（多个用英文逗号分隔，总长度<200）
- `tid`: 分区ID
- `desc`: 视频描述（可选，长度<250）
- `cover`: 封面URL（可选但建议提供）
- `copyright`: 版权类型（可选，1-原创，2-转载，默认1）
- `no_reprint`: 禁止转载（可选，0-允许，1-禁止，默认0）
- `source`: 转载来源（copyright=2时必填）

**返回**:

```json
{
  "resource_id": "BV1abc123def"
}
```

## 📋 使用限制

### 文件要求

- **视频文件**: ≤4GB，时长≤5小时
- **封面图片**: JPEG/PNG格式，≤5MB
- **标题**: 长度<80字符，短时间内不能重复
- **描述**: 长度<250字符
- **标签**: 总长度<200字符

### 投稿限制

- **非正式会员**: 单日最多5个稿件
- **审核时间**: 几分钟到几小时不等
- **权限要求**: 需要授权所有4个权限项目

## 🏗️ 项目结构

```
mcp-bilibili/
├── index.ts          # MCP服务器主程序
├── oauth.ts          # OAuth认证功能
├── user.ts           # 用户信息API
├── video.ts          # 视频管理和投稿API
├── package.json      # 项目依赖
├── tsconfig.json     # TypeScript配置
└── README.md         # 使用文档
```

## 🔐 安全说明

本工具采用B站官方OAuth 2.0授权机制：

- ✅ **用户数据安全**: 数据完全由用户控制，应用无法获取密码
- ✅ **权限可控**: 用户可选择授权哪些权限
- ✅ **标准协议**: 遵循OAuth 2.0国际标准
- ✅ **Token缓存**: 本地安全存储，避免频繁授权

## 📚 参考文档

- [B站开放平台文档](https://open.bilibili.com/doc/)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

---

**注意**: 使用本工具需要遵守B站开放平台的使用条款和社区规范。

## 🔧 故障排除

### NPX 模块依赖错误

如果使用 `npx @mcpcn/mcp-bilibili` 时遇到模块找不到的错误：

1. **清理NPX缓存**：

```bash
npx clear-npx-cache
```

2. **全局安装**（推荐）：

```bash
npm install -g @mcpcn/mcp-bilibili
mcp-bilibili
```

3. **本地开发安装**：

```bash
git clone https://github.com/mcpcn/mcp-servers
cd mcp-servers/typescript/mcp-bilibili
npm install && npm run build && npm start
```

### Node.js 版本要求

确保您的 Node.js 版本 >= 18.0.0：

```bash
node --version
```
