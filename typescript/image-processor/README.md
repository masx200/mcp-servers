# Image Processor MCP Server

这是一个用于图片处理的 MCP 服务器，提供了多种图片处理功能。

## 功能特性

1. 图片格式转换
2. 图片压缩到指定大小
3. 图片压缩到原始大小的指定百分比
4. 图片尺寸缩放
5. 读取图片元数据
6. 图像旋转
7. 图像翻转
8. 添加文字水印

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 运行服务器

```bash
npm start
```

## 开发模式

```bash
npm run dev
```

## MCP 工具

### 1. image_convert_format

将图片转换为指定格式。

**参数：**

- `inputPaths`: 原图片路径数组，支持图片文件和目录
- `targetFormat`: 要转换为的格式（jpg/png/webp/bmp等）
- `outputPath`: 转换后的保存路径（可选，不指定则和原图片目录相同）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg", "path/to/images/"],
  "targetFormat": "png",
  "outputPath": "path/to/output/"
}
```

### 2. image_compress_to_size

将图片压缩到指定的文件大小。

**参数：**

- `inputPaths`: 原图片路径数组，支持图片文件和目录
- `size`: 要压缩到的的目标大小（如1mb/500kb）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "size": "500kb",
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

### 3. image_compress_to_percent

将图片压缩到原始大小的指定百分比。

**参数：**

- `inputPaths`: 原图片路径数组，支持图片文件和目录
- `percent`: 要压缩到原size的百分之多少（如50或50%）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "percent": "50%",
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

### 4. image_resize

调整图片尺寸。

**参数：**

- `inputPaths`: 原图片路径数组，支持图片文件和目录
- `width`: 宽修改为多少（可选）
- `height`: 高修改为多少（可选）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "width": 800,
  "height": 600,
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

### 5. image_metadata

读取图片元数据。

**参数：**

- `inputPaths`: 待处理图片路径

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"]
}
```

**返回示例：**

```json
{
  "success": true,
  "message": "成功读取了 1 个图片的元数据",
  "metadata": {
    "image.jpg": {
      "format": "jpeg",
      "width": 1920,
      "height": 1080,
      "space": "srgb",
      "channels": 3,
      "depth": "uchar",
      "density": 72,
      "isProgressive": false,
      "hasProfile": true,
      "hasAlpha": false
    }
  }
}
```

### 6. image_rotate

图像旋转。

**参数：**

- `inputPaths`: 待处理图片路径
- `angle`: 旋转角度（顺时针为正值，逆时针为负值）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "angle": 90,
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

### 7. image_flip

图像翻转。

**参数：**

- `inputPaths`: 待处理图片路径
- `flipType`: 翻转方式（"horizontal": 水平翻转, "vertical": 垂直翻转）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "flipType": "horizontal",
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

### 8. image_watermark

添加文字水印。

**参数：**

- `inputPaths`: 待处理图片路径
- `text`: 水印内容（文字）
- `position`: 水印添加方式（必填，可能的取值为：top-left（左上）、top-right（右上）、bottom-left（左下）、bottom-right（右下）、center（中央）、tile（铺满））
- `density`: 满铺密度（可选参数，在水印添加方式为铺满时有效，取值范围为1-10的整数，1最稀疏，10最密）
- `fontSize`: 文字尺寸（可选参数，单位为像素，不传则根据图片尺寸自动计算）
- `overwrite`: 是否覆盖原图（可选，默认为false）
- `outputPath`: 存储路径（可选，不覆盖原图时如果没传则为原图所在目录）

**示例：**

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "text": "版权所有",
  "position": "bottom-right",
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

铺满水印示例：

```json
{
  "inputPaths": ["path/to/image.jpg"],
  "text": "CONFIDENTIAL",
  "position": "tile",
  "density": 5,
  "fontSize": 20,
  "overwrite": false,
  "outputPath": "path/to/output/"
}
```

## 注意事项

1. 所有功能都支持批量处理多个文件
2. 支持处理整个目录中的图片（仅处理目录下的图片文件，不处理子目录中的）
3. 支持的图片格式：jpeg、jpg、png、webp、gif、avif、tiff、bmp
4. 压缩功能使用二分查找算法来找到最佳的压缩质量
5. 当指定输出目录时，如果目录不存在会自动创建
6. 所有错误都会被优雅地处理并记录，不会中断批处理过程

## 使用作为 MCP 服务器

该服务器实现了 Model Context Protocol (MCP) 规范，可以连接到支持 MCP 的客户端。

### 配置环境变量

在使用前，确保已安装所有依赖，并构建项目：

```bash
npm install
npm run build
```

### 启动服务器

```bash
npm start
```

## 依赖

- sharp: 用于图片处理
- @modelcontextprotocol/sdk: MCP SDK
- TypeScript: 用于类型检查和编译 