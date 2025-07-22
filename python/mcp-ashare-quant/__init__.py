"""
MCP A股量化分析服务

基于MCP协议的A股量化分析工具，为AI Agent提供股票推荐、行情分析、K线图绘制等功能。
"""

__version__ = "0.1.2"
__author__ = "lixiangquan"
__email__ = "your.email@example.com"

from .server import main

__all__ = ["main"]