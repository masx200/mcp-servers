"""
ImagePro - 一个用于图像处理的Python库

这个库提供了一系列图像处理工具，包括裁剪、调整大小、调整亮度/对比度/饱和度、
应用滤镜、添加文字、翻转图像、合并图像等功能。
"""

from mcp.server.fastmcp import FastMCP
from .server import (
    # 核心函数
    download_image,
    image_to_base64,
    base64_to_image,
    infer_image_format,
    ensure_dir_exists,
    get_image,
    save_result_image,

    # 工具函数
    save_image,
    crop_image,
    resize_image,
    adjust_brightness,
    adjust_contrast,
    adjust_saturation,
    apply_filter,
    add_text,
    flip_image,
    merge_images,
    add_border,
    repair_image,
    get_image_info,

    # 类型
    ImageFormatType,

    # FastMCP实例
    mcp,
)

__version__ = "0.1.1"
__all__ = [
    # 核心函数
    "download_image",
    "image_to_base64",
    "base64_to_image",
    "infer_image_format",
    "ensure_dir_exists",
    "get_image",
    "save_result_image",

    # 工具函数
    "save_image",
    "crop_image",
    "resize_image",
    "adjust_brightness",
    "adjust_contrast",
    "adjust_saturation",
    "apply_filter",
    "add_text",
    "flip_image",
    "merge_images",
    "add_border",
    "repair_image",
    "get_image_info",

    # 类型
    "ImageFormatType",

    # FastMCP实例
    "mcp",
]


def run():
    """启动ImagePro服务"""
    print("ImagePro is starting...")
    mcp.run(transport='stdio')
