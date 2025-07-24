# MCP 图像编辑器

一个基于云雾AI API的MCP (Model Context Protocol) 服务器，提供强大的图像编辑功能。该服务器集成了FLUX Kontext Pro模型，支持对现有图像进行智能编辑，如添加图案、修改元素、改变风格等。

## 功能特性

- 🎨 **智能图像编辑**: 使用FLUX Kontext Pro模型对图像进行精确编辑
- 🌐 **中英文支持**: 自动将中文提示词翻译为英文，提高编辑效果
- 🖼️ **多种编辑场景**: 支持添加图案、修改颜色、改变风格、添加装饰等
- 🚀 **异步处理**: 支持异步任务处理，实时查询编辑进度
- 🔗 **自动预览**: 编辑完成后自动在浏览器中打开结果图像
- 📁 **本地文件支持**: 直接处理本地图像文件

## 安装要求

- Node.js 18+
- npm 或 yarn
- 有效的云雾AI API密钥
- 百度翻译API密钥（用于中文翻译）

## 环境变量配置

在使用前，需要设置以下环境变量：

```bash
# 云雾AI API密钥
export API_KEY="your_yunwu_api_key"

# 百度翻译API配置
export BAIDU_TRANSLATE_APP_ID="your_baidu_app_id"
export BAIDU_TRANSLATE_APP_KEY="your_baidu_app_key"
```

## 安装步骤

1. 克隆项目并进入目录：
```bash
cd typescript/mcp-image-editor
```

2. 安装依赖：
```bash
npm install
```

3. 构建项目：
```bash
npm run build
```

## 使用方法

### 作为MCP服务器运行

```bash
npm run build
node dist/index.js
```

### 在MCP客户端中配置

在您的MCP客户端配置文件中添加：

```json
{
  "图像编辑器": {
    "command": "node",
    "args": ["/path/to/mcp-image-editor/dist/index.js"],
    "env": {
      "API_KEY": "your_yunwu_api_key",
      "BAIDU_TRANSLATE_APP_ID": "your_baidu_app_id",
      "BAIDU_TRANSLATE_APP_KEY": "your_baidu_app_key"
    }
  }
}
```

## 可用工具

### edit_image - 图像编辑

编辑现有图像，支持在图片上添加、修改或删除元素。

**参数：**
- `prompt` (必需): 描述如何编辑图像的文本提示
- `image` (必需): 要编辑的原始图像本地文件路径
- `use_max` (可选): 是否使用max模式（效果更好但可能更慢），默认false
- `aspect_ratio` (可选): 图像宽高比，如 '1:1', '16:9', '21:9' 等，默认"16:9"
- `n` (可选): 生成图像的数量，默认1

**使用示例：**
```javascript
// 在T恤上添加图案
{
  "prompt": "在这件白色T恤上添加一个可爱的卡通猫咪图案",
  "image": "/path/to/tshirt.jpg"
}

// 修改背景
{
  "prompt": "将背景改为美丽的海滩日落场景",
  "image": "/path/to/portrait.jpg",
  "use_max": true
}
```

## 支持的编辑场景

- ✅ 在服装上添加图案和装饰
- ✅ 修改图像背景
- ✅ 改变物体颜色和材质
- ✅ 添加或删除图像元素
- ✅ 调整图像风格和滤镜效果
- ✅ 在物体上添加文字或标识

## 技术架构

### 核心组件

1. **翻译模块** (`translate-utils.ts`): 
   - 使用百度翻译API将中文提示词翻译为英文
   - 自动检测中文字符
   - 错误处理和降级机制

2. **图像上传模块**: 
   - 支持本地图像文件上传到MCP服务器
   - 自动文件格式检测
   - 文件大小和格式验证

3. **异步编辑引擎**: 
   - 基于FLUX Kontext Pro模型
   - 支持任务提交和状态查询
   - 自动重试和错误恢复

### API集成

- **云雾AI API**: 提供图像编辑能力
- **百度翻译API**: 提供中英文翻译服务
- **MCP文件服务**: 提供图像文件托管

## 开发

### 项目结构

```
typescript/mcp-image-editor/
├── src/
│   ├── index.ts              # 主服务器文件
│   └── translate-utils.ts    # 翻译工具模块
├── dist/                     # 编译输出目录
├── package.json              # 项目配置
├── tsconfig.json            # TypeScript配置
└── README.md                # 项目文档
```

### 开发命令

```bash
# 开发模式（监听文件变化）
npm run watch

# 构建项目
npm run build

# 准备发布
npm run prepare
```

## 错误处理

服务器包含完善的错误处理机制：

- **API错误**: 自动重试和详细错误信息
- **文件错误**: 文件存在性检查和格式验证
- **网络错误**: 超时处理和连接重试
- **翻译错误**: 降级到原文本处理

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 更新日志

### v0.1
- 初始版本
- 支持图像编辑功能
- 集成百度翻译API
- 支持异步任务处理
