# coding:utf-8
import base64
import io
import os
import logging
import tempfile
import httpx
from typing import Any, Dict, Union
from PIL import Image
from volcengine.visual.VisualService import VisualService
from mcp.server.fastmcp import FastMCP

# 配置日志输出到stderr，避免干扰MCP通信
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 初始化FastMCP服务器
mcp = FastMCP("抠图工具")

class VolcImageCutter:
    """图像抠图处理器"""
    
    def __init__(self):
        self.visual_service = VisualService()
        self._setup_credentials()
    
    def _setup_credentials(self):
        """设置API凭证"""
        # 优先从环境变量获取
        ak = os.getenv('VOLC_ACCESS_KEY')
        sk = os.getenv('VOLC_SECRET_KEY')
        self.visual_service.set_ak(ak)
        self.visual_service.set_sk(sk)
    
    def saliency_segmentation(self, image_urls: list[str]) -> list[str]:
        """显著性分割抠图，直接返回base64列表"""
        try:
            form = {
                "req_key": "saliency_seg",
                "image_urls": image_urls,
            }
            logger.info(f"开始显著性分割，图像数量: {len(image_urls)}")
            resp = self.visual_service.cv_process(form)

            if resp and 'data' in resp and 'binary_data_base64' in resp['data']:
                logger.info("显著性分割处理成功")
                # 直接返回base64列表
                return resp["data"]["binary_data_base64"]
            else:
                logger.error(f"显著性分割处理失败: {resp}")
                return []

        except Exception as e:
            logger.error(f"显著性分割处理异常: {str(e)}")
            return []

    async def upload_image_to_server(self, image_data: bytes, filename: str) -> dict[str, Any]:
        """上传图片到服务器"""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                temp_file.write(image_data)
                temp_file_path = temp_file.name

            try:
                # 准备上传文件
                async with httpx.AsyncClient(timeout=30.0) as client:
                    with open(temp_file_path, 'rb') as f:
                        files = {'file': (filename, f, 'image/png')}
                        response = await client.post(
                            'https://www.mcpcn.cc/api/fileUploadAndDownload/uploadMcpFile',
                            files=files
                        )
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('code') == 0:
                            logger.info(f"图片上传成功: {result['data']['url']}")
                            return {"success": True, "url": result['data']['url']}
                        else:
                            logger.error(f"上传失败: {result.get('msg', '未知错误')}")
                            return {"success": False, "error": result.get('msg', '未知错误')}
                    else:
                        logger.error(f"上传请求失败: HTTP {response.status_code}")
                        return {"success": False, "error": f"HTTP {response.status_code}"}

            finally:
                # 清理临时文件
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        except Exception as e:
            logger.error(f"上传图片异常: {str(e)}")
            return {"success": False, "error": str(e)}

# 创建全局处理器实例
cutter = VolcImageCutter()

@mcp.tool()
async def image_cutout(image_urls: list[str]) -> Union[str, list[str]]:
    """
    对图像进行显著性分割抠图，自动上传到服务器并返回图片URL

    Args:
        image_urls: 图像URL列表，支持多张图像同时处理

    Returns:
        单张图片时返回URL字符串，多张图片时返回URL列表
    """
    # 获取base64列表
    base64_images = cutter.saliency_segmentation(image_urls)

    if not base64_images:
        return "抠图失败：未获取到有效的抠图结果"

    response_text = f"显著性分割抠图处理完成！共生成 {len(base64_images)} 张抠图结果:\n\n"
    uploaded_urls = []

    for i, base64_data in enumerate(base64_images):
        response_text += f"第 {i+1} 张抠图处理:\n"

        try:
            # 解码base64数据
            image_data = base64.b64decode(base64_data)

            # 使用PIL验证图片
            image = Image.open(io.BytesIO(image_data))
            response_text += f"- 图片尺寸: {image.size}\n"

            # 上传到服务器
            filename = f"saliency_cutout_{i+1}.png"
            upload_result = await cutter.upload_image_to_server(image_data, filename)

            if upload_result.get('success'):
                uploaded_urls.append(upload_result['url'])
                response_text += f"- ✅ 上传成功: {upload_result['url']}\n"
            else:
                response_text += f"- ❌ 上传失败: {upload_result.get('error', '未知错误')}\n"

        except Exception as e:
            response_text += f"- ❌ 处理失败: {str(e)}\n"

        response_text += "==========================================\n"

    # 最终结果汇总
    if uploaded_urls:
        # 如果只有一张图片，直接返回URL字符串
        if len(uploaded_urls) == 1:
            return uploaded_urls[0]
        else:
            # 多张图片，返回URL列表
            return uploaded_urls
    else:
        return "抠图失败：所有图片上传失败"

if __name__ == "__main__":
    # 运行MCP服务器
    logger.info("抠图工具MCP服务器...")
    mcp.run(transport='stdio')
