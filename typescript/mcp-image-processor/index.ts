#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// 支持的图片格式
const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tiff', 'bmp'];

// 工具函数：检查文件是否是图片
function isImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return SUPPORTED_FORMATS.includes(ext);
}

// 工具函数：获取目录下的所有图片
function getImagesFromDirectory(dirPath: string): string[] {
  try {
    const files = fs.readdirSync(dirPath);
    return files
      .map(file => path.join(dirPath, file))
      .filter(filePath => {
        const stat = fs.statSync(filePath);
        return stat.isFile() && isImage(filePath);
      });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

// 工具函数：处理输入路径数组
function processInputPaths(inputPaths: string[]): string[] {
  if (!inputPaths || inputPaths.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, "inputPaths cannot be empty");
  }
  const result: string[] = [];
  for (const inputPath of inputPaths) {
    if (!fs.existsSync(inputPath)) {
      throw new McpError(ErrorCode.InvalidParams, `inputPath not found: ${inputPath}`);
    }
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
      result.push(...getImagesFromDirectory(inputPath));
    } else if (stat.isFile() && isImage(inputPath)) {
      result.push(inputPath);
    }
  }
  return result;
}

// 工具函数：解析大小字符串（如 "1mb", "500kb"）
function parseSize(sizeStr: string): number {
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)(mb|kb)$/);
  if (!match) {
    throw new Error('Invalid size format. Expected format: "1mb" or "500kb"');
  }
  
  const [, size, unit] = match;
  const bytes = parseFloat(size) * (unit === 'mb' ? 1024 * 1024 : 1024);
  return Math.floor(bytes);
}

// 工具函数：解析百分比字符串
function parsePercent(percentStr: string): number {
  const match = percentStr.toString().match(/^(\d+(?:\.\d+)?)%?$/);
  if (!match) {
    throw new Error('Invalid percent format. Expected format: "50" or "50%"');
  }
  
  const percent = parseFloat(match[1]);
  if (percent <= 0 || percent > 100) {
    throw new Error('Percent must be between 0 and 100');
  }
  
  return percent;
}

// 工具函数：生成输出路径
function generateOutputPath(
  inputPath: string,
  outputPath: string | undefined,
  suffix: string,
  format?: string
): string {
  const parsedPath = path.parse(inputPath);
  const newExt = format ? `.${format}` : parsedPath.ext;
  const newName = `${parsedPath.name}${suffix}${newExt}`;
  
  if (outputPath) {
    // 确保输出目录存在
    fs.mkdirSync(outputPath, { recursive: true });
    return path.join(outputPath, newName);
  }
  
  return path.join(parsedPath.dir, newName);
}

/**
 * 图片格式转换
 */
