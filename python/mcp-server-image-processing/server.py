from typing import Tuple, Optional, Literal
import base64
import io
import os
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
from mcp.server.fastmcp import FastMCP
import httpx

# 初始化 FastMCP 服务器
mcp = FastMCP("mcpimageprocessing",log_level="ERROR")

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
    """从 URL、本地文件路径或 base64 字符串获取图像

    Args:
        image_source: 图片来源，可以是:
            - URL (以 http:// 或 https:// 开头)
            - 本地文件路径 (以 file:// 开头或直接是路径)
            - Base64 编码的图片字符串
    """
    if image_source.startswith('http://') or image_source.startswith('https://'):
        return await download_image(image_source)
    elif image_source.startswith('file://'):
        # 移除 file:// 前缀
        file_path = image_source[7:]
        return Image.open(file_path)
    elif os.path.exists(image_source):
        # 直接是文件路径
        return Image.open(image_source)
    else:
        # 假设是 base64 字符串
        try:
            return base64_to_image(image_source)
        except Exception as e:
            raise ValueError(f"无法从提供的源加载图片: {str(e)}")


def save_result_image(img: Image.Image, output_path: Optional[str]) -> str:
    """保存处理后的图像或返回base64编码

    Args:
        img: 要保存的PIL图像
        output_path: 保存路径，如果为None则返回base64编码

    Returns:
        保存成功的消息或base64编码的图像字符串
    """
    if output_path:
        ensure_dir_exists(output_path)
        format = infer_image_format(output_path)
        img.save(output_path, format=format)
        return f"图片已成功保存到 {output_path}"
    else:
        return image_to_base64(img)


@mcp.tool()
async def save_image(image_source: str, output_path: str, format: Optional[str] = None) -> str:
    """将图片保存到本地文件。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        output_path: 保存图片的本地路径
        format: 图片格式 (如 'PNG', 'JPEG', 'GIF')，如果为 None 则自动从文件扩展名推断

    Returns:
        保存成功的消息
    """
    img = await get_image(image_source)
    ensure_dir_exists(output_path)

    # 如果没有指定格式，尝试从文件扩展名推断
    if format is None:
        format = infer_image_format(output_path)

    # 保存图片
    img.save(output_path, format=format)
    return f"图片已成功保存到 {output_path}"


@mcp.tool()
async def crop_image(image_source: str, left: int, top: int, right: int, bottom: int,
                     output_path: Optional[str] = None) -> str:
    """从图片中裁切出指定区域。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        left: 左边界坐标
        top: 上边界坐标
        right: 右边界坐标
        bottom: 下边界坐标
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的裁剪后图片
    """
    img = await get_image(image_source)
    cropped_img = img.crop((left, top, right, bottom))
    return save_result_image(cropped_img, output_path)


@mcp.tool()
async def resize_image(image_source: str, width: int, height: int, keep_aspect_ratio: bool = True,
                       output_path: Optional[str] = None) -> str:
    """调整图片的尺寸。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        width: 目标宽度
        height: 目标高度
        keep_aspect_ratio: 是否保持原始宽高比
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的调整大小后的图片
    """
    img = await get_image(image_source)

    if keep_aspect_ratio:
        img.thumbnail((width, height), Image.Resampling.LANCZOS)
    else:
        img = img.resize((width, height), Image.Resampling.LANCZOS)

    return save_result_image(img, output_path)


@mcp.tool()
async def adjust_brightness(image_source: str, factor: float, output_path: Optional[str] = None) -> str:
    """调整图片亮度。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        factor: 亮度调整因子 (0.0-2.0, 1.0为原始亮度)
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的调整后的图片
    """
    img = await get_image(image_source)
    enhancer = ImageEnhance.Brightness(img)
    adjusted_img = enhancer.enhance(factor)
    return save_result_image(adjusted_img, output_path)


@mcp.tool()
async def adjust_contrast(image_source: str, factor: float, output_path: Optional[str] = None) -> str:
    """调整图片对比度。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        factor: 对比度调整因子 (0.0-2.0, 1.0为原始对比度)
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；的调整后的图片
    """
    img = await get_image(image_source)
    enhancer = ImageEnhance.Contrast(img)
    adjusted_img = enhancer.enhance(factor)
    return save_result_image(adjusted_img, output_path)


@mcp.tool()
async def adjust_saturation(image_source: str, factor: float, output_path: Optional[str] = None) -> str:
    """调整图片饱和度。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        factor: 饱和度调整因子 (0.0-2.0, 1.0为原始饱和度)
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的调整后的图片
    """
    img = await get_image(image_source)
    enhancer = ImageEnhance.Color(img)
    adjusted_img = enhancer.enhance(factor)
    return save_result_image(adjusted_img, output_path)


