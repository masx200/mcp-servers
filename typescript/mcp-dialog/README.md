# 提示对话框MCP服务器

跨平台用户输入提示对话框MCP服务器，支持macOS、Windows和Linux系统。

## 功能特性

- 💬 显示输入对话框
- 🎨 自定义按钮
- 🖼️ 图标支持
- 📝 默认文本预填
- 🖥️ 跨平台支持（macOS、Windows、Linux）

## 工具

### prompt_user

显示对话框获取用户输入

**参数：**

- `message` (必需): 对话框显示的消息
- `defaultAnswer` (可选): 默认预填文本
- `buttons` (可选): 自定义按钮标签（最多3个）
- `icon` (可选): 显示图标（note, stop, caution）

**返回值：**

```json
{
  "text": "用户输入的文本",
  "buttonIndex": 1
}
```

## 安装和使用

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行
pnpm start
```

## 平台支持

- **macOS**: 使用AppleScript的`display dialog`
- **Windows**: 使用PowerShell的InputBox和MessageBox
- **Linux**: 使用zenity（自动安装）

## 示例

```json
{
  "message": "请输入您的姓名：",
  "defaultAnswer": "张三",
  "buttons": ["取消", "确定"],
  "icon": "note"
}
```

返回：

```json
{
  "text": "李四",
  "buttonIndex": 1
}
```
