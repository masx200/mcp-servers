# 通知MCP服务器

跨平台系统通知MCP服务器，支持macOS、Windows和Linux系统。

## 功能特性

- 📢 发送系统通知
- ⏰ 延迟发送
- 🔄 重复通知
- 🎵 声音支持
- 🖥️ 跨平台支持（macOS、Windows、Linux）

## 工具

### send_notification
发送系统通知

**参数：**
- `title` (必需): 通知标题
- `message` (必需): 通知内容
- `subtitle` (可选): 副标题
- `sound` (可选): 是否播放声音（默认true）
- `delay` (可选): 延迟发送（毫秒或"10s", "1m", "1h"格式）
- `repeat` (可选): 重复间隔（毫秒或时间字符串）
- `repeatCount` (可选): 重复次数

### notification_task_management
管理通知任务

**参数：**
- `action` (必需): 操作类型
  - `stop_repeat_task`: 停止指定任务
  - `stop_all_repeat_tasks`: 停止所有任务
  - `get_active_repeat_tasks`: 获取活跃任务
  - `get_repeat_task_info`: 获取任务信息
- `taskId` (部分操作需要): 任务ID

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

- **macOS**: 使用AppleScript的`display notification`
- **Windows**: 使用PowerShell的BalloonTip
- **Linux**: 使用`notify-send`

## 示例

```json
{
  "title": "提醒",
  "message": "这是一条测试通知",
  "subtitle": "测试",
  "sound": true,
  "delay": "5s"
}
``` 