async function convertFormat(
  inputPaths: string[],
  targetFormat: string,
  outputPath?: string
): Promise<string[]> {
  if (!SUPPORTED_FORMATS.includes(targetFormat.toLowerCase())) {
    throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${targetFormat}`);
  }
  const images = processInputPaths(inputPaths);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const outputFilePath = generateOutputPath(imagePath, outputPath, '', targetFormat);
      
      await sharp.default(imagePath)
        .toFormat(targetFormat as keyof sharp.FormatEnum)
        .toFile(outputFilePath);
        
      results.push(outputFilePath);
    } catch (error) {
      console.error(`Error converting ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 图片压缩到目标大小
 */
async function compressToSize(
  inputPaths: string[],
  targetSize: string,
  overwrite: boolean = false,
  outputPath?: string
): Promise<string[]> {
  const images = processInputPaths(inputPaths);
  const targetBytes = parseSize(targetSize);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(imagePath, outputPath, `_${targetSize.toLowerCase()}`);
      
      const image = sharp.default(imagePath);
      const metadata = await image.metadata();
      const stats = fs.statSync(imagePath);
      
      if (stats.size <= targetBytes) {
        if (!overwrite) {
          await fs.promises.copyFile(imagePath, outputFilePath);
        }
        results.push(outputFilePath);
        continue;
      }
      
      // 使用二分查找找到合适的质量值
      let left = 1;
      let right = 100;
      let bestQuality = 100;
      let bestBuffer: Buffer | null = null;
      
      while (left <= right) {
        const quality = Math.floor((left + right) / 2);
        const buffer = await image
          .jpeg({ quality })
          .toBuffer();
        
        if (buffer.length <= targetBytes) {
          bestQuality = quality;
          bestBuffer = buffer;
          left = quality + 1;
        } else {
          right = quality - 1;
        }
      }
      
      if (bestBuffer) {
        await fs.promises.writeFile(outputFilePath, bestBuffer);
        results.push(outputFilePath);
      } else {
        throw new Error('Could not achieve target size while maintaining acceptable quality');
      }
    } catch (error) {
      console.error(`Error compressing ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 图片压缩到原始大小的百分比
 */
async function compressToPercent(
  inputPaths: string[],
  percent: string,
  overwrite: boolean = false,
  outputPath?: string
): Promise<string[]> {
  const images = processInputPaths(inputPaths);
  const targetPercent = parsePercent(percent);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(imagePath, outputPath, `_${targetPercent}%`);
      
      const stats = fs.statSync(imagePath);
      const targetBytes = Math.floor(stats.size * (targetPercent / 100));
      
      const image = sharp.default(imagePath);
      const metadata = await image.metadata();
      
      // 使用二分查找找到合适的质量值
      let left = 1;
      let right = 100;
      let bestQuality = 100;
      let bestBuffer: Buffer | null = null;
      
      while (left <= right) {
        const quality = Math.floor((left + right) / 2);
        const buffer = await image
          .jpeg({ quality })
          .toBuffer();
        
        if (buffer.length <= targetBytes) {
          bestQuality = quality;
          bestBuffer = buffer;
          left = quality + 1;
        } else {
          right = quality - 1;
        }
      }
      
      if (bestBuffer) {
        await fs.promises.writeFile(outputFilePath, bestBuffer);
        results.push(outputFilePath);
      } else {
        throw new Error('Could not achieve target size while maintaining acceptable quality');
      }
    } catch (error) {
      console.error(`Error compressing ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 图片尺寸缩放
 */
async function resize(
  inputPaths: string[],
  width?: number,
  height?: number,
  overwrite: boolean = false,
  outputPath?: string
): Promise<string[]> {
  if (!width && !height) {
    throw new McpError(ErrorCode.InvalidParams, 'At least one of width or height must be specified');
  }
  const images = processInputPaths(inputPaths);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const image = sharp.default(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not get image dimensions');
      }
      
      let resizeOptions: sharp.ResizeOptions = {};
      
      if (width && height) {
        // 指定宽高，可能会变形
        resizeOptions = { width, height };
      } else if (width) {
        // 只指定宽度，保持宽高比
        resizeOptions = { width };
      } else if (height) {
        // 只指定高度，保持宽高比
        resizeOptions = { height };
      }
      
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(
          imagePath, 
          outputPath, 
          `_${width || 'auto'}_${height || 'auto'}`
        );
      
      await image
        .resize(resizeOptions)
        .toFile(outputFilePath);
      
      results.push(outputFilePath);
    } catch (error) {
      console.error(`Error resizing ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 读取图片元数据
 */
async function getMetadata(
  inputPaths: string[]
): Promise<Record<string, sharp.Metadata>> {
  const images = processInputPaths(inputPaths);
  const results: Record<string, sharp.Metadata> = {};
  
  for (const imagePath of images) {
    try {
      const image = sharp.default(imagePath);
      const metadata = await image.metadata();
      
      // 使用文件名作为键
      const fileName = path.basename(imagePath);
      results[fileName] = metadata;
      
    } catch (error) {
      console.error(`Error reading metadata from ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 图像旋转
 */
async function rotate(
  inputPaths: string[],
  angle: number,
  overwrite: boolean = false,
  outputPath?: string
): Promise<string[]> {
  const images = processInputPaths(inputPaths);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(imagePath, outputPath, `_${angle}`);
      
      const image = sharp.default(imagePath);
      
      await image
        .rotate(angle)
        .toFile(outputFilePath);
      

      results.push(outputFilePath);
    } catch (error) {
      console.error(`Error rotating ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 图像翻转
 */
async function flip(
  inputPaths: string[],
  flipType: 'horizontal' | 'vertical',
  overwrite: boolean = false,
  outputPath?: string
): Promise<string[]> {
  const images = processInputPaths(inputPaths);
  const results: string[] = [];
  
  for (const imagePath of images) {
    try {
      const suffix = flipType === 'horizontal' ? '_h_flipped' : '_v_flipped';
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(imagePath, outputPath, suffix);
      
      const image = sharp.default(imagePath);
      
      if (flipType === 'horizontal') {
        await image
          .flop() // 水平翻转
          .toFile(outputFilePath);
      } else {
        await image
          .flip() // 垂直翻转
          .toFile(outputFilePath);
      }
      
      results.push(outputFilePath);
    } catch (error) {
      console.error(`Error flipping ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * 添加文字水印
 */
async function addTextWatermark(
  inputPaths: string[],
  text: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tile',
  density: number = 5,
  overwrite: boolean = false,
  outputPath?: string,
  fontSize?: number
): Promise<string[]> {
  const images = processInputPaths(inputPaths);
  const results: string[] = [];
  
  // 创建SVG文本水印
  const createTextSvg = (width: number, height: number, text: string, position: string, density: number, customFontSize?: number) => {
    // 基本字体大小，根据图片尺寸调整或使用自定义尺寸
    const baseFontSize = customFontSize || Math.max(Math.min(width, height) / 30, 8);
    
    // 密度转换为实际间距（像素）
    // 改进密度计算方式，使水印间隔更合理
    // 文字尺寸越大，间距越大，以保证可见性
    // 基础间距：密度1对应图像宽度的40%，密度10对应图像宽度的15%
    const baseSpacing = (width * (0.4 - (density - 1) * 0.025));
    // 根据字体大小调整间距
    const spacing = Math.max(baseFontSize * 5, baseSpacing);
    
    if (position === 'tile') {
      // 计算网格中文字的数量，但要确保不会过于密集
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      
      let svgContent = '';
      
      // 计算水印旋转角度，使其不那么显眼
      const rotateAngle = 20;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // 交错排列水印，使其更加分散
          const offsetX = (row % 2) * (spacing / 2);
          const x = col * spacing + offsetX;
          const y = row * spacing + baseFontSize;
          
          // 透明度固定为较低值，确保不遮挡原图
          const opacity = 0.15 + ((density - 1) / 20);
          
          svgContent += `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${baseFontSize}px" fill="rgba(255,255,255,${opacity})" transform="rotate(${rotateAngle} ${x} ${y})">${text}</text>`;
        }
      }
      
      return `<svg width="${width}" height="${height}">${svgContent}</svg>`;
    } else {
      // 确定位置坐标
      let x = 0, y = 0;
      const padding = baseFontSize;
      
      switch (position) {
        case 'top-left':
          x = padding;
          y = baseFontSize + padding;
          break;
        case 'top-right':
          x = width - (text.length * baseFontSize * 0.6) - padding;
          y = baseFontSize + padding;
          break;
        case 'bottom-left':
          x = padding;
          y = height - padding;
          break;
        case 'bottom-right':
          x = width - (text.length * baseFontSize * 0.6) - padding;
          y = height - padding;
          break;
        case 'center':
          x = width / 2 - (text.length * baseFontSize * 0.3);
          y = height / 2 + baseFontSize / 2;
          break;
      }
      
      // 非满铺水印的透明度固定
      return `<svg width="${width}" height="${height}">
        <text x="${x}" y="${y}" font-family="sans-serif" font-size="${baseFontSize}px" fill="rgba(255,255,255,0.4)">${text}</text>
      </svg>`;
    }
  };
  
  for (const imagePath of images) {
    try {
      const outputFilePath = overwrite ? 
        imagePath : 
        generateOutputPath(imagePath, outputPath, `_watermark`);
      
      const image = sharp.default(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not get image dimensions');
      }
      
      // 根据位置参数获取中文描述（仅用于日志输出）
      let positionDesc = '';
      switch (position) {
        case 'top-left': positionDesc = '左上'; break;
        case 'top-right': positionDesc = '右上'; break;
        case 'bottom-left': positionDesc = '左下'; break;
        case 'bottom-right': positionDesc = '右下'; break;
        case 'center': positionDesc = '中央'; break;
        case 'tile': positionDesc = '铺满'; break;
      }
      
      // 创建水印SVG
      const watermarkSvg = createTextSvg(
        metadata.width, 
        metadata.height, 
        text, 
        position,
        position === 'tile' ? density : 5,
        fontSize
      );
      
      const watermarkBuffer = Buffer.from(watermarkSvg);
      
      // 合成水印
      await image
        .composite([
          {
            input: watermarkBuffer,
            gravity: 'northwest', // 从左上角定位，实际位置通过SVG控制
          },
        ])
        .toFile(outputFilePath);
      
      results.push(outputFilePath);
    } catch (error) {
      console.error(`Error adding watermark to ${imagePath}:`, error);
    }
  }
  
  return results;
}

// Tool 定义
const CONVERT_FORMAT_TOOL: Tool = {
  name: "image_convert_format",
  description: "图片格式转换",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "原图片路径数组，支持图片文件和目录"
      },
      targetFormat: {
        type: "string",
        description: "要转换为的格式（jpg/png/webp/bmp等）"
      },
      outputPath: {
        type: "string",
        description: "转换后的保存路径（可选，不指定则和原图片目录相同）"
      }
    },
    required: ["inputPaths", "targetFormat"]
  }
};

const COMPRESS_TO_SIZE_TOOL: Tool = {
  name: "image_compress_to_size",
  description: "图片压缩到目标大小",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "原图片路径数组，支持图片文件和目录"
      },
      size: {
        type: "string",
        description: "要压缩到的的目标大小（如1mb/500kb）"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖原图（可选，默认为false）"
      },
      outputPath: {
        type: "string",
        description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
      }
    },
    required: ["inputPaths", "size"]
  }
};

