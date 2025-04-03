from typing import Annotated, Tuple, Optional, Literal
import base64
import io
import os
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    ErrorData,
    GetPromptResult,
    Prompt,
    PromptArgument,
    PromptMessage,
    TextContent,
    Tool,
    INVALID_PARAMS,
    INTERNAL_ERROR,
)
from pydantic import BaseModel, Field
import httpx

# 定义图片格式类型
ImageFormatType = Literal['PNG', 'JPEG', 'GIF', 'BMP', 'TIFF']

async def download_image(url: str) -> Image.Image:
    """从 URL 下载图片并返回 PIL Image 对象"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content))

def image_to_base64(img: Image.Image, format: ImageFormatType = "PNG") -> str:
    """将 PIL 图像转换为 base64 字符串"""
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def base64_to_image(base64_str: str) -> Image.Image:
    """将 base64 字符串转换为 PIL 图像"""
    img_data = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(img_data))

def infer_image_format(file_path: str) -> ImageFormatType:
    """从文件路径推断图像格式"""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.jpg', '.jpeg']:
        return 'JPEG'
    elif ext == '.gif':
        return 'GIF'
    elif ext == '.bmp':
        return 'BMP'
    elif ext == '.tiff':
        return 'TIFF'
    else:
        return 'PNG'  # 默认使用 PNG

def ensure_dir_exists(file_path: str) -> None:
    """确保文件所在的目录存在"""
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)

async def get_image(image_source: str) -> Image.Image:
    """从 URL、本地文件路径或 base64 字符串获取图像"""
    if image_source.startswith('http://') or image_source.startswith('https://'):
        return await download_image(image_source)
    elif image_source.startswith('file://'):
        file_path = image_source[7:]
        return Image.open(file_path)
    elif os.path.exists(image_source):
        return Image.open(image_source)
    else:
        try:
            return base64_to_image(image_source)
        except Exception as e:
            raise ValueError(f"无法从提供的源加载图片: {str(e)}")



def save_result_image(img: Image.Image, output_path: Optional[str]) -> str:
    """保存处理后的图像或返回base64编码"""
    if output_path:
        ensure_dir_exists(output_path)
        format = infer_image_format(output_path)
        img.save(output_path, format=format)
        return f"图片已成功保存到 {output_path}"
    else:
        return image_to_base64(img)

class ImageProcessingBase(BaseModel):
    image_source: Annotated[str, Field(description="图片来源 (URL、本地文件路径或 Base64 编码的图片)")]
    output_path: Annotated[Optional[str], Field(default=None, description="可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。")]

class CropImage(ImageProcessingBase):
    left: Annotated[int, Field(description="左边界坐标")]
    top: Annotated[int, Field(description="上边界坐标")]
    right: Annotated[int, Field(description="右边界坐标")]
    bottom: Annotated[int, Field(description="下边界坐标")]

class ResizeImage(ImageProcessingBase):
    width: Annotated[int, Field(description="目标宽度")]
    height: Annotated[int, Field(description="目标高度")]
    keep_aspect_ratio: Annotated[bool, Field(default=True, description="是否保持原始宽高比")]

class AdjustImage(ImageProcessingBase):
    factor: Annotated[float, Field(description="调整因子 (0.0-2.0, 1.0为原始值)")]

class ApplyFilter(ImageProcessingBase):
    filter_type: Annotated[str, Field(description="滤镜类型，可选值: 'blur', 'sharpen', 'edge_enhance', 'emboss', 'contour'")]

class AddText(ImageProcessingBase):
    text: Annotated[str, Field(description="要添加的文字")]
    x: Annotated[int, Field(description="文字的 x 坐标")]
    y: Annotated[int, Field(description="文字的 y 坐标")]
    font_size: Annotated[int, Field(default=20, description="字体大小")]
    color: Annotated[str, Field(default="black", description="文字颜色 (如 'black', 'white', 'red', '#FF0000')")]

class FlipImage(ImageProcessingBase):
    direction: Annotated[str, Field(description="翻转方向，可选值: 'horizontal', 'vertical'")]

class MergeImages(BaseModel):
    image1_source: Annotated[str, Field(description="第一张图片的来源 (URL、本地文件路径或 Base64 编码的图片)（背景图）")]
    image2_source: Annotated[str, Field(description="第二张图片的来源 (URL、本地文件路径或 Base64 编码的图片)（前景图）")]
    position: Annotated[Tuple[int, int], Field(description="放置第二张图片的位置坐标 (x, y)")]
    output_path: Annotated[Optional[str], Field(default=None, description="可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。")]

class AddBorder(ImageProcessingBase):
    border_width: Annotated[int, Field(description="边框宽度（像素）")]
    color: Annotated[str, Field(default="black", description="边框颜色 (如 'black', 'white', 'red', '#FF0000')")]

class RepairImage(ImageProcessingBase):
    radius: Annotated[int, Field(default=2, description="滤波器半径，值越大修复效果越强但可能会模糊图像")]


async def serve() -> None:
    server = Server("mcp-image-processing")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(name="crop_image", description="从图片中裁切出指定区域", inputSchema=CropImage.model_json_schema()),
            Tool(name="resize_image", description="调整图片的尺寸", inputSchema=ResizeImage.model_json_schema()),
            Tool(name="adjust_brightness", description="调整图片亮度", inputSchema=AdjustImage.model_json_schema()),
            Tool(name="adjust_contrast", description="调整图片对比度", inputSchema=AdjustImage.model_json_schema()),
            Tool(name="apply_filter", description="应用滤镜效果到图片", inputSchema=ApplyFilter.model_json_schema()),
            Tool(name="add_text", description="在图片上添加文字", inputSchema=AddText.model_json_schema()),
            Tool(name="flip_image", description="水平或垂直翻转图片", inputSchema=FlipImage.model_json_schema()),
            Tool(name="add_border", description="给图片添加边框", inputSchema=AddBorder.model_json_schema()),
            Tool(name="repair_image", description="修复图片中的小缺陷", inputSchema=RepairImage.model_json_schema()),
            Tool(name="get_image_info", description="获取图片的基本信息", inputSchema=ImageProcessingBase.model_json_schema()),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        try:
            if name == "crop_image":
                args = CropImage(**arguments)
                img = await get_image(args.image_source)
                cropped_img = img.crop((args.left, args.top, args.right, args.bottom))
                result = save_result_image(cropped_img, args.output_path)
            elif name == "resize_image":
                args = ResizeImage(**arguments)
                img = await get_image(args.image_source)
                if args.keep_aspect_ratio:
                    img.thumbnail((args.width, args.height), Image.Resampling.LANCZOS)
                else:
                    img = img.resize((args.width, args.height), Image.Resampling.LANCZOS)
                result = save_result_image(img, args.output_path)
            elif name in ["adjust_brightness", "adjust_contrast"]:
                args = AdjustImage(**arguments)
                img = await get_image(args.image_source)
                enhancer = getattr(ImageEnhance, name.split('_')[1].capitalize())(img)
                adjusted_img = enhancer.enhance(args.factor)
                result = save_result_image(adjusted_img, args.output_path)
            elif name == "apply_filter":
                args = ApplyFilter(**arguments)
                img = await get_image(args.image_source)
                filters = {
                    'blur': ImageFilter.BLUR,
                    'sharpen': ImageFilter.SHARPEN,
                    'edge_enhance': ImageFilter.EDGE_ENHANCE,
                    'emboss': ImageFilter.EMBOSS,
                    'contour': ImageFilter.CONTOUR
                }
                if args.filter_type not in filters:
                    raise ValueError(f"不支持的滤镜类型 '{args.filter_type}'")
                filtered_img = img.filter(filters[args.filter_type])
                result = save_result_image(filtered_img, args.output_path)
            elif name == "add_text":
                args = AddText(**arguments)
                img = await get_image(args.image_source)
                img = img.convert("RGBA")
                draw = ImageDraw.Draw(img)
                try:
                    font = ImageFont.truetype("arial.ttf", args.font_size)
                except IOError:
                    font = ImageFont.load_default()
                draw.text((args.x, args.y), args.text, fill=args.color, font=font)
                result = save_result_image(img, args.output_path)
            elif name == "flip_image":
                args = FlipImage(**arguments)
                img = await get_image(args.image_source)
                if args.direction == 'horizontal':
                    flipped_img = img.transpose(Image.FLIP_LEFT_RIGHT)
                elif args.direction == 'vertical':
                    flipped_img = img.transpose(Image.FLIP_TOP_BOTTOM)
                else:
                    raise ValueError(f"不支持的翻转方向 '{args.direction}'")
                result = save_result_image(flipped_img, args.output_path)
            elif name == "add_border":
                args = AddBorder(**arguments)
                img = await get_image(args.image_source)
                width, height = img.size
                new_width, new_height = width + 2 * args.border_width, height + 2 * args.border_width
                bordered_img = Image.new("RGBA", (new_width, new_height), args.color)
                bordered_img.paste(img, (args.border_width, args.border_width))
                result = save_result_image(bordered_img, args.output_path)
            elif name == "repair_image":
                args = RepairImage(**arguments)
                img = await get_image(args.image_source)
                repaired_img = img.filter(ImageFilter.MedianFilter(size=args.radius * 2 + 1))
                result = save_result_image(repaired_img, args.output_path)
            elif name == "get_image_info":
                args = ImageProcessingBase(**arguments)
                img = await get_image(args.image_source)
                info = {
                    "尺寸": f"{img.width} x {img.height} 像素",
                    "格式": img.format if img.format else "未知",
                    "模式": img.mode,
                    "色彩空间": "RGB" if img.mode == "RGB" else "RGBA" if img.mode == "RGBA" else img.mode
                }
                result = str(info)
            else:
                raise ValueError(f"未知的工具名称: {name}")

            return [TextContent(type="text", text=result)]
        except Exception as e:
            raise McpError(ErrorData(code=INTERNAL_ERROR, message=str(e)))

    @server.list_prompts()
    async def list_prompts() -> list[Prompt]:
        return []

    @server.get_prompt()
    async def get_prompt(name: str, arguments: dict | None) -> GetPromptResult:
        raise McpError(ErrorData(code=INVALID_PARAMS, message="不支持的操作"))

    options = server.create_initialization_options()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, options, raise_exceptions=True)


def main():
    print("ImagePro is starting...")
    import asyncio
    asyncio.run(serve())


if __name__ == '__main__':
    main()



