"""
MCP A股量化分析服务

基于MCP协议的A股量化分析工具，为AI Agent提供股票推荐、行情分析、K线图绘制等功能。
"""

__version__ = "0.1.2"
__author__ = "lixiangquan"
__email__ = "your.email@example.com"

# 导入主要模块和函数
from .ashare import get_price
from .mytt import MA, BOLL, MACD, CROSS, RET
from .server import main
from .recommend import recommend_stocks, filter_and_rank_stocks

__all__ = [
    "get_price",
    "MA", "BOLL", "MACD", "CROSS", "RET",
    "main",
    "recommend_stocks", "filter_and_rank_stocks"
]