# MCP 火山引擎图像抠图服务器

这是一个基于Model Context Protocol
(MCP)的服务器，专门提供火山引擎的图像抠图功能。

## 功能特性

- **智能抠图**: 使用火山引擎的显著性分割技术，自动识别并抠出图像中的主要对象
- **批量处理**: 支持同时处理多张图像
- **自动上传**: 抠图结果自动上传到服务器并返回URL链接
- **本地保存**: 可选择保存抠图结果到本地文件
- **高精度**: 基于显著性检测的精确分割算法

## 安装和配置

### 1. 安装依赖

```bash
# 使用uv安装依赖
uv sync

# 或使用pip
pip install -r requirements.txt
```

### 2. 配置API密钥

推荐使用环境变量设置API密钥：

```bash
export VOLC_ACCESS_KEY="your_access_key"
export VOLC_SECRET_KEY="your_secret_key"
```

或者在代码中直接设置（不推荐用于生产环境）。

### 3. 运行服务器

```bash
# 直接运行抠图服务器
python cutout.py

# 或使用uv
uv run cutout.py
```

## 在Claude Desktop中使用

在Claude Desktop的配置文件中添加以下配置：

**macOS/Linux**:
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "火山引擎抠图工具": {
      "command": "uv",
      "args": [
        "--directory",
        "/绝对路径/到/mcp_volc_edit",
        "run",
        "cutout.py"
      ],
      "env": {
        "VOLC_ACCESS_KEY": "your_access_key",
        "VOLC_SECRET_KEY": "your_secret_key"
      }
    }
  }
}
```

## 可用工具

### image_cutout

智能图像抠图，使用显著性分割自动识别并抠出图像中的主要对象，自动上传到服务器并返回图片URL。

**参数**:

- `image_urls`: 图像URL列表，支持多张图像同时处理

**返回**:

- 单张图片：直接返回图片URL
- 多张图片：返回所有图片URL的列表

**示例**:

```
请帮我抠出这张图片中的主要对象：https://example.com/image.jpg
```

```
批量抠图这些图片：
- https://example.com/image1.jpg
- https://example.com/image2.jpg
```

## 抠图原理

使用火山引擎的 `saliency_seg` 显著性分割算法：

- 基于视觉显著性检测图像中最重要的区域
- 精确分割显著对象的轮廓
- 生成高质量的抠图结果
- 适用于各种复杂背景的图像处理

## 上传功能

抠图完成后，系统会自动：

1. 将base64编码的图像数据转换为PNG文件
2. 上传到指定服务器：`https://www.mcpcn.cc/api/fileUploadAndDownload/uploadMcpFile`
3. 返回可访问的图片URL链接
4. 支持批量上传多张抠图结果

**上传接口返回格式**：

```json
{
  "code": 0,
  "data": {
    "url": "https://juezhi.oss-cn-shanghai.aliyuncs.com/file/uploads/mcp/xxx.webp"
  },
  "msg": "成功"
}
```

## 注意事项

1. 确保图像URL可以公开访问
2. 处理结果会以base64格式返回，大图像可能需要较长处理时间
3. API调用有频率限制，请合理使用
4. 生产环境中请使用环境变量设置API密钥

## 故障排除

### 常见问题

1. **服务器无法启动**
   - 检查Python版本（需要3.10+）
   - 确认所有依赖已正确安装

2. **API调用失败**
   - 验证API密钥是否正确
   - 检查网络连接
   - 确认图像URL可访问

3. **Claude Desktop中看不到工具**
   - 检查配置文件语法
   - 确认路径是绝对路径
   - 重启Claude Desktop

### 日志查看

服务器日志会输出到stderr，可以通过以下方式查看：

```bash
# 查看Claude Desktop的MCP日志
tail -f ~/Library/Logs/Claude/mcp-server-火山引擎图像编辑.log
```

## 开发

如需修改或扩展功能，请参考：

- [MCP官方文档](https://modelcontextprotocol.io/)
- [火山引擎API文档](https://www.volcengine.com/docs/6791/65681)