@mcp.tool()
async def apply_filter(image_source: str, filter_type: str, output_path: Optional[str] = None) -> str:
    """应用滤镜效果到图片。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        filter_type: 滤镜类型，可选值: 'blur', 'sharpen', 'edge_enhance', 'emboss', 'contour'
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的 编码的应用滤镜后的图片
    """
    img = await get_image(image_source)

    filters = {
        'blur': ImageFilter.BLUR,
        'sharpen': ImageFilter.SHARPEN,
        'edge_enhance': ImageFilter.EDGE_ENHANCE,
        'emboss': ImageFilter.EMBOSS,
        'contour': ImageFilter.CONTOUR
    }

    if filter_type not in filters:
        return f"错误: 不支持的滤镜类型 '{filter_type}'"

    filtered_img = img.filter(filters[filter_type])
    return save_result_image(filtered_img, output_path)


@mcp.tool()
async def add_text(image_source: str, text: str, x: int, y: int,
                   font_size: int = 20, color: str = "black", output_path: Optional[str] = None) -> str:
    """在图片上添加文字。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        text: 要添加的文字
        x: 文字的 x 坐标
        y: 文字的 y 坐标
        font_size: 字体大小
        color: 文字颜色 (如 "black", "white", "red", "#FF0000")
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的添加文字后的图片
    """
    img = await get_image(image_source)
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img)

    # 尝试加载默认字体，如果失败则使用默认
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()

    draw.text((x, y), text, fill=color, font=font)
    return save_result_image(img, output_path)


@mcp.tool()
async def flip_image(image_source: str, direction: str, output_path: Optional[str] = None) -> str:
    """水平或垂直翻转图片。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        direction: 翻转方向，可选值: 'horizontal', 'vertical'
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的翻转后的图片
    """
    img = await get_image(image_source)

    if direction == 'horizontal':
        flipped_img = img.transpose(Image.FLIP_LEFT_RIGHT)
    elif direction == 'vertical':
        flipped_img = img.transpose(Image.FLIP_TOP_BOTTOM)
    else:
        return f"错误: 不支持的翻转方向 '{direction}'"

    return save_result_image(flipped_img, output_path)


@mcp.tool()
async def merge_images(image1_source: str, image2_source: str, position: Tuple[int, int],
                       output_path: Optional[str] = None) -> str:
    """将两张图片合并，将第二张图片放在第一张图片的指定位置。

    Args:
        image1_source: 第一张图片的来源 (URL、本地文件路径或 Base64 编码的图片)（背景图）
        image2_source: 第二张图片的来源 (URL、本地文件路径或 Base64 编码的图片)（前景图）
        position: 放置第二张图片的位置坐标 (x, y)
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的合并后的图片
    """
    background = await get_image(image1_source)
    background = background.convert("RGBA")

    foreground = await get_image(image2_source)
    foreground = foreground.convert("RGBA")

    # 创建一个与背景相同大小的新图像
    result = Image.new("RGBA", background.size)
    result.paste(background, (0, 0))
    result.paste(foreground, position, foreground)

    return save_result_image(result, output_path)


@mcp.tool()
async def add_border(image_source: str, border_width: int, color: str = "black",
                     output_path: Optional[str] = None) -> str:
    """给图片添加边框。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        border_width: 边框宽度（像素）
        color: 边框颜色 (如 "black", "white", "red", "#FF0000")
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的添加边框后的图片
    """
    img = await get_image(image_source)

    # 创建一个新图像，比原图大 border_width*2
    width, height = img.size
    new_width, new_height = width + 2 * border_width, height + 2 * border_width
    bordered_img = Image.new("RGBA", (new_width, new_height), color)

    # 将原图粘贴到中间
    bordered_img.paste(img, (border_width, border_width))

    return save_result_image(bordered_img, output_path)


@mcp.tool()
async def repair_image(image_source: str, radius: int = 2, output_path: Optional[str] = None) -> str:
    """修复图片中的小缺陷，使用中值滤波器。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)
        radius: 滤波器半径，值越大修复效果越强但可能会模糊图像
        output_path: 可选，保存结果的本地文件路径。如果不提供，则返回 Base64 编码的图片。

    Returns:
        如果提供了 output_path，则返回保存成功的消息；否则返回 Base64 编码的修复后的图片
    """
    img = await get_image(image_source)
    repaired_img = img.filter(ImageFilter.MedianFilter(size=radius * 2 + 1))
    return save_result_image(repaired_img, output_path)


@mcp.tool()
async def get_image_info(image_source: str) -> str:
    """获取图片的基本信息。

    Args:
        image_source: 图片来源 (URL、本地文件路径或 Base64 编码的图片)

    Returns:
        包含图片尺寸、格式、模式等信息的字符串
    """
    img = await get_image(image_source)

    info = {
        "尺寸": f"{img.width} x {img.height} 像素",
        "格式": img.format if img.format else "未知",
        "模式": img.mode,
        "色彩空间": "RGB" if img.mode == "RGB" else "RGBA" if img.mode == "RGBA" else img.mode
    }
    return info

def main():
    print("ImagePro is starting...")
    mcp.run(transport='stdio')

if __name__ == '__main__':
    main()