const COMPRESS_TO_PERCENT_TOOL: Tool = {
  name: "image_compress_to_percent",
  description: "图片压缩到原始大小的百分比",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "原图片路径数组，支持图片文件和目录"
      },
      percent: {
        type: "string",
        description: "要压缩到原size的百分之多少（如50或50%）"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖原图（可选，默认为false）"
      },
      outputPath: {
        type: "string",
        description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
      }
    },
    required: ["inputPaths", "percent"]
  }
};

const RESIZE_TOOL: Tool = {
  name: "image_resize",
  description: "图片尺寸缩放",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "待处理图片路径数组，支持图片文件和目录"
      },
      width: {
        type: "number",
        description: "宽修改为多少（可选）"
      },
      height: {
        type: "number",
        description: "高修改为多少（可选）"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖原图（可选，默认为false）"
      },
      outputPath: {
        type: "string",
        description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
      }
    },
    required: ["inputPaths"]
  }
};

const METADATA_TOOL: Tool = {
  name: "image_metadata",
  description: "读取图片元数据",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "待处理图片路径数组，支持图片文件和目录"
      }
    },
    required: ["inputPaths"]
  }
};

const ROTATE_TOOL: Tool = {
  name: "image_rotate",
  description: "图像旋转",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "待处理图片路径数组，支持图片文件和目录"
      },
      angle: {
        type: "number",
        description: "旋转角度（顺时针为正值，逆时针为负值）"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖原图（可选，默认为false）"
      },
      outputPath: {
        type: "string",
        description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
      }
    },
    required: ["inputPaths", "angle"]
  }
};

const FLIP_TOOL: Tool = {
  name: "image_flip",
  description: "图像翻转",
  inputSchema: {
    type: "object",
    properties: {
      inputPaths: {
        type: "array",
        items: { type: "string" },
        description: "待处理图片路径数组，支持图片文件和目录"
      },
      flipType: {
        type: "string",
        enum: ["horizontal", "vertical"],
        description: "翻转方式（horizontal: 水平翻转, vertical: 垂直翻转）"
      },
      overwrite: {
        type: "boolean",
        description: "是否覆盖原图（可选，默认为false）"
      },
      outputPath: {
        type: "string",
        description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
      }
    },
    required: ["inputPaths", "flipType"]
  }
};

// const WATERMARK_TOOL: Tool = {
//   name: "image_watermark",
//   description: "添加文字水印",
//   inputSchema: {
//     type: "object",
//     properties: {
//       inputPaths: {
//         type: "array",
//         items: { type: "string" },
//         description: "待处理图片路径数组，支持图片文件和目录"
//       },
//       text: {
//         type: "string",
//         description: "水印内容（文字）"
//       },
//       position: {
//         type: "string",
//         enum: ["top-left", "top-right", "bottom-left", "bottom-right", "center", "tile"],
//         description: "水印添加方式（左上、右上、左下、右下、中央、铺满）"
//       },
//       density: {
//         type: "number",
//         description: "满铺密度（可选参数，在水印添加方式为铺满时有效，取值范围为1-10的整形，1最稀疏，10最密）"
//       },
//       fontSize: {
//         type: "number",
//         description: "文字尺寸（可选参数，不传则根据图片尺寸自动计算）"
//       },
//       overwrite: {
//         type: "boolean",
//         description: "是否覆盖原图（可选，默认为false）"
//       },
//       outputPath: {
//         type: "string",
//         description: "存储路径（可选，不覆盖原图时如果没传则为原图所在目录）"
//       }
//     },
//     required: ["inputPaths", "text", "position"]
//   }
// };

const IMAGE_TOOLS = [
  CONVERT_FORMAT_TOOL,
  COMPRESS_TO_SIZE_TOOL,
  COMPRESS_TO_PERCENT_TOOL,
  RESIZE_TOOL,
  METADATA_TOOL,
  ROTATE_TOOL,
  FLIP_TOOL,
  // WATERMARK_TOOL
] as const;

// 处理工具调用的函数
async function handleConvertFormat(inputPaths: string[], targetFormat: string, outputPath?: string) {
  try {
    const results = await convertFormat(inputPaths, targetFormat, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功转换了 ${results.length} 张图片，保存在${outputPath}`,
          convertedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleCompressToSize(
  inputPaths: string[],
  size: string,
  overwrite: boolean = false,
  outputPath?: string
) {
  try {
    const results = await compressToSize(inputPaths, size, overwrite, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功压缩了 ${results.length} 张图片到目标大小 ${size}，保存在${outputPath}`,
          compressedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleCompressToPercent(
  inputPaths: string[],
  percent: string,
  overwrite: boolean = false,
  outputPath?: string
) {
  try {
    const results = await compressToPercent(inputPaths, percent, overwrite, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功压缩了 ${results.length} 张图片到原始大小的 ${parsePercent(percent)}%，保存在${outputPath}`,
          compressedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleResize(
  inputPaths: string[],
  width?: number,
  height?: number,
  overwrite: boolean = false,
  outputPath?: string
) {
  try {
    const results = await resize(inputPaths, width, height, overwrite, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功调整了 ${results.length} 张图片的尺寸，保存在${outputPath}`,
          resizedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleMetadata(inputPaths: string[]) {
  try {
    const results = await getMetadata(inputPaths);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功读取了 ${Object.keys(results).length} 张图片的元数据`,
          metadata: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleRotate(
  inputPaths: string[],
  angle: number,
  overwrite: boolean = false,
  outputPath?: string
) {
  try {
    const results = await rotate(inputPaths, angle, overwrite, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功旋转了 ${results.length} 张图片（角度: ${angle}°），保存在${outputPath}`,
          rotatedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleFlip(
  inputPaths: string[],
  flipType: 'horizontal' | 'vertical',
  overwrite: boolean = false,
  outputPath?: string
) {
  try {
    const results = await flip(inputPaths, flipType, overwrite, outputPath);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功${flipType === 'horizontal' ? '水平' : '垂直'}翻转了 ${results.length} 张图片，保存在${outputPath}`,
          flippedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

async function handleWatermark(
  inputPaths: string[],
  text: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tile',
  density: number = 5,
  overwrite: boolean = false,
  outputPath?: string,
  fontSize?: number
) {
  try {
    // 验证密度参数
    if (position === 'tile' && (density < 1 || density > 10 || !Number.isInteger(density))) {
      throw new Error('满铺密度必须是1-10之间的整数');
    }
    
    // 验证字体大小参数
    if (fontSize !== undefined && (fontSize <= 0)) {
      throw new Error('字体大小必须大于0');
    }
    
    const results = await addTextWatermark(inputPaths, text, position, density, overwrite, outputPath, fontSize);
    
    let positionDesc = '';
    switch (position) {
      case 'top-left': positionDesc = '左上'; break;
      case 'top-right': positionDesc = '右上'; break;
      case 'bottom-left': positionDesc = '左下'; break;
      case 'bottom-right': positionDesc = '右下'; break;
      case 'center': positionDesc = '中央'; break;
      case 'tile': positionDesc = '铺满'; break;
    }
    
    const fontSizeInfo = fontSize ? `，字体大小: ${fontSize}px` : '';
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `成功为 ${results.length} 张图片添加${positionDesc}水印${fontSizeInfo}，保存在${outputPath}`,
          watermarkedFiles: results
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
  }
}

// 服务器设置
const server = new Server(
  {
    name: "mcp-server/image-processor",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: IMAGE_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "image_convert_format": {
        const { inputPaths, targetFormat, outputPath } = request.params.arguments as {
          inputPaths: string[];
          targetFormat: string;
          outputPath?: string;
        };
        return await handleConvertFormat(inputPaths, targetFormat, outputPath);
      }
      
      case "image_compress_to_size": {
        const { inputPaths, size, overwrite, outputPath } = request.params.arguments as {
          inputPaths: string[];
          size: string;
          overwrite?: boolean;
          outputPath?: string;
        };
        return await handleCompressToSize(inputPaths, size, overwrite, outputPath);
      }
      
      case "image_compress_to_percent": {
        const { inputPaths, percent, overwrite, outputPath } = request.params.arguments as {
          inputPaths: string[];
          percent: string;
          overwrite?: boolean;
          outputPath?: string;
        };
        return await handleCompressToPercent(inputPaths, percent, overwrite, outputPath);
      }
      
      case "image_resize": {
        const { inputPaths, width, height, overwrite, outputPath } = request.params.arguments as {
          inputPaths: string[];
          width?: number;
          height?: number;
          overwrite?: boolean;
          outputPath?: string;
        };
        return await handleResize(inputPaths, width, height, overwrite, outputPath);
      }
      
      case "image_metadata": {
        const { inputPaths } = request.params.arguments as {
          inputPaths: string[];
        };
        return await handleMetadata(inputPaths);
      }
      
      case "image_rotate": {
        const { inputPaths, angle, overwrite, outputPath } = request.params.arguments as {
          inputPaths: string[];
          angle: number;
          overwrite?: boolean;
          outputPath?: string;
        };
        return await handleRotate(inputPaths, angle, overwrite, outputPath);
      }
      
      case "image_flip": {
        const { inputPaths, flipType, overwrite, outputPath } = request.params.arguments as {
          inputPaths: string[];
          flipType: 'horizontal' | 'vertical';
          overwrite?: boolean;
          outputPath?: string;
        };
        return await handleFlip(inputPaths, flipType, overwrite, outputPath);
      }
      
      // case "image_watermark": {
      //   const { inputPaths, text, position, density, overwrite, outputPath, fontSize } = request.params.arguments as {
      //     inputPaths: string[];
      //     text: string;
      //     position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tile';
      //     density?: number;
      //     overwrite?: boolean;
      //     outputPath?: string;
      //     fontSize?: number;
      //   };
      //   return await handleWatermark(inputPaths, text, position, density, overwrite, outputPath, fontSize);
      // }
      
      default:
        return {
          content: [{
            type: "text",
            text: `未知工具: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Image Processor MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 