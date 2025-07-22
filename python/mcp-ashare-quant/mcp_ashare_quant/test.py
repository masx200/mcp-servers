import os
import platform
import json
import logging
import matplotlib.pyplot as plt
from typing import List, Dict, Optional
from mcp.server.fastmcp import FastMCP
from ashare import get_price
from mytt import *
import requests
import re


def get_stock_code_by_name(name: str) -> Optional[str]:
    """
    通过新浪财经API查询股票代码（支持简称匹配）

    Args:
        name: 股票名称/简称/代码(如"贵州茅台"/"茅台"/"600519"/"sh600519")

    Returns:
        标准股票代码(如"sh600519")，查询失败返回None
    """
    try:
        # 发起API请求
        url = f"http://suggest3.sinajs.cn/suggest/type=&key={name}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()  # 自动处理4xx/5xx错误

        # 解析响应数据（格式：var suggestvalue="名称,类型,代码,带前缀代码,...;..."）
        data = response.text.split('"')[1]
        candidates = []

        for item in filter(None, data.split(';')):
            parts = item.split(',')
            if len(parts) >= 4 and parts[1] == '11':  # 只处理A股(类型11)
                candidates.append({
                    'name': parts[0],  # 完整名称
                    'pure_code': parts[2],  # 纯数字代码
                    'full_code': parts[3]  # 带交易所代码
                })

        # 匹配优先级（从精确到模糊）
        for stock in candidates:
            # 1. 完全匹配名称（如"贵州茅台"）
            if name == stock['name']:
                return stock['full_code']

            # 2. 匹配带前缀代码（如"sh600519"）
            if name.lower() == stock['full_code'].lower():
                return stock['full_code']

            # 3. 匹配纯数字代码（如"600519"）
            if name == stock['pure_code']:
                return stock['full_code']

            # 4. 名称包含查询词（如"茅台"匹配"贵州茅台"）
            if name in stock['name']:
                return stock['full_code']

        return None

    except requests.exceptions.RequestException as e:
        logger.error(f"股票查询API请求失败: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"解析股票代码异常: {str(e)}", exc_info=True)
        return None


# 初始化MCP服务器
mcp = FastMCP(name="quant-analysis", log_level="ERROR")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ======================
# 工具函数
# ======================
def get_os_type() -> str:
    """获取操作系统类型"""
    return platform.system().lower()


# ======================
# MCP工具方法（核心接口）
# ======================

@mcp.tool()
async def recommend_a_shares(
        limit: int = 10,
        min_price: float = 1,
        max_price: float = 200,
        min_volume: float = 100,
        target_pe: float = 30,
        target_pb: float = 3,
        target_turnover: float = 2
) -> Dict:
    """推荐A股精选股票

    Args:
        limit (int, optional): 推荐股票数量. Defaults to 10.
        min_price (float, optional): 最低股价. Defaults to 1.
        max_price (float, optional): 最高股价. Defaults to 200.
        min_volume (float, optional): 最小成交量（手）. Defaults to 100.
        target_pe (float, optional): 目标市盈率. Defaults to 30.
        target_pb (float, optional): 目标市净率. Defaults to 3.
        target_turnover (float, optional): 目标换手率. Defaults to 2.

    Returns:
        Dict: 包含推荐股票列表和推荐原因的字典
    """
    from recommend import recommend_stocks, filter_and_rank_stocks

    criteria = {
        'min_price': min_price,
        'max_price': max_price,
        'min_volume': min_volume,
        'target_pe': target_pe,
        'target_pb': target_pb,
        'target_turnover': target_turnover,
    }

    try:
        stock_data = recommend_stocks(limit)
        ranked_stocks = filter_and_rank_stocks(stock_data, criteria)

        recommendations = []
        for stock in ranked_stocks[:limit]:
            recommendations.append({
                'symbol': stock['symbol'],
                'name': stock['name'],
                'price': stock['price'],
                'change_percent': stock['change_percent'],
                'volume': stock['volume'],
                'market_cap': stock['market_cap'],
                'pe_ratio': stock['pe_ratio'],
                'pb_ratio': stock['pb_ratio'],
                'turnover_rate': stock['turnover_rate'],
                'score': stock['score'],
                'reason': f"综合得分高（{stock['score']:.2f}），符合筛选条件："
                          f"股价 {stock['price']:.2f} 在 {min_price}-{max_price} 范围内，"
                          f"成交量 {stock['volume']:.2f} 手，市盈率 {stock['pe_ratio']:.2f}，"
                          f"市净率 {stock['pb_ratio']:.2f}，换手率 {stock['turnover_rate']:.2f}%"
            })

        return {
            'status': 'success',
            'recommendations': recommendations,
            'criteria': criteria,
            'risk_warning': "投资有风险，入市需谨慎。本推荐仅供参考，不构成投资建议。投资者应自行判断并承担投资风险。"
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }


@mcp.tool()
async def get_stock_data(
        code: str,
        frequency: str = '1d',
        count: int = 5,
        end_date: Optional[str] = None
) -> Dict:
    """获取股票数据

    Args:
        code (str): 股票代码或中文名称（如"贵州茅台"或"sh600519"）
        frequency (str, optional): 数据频率，支持'1d'（日线）、'1w'（周线）等. Defaults to '1d'.
        count (int, optional): 获取的数据条数. Defaults to 5.
        end_date (Optional[str], optional): 数据结束日期，格式为'YYYY-MM-DD'. Defaults to None.

    Returns:
        Dict: 包含股票数据的字典列表，每个字典包含以下字段：
            - date: 日期
            - open: 开盘价
            - high: 最高价
            - low: 最低价
            - close: 收盘价
            - volume: 成交量（如果可用）

    Raises:
        ValueError: 如果输入参数无效
        RuntimeError: 如果无法获取数据
    """
    try:
        # 参数验证
        if not code:
            raise ValueError("股票代码不能为空")

        # 确保code是字符串并获取完整代码
        if isinstance(code, (int, float)):
            code = f"{int(code)}"  # 将数字转换为字符串
        code = str(code).strip()

        if frequency not in ['1d', '1w', '1m']:
            raise ValueError(f"不支持的数据频率: {frequency}")
        if count <= 0:
            raise ValueError("数据条数必须大于0")
        if end_date and not re.match(r'\d{4}-\d{2}-\d{2}', end_date):
            raise ValueError("结束日期格式不正确，应为YYYY-MM-DD")

        # 股票名称到代码的映射
        try:
            with open('stock_mapping.json', 'r', encoding='utf-8') as f:
                STOCK_NAME_MAP = json.load(f)
        except Exception as e:
            logger.warning(f"加载股票映射文件失败: {e}")
            STOCK_NAME_MAP = {}

        # 如果是中文名称，转换为股票代码
        if code in STOCK_NAME_MAP:
            code = STOCK_NAME_MAP[code]
        else:
            # 本地映射找不到，尝试通过API查询
            stock_code = get_stock_code_by_name(code)
            if stock_code:
                code = stock_code
            else:
                # 如果输入是纯数字代码，尝试添加市场前缀
                if code.isdigit():
                    # 尝试上海和深圳市场
                    for prefix in ['sh', 'sz']:
                        full_code = f"{prefix}{code}"
                        stock_code = get_stock_code_by_name(full_code)
                        if stock_code:
                            code = stock_code
                            break

                if not code.startswith(('sh', 'sz')):
                    logger.error(f"未找到股票代码: {code}")
                    return {
                        "error": f"未找到股票代码: {code}",
                        "suggestions": "请检查股票名称或代码是否正确，或尝试添加市场前缀（如sh600519）"
                    }

        # 统一处理 end_date 参数
        params = {
            'code': code,
            'frequency': frequency,
            'count': count,
            'end_date': end_date if end_date is not None else ''
        }

        logger.info(f"获取股票数据，参数: {params}")
        df = get_price(**params)

        # 添加类型检查
        if not hasattr(df, 'to_dict'):
            logger.error(f"返回数据不是DataFrame: {type(df)}")
            return {"error": "数据格式错误", "details": "API返回的数据格式不符合预期"}

        # 转换数据格式
        data = df.to_dict(orient='records')
        logger.info(f"成功获取{len(data)}条股票数据")
        return data

    except ValueError as e:
        logger.error(f"参数验证失败: {e}")
        return {"error": str(e), "type": "invalid_parameter"}
    except Exception as e:
        logger.error(f"获取股票数据失败: {e}", exc_info=True)
        return {"error": str(e), "type": "runtime_error"}


@mcp.tool()
async def calculate_technical_indicators(
        data: List[Dict],
        indicators: List[str]
) -> Dict:
    """计算技术指标"""
    try:
        close = [d['close'] for d in data]
        open = [d['open'] for d in data]
        high = [d['high'] for d in data]
        low = [d['low'] for d in data]

        results = {}
        for indicator in indicators:
            if indicator == 'MA5':
                results['MA5'] = MA(close, 5)
            elif indicator == 'MA10':
                results['MA10'] = MA(close, 10)
            elif indicator == 'BOLL':
                results['BOLL'] = BOLL(close)
            elif indicator == 'MACD':
                results['MACD'] = MACD(close)
            # 添加更多指标计算...

        return results
    except Exception as e:
        logger.error(f"计算技术指标失败: {e}")
        return {"error": str(e)}


@mcp.tool()
async def plot_kline(
        data: List[Dict],
        indicators: Optional[List[str]] = ['MA5', 'MA10'],
        title: str = 'Stock Chart',
        save_path: Optional[str] = None
) -> Dict:
    """绘制K线图

    Args:
        data (List[Dict]): 包含以下字段的字典列表：
            - date: 日期，格式为YYYY-MM-DD（必需）
            - open: 开盘价（必需）
            - high: 最高价（必需）
            - low: 最低价（必需）
            - close: 收盘价（必需）
            - volume: 成交量（可选）
        indicators (Optional[List[str]]): 要绘制的技术指标列表，可选值：['MA5', 'MA10', 'BOLL', 'MACD']
        title (str, optional): 图表标题，支持中文. Defaults to 'Stock Chart'.
        save_path (Optional[str], optional): 图表保存路径，如果为None则显示图表. Defaults to None.

    Returns:
        Dict: 包含操作结果的字典，包含以下字段：
            - status: 操作状态（"success"或"error"）
            - message: 操作结果信息
            - path: 如果保存图表，返回保存路径

    Raises:
        ValueError: 如果输入数据格式不正确
        RuntimeError: 如果绘图过程中发生错误

    最后直接打开图表文件
    """
    try:
        # 数据验证
        if not data:
            raise ValueError("数据不能为空")
        required_fields = ['date', 'open', 'high', 'low', 'close']
        for i, item in enumerate(data):
            for field in required_fields:
                if field not in item:
                    raise ValueError(f"第{i + 1}条数据缺少必需字段: {field}")
            if not isinstance(item['date'], str) or not re.match(r'\d{4}-\d{2}-\d{2}', item['date']):
                raise ValueError(f"第{i + 1}条数据的日期格式不正确，应为YYYY-MM-DD")

        # 设置中文字体
        plt.rcParams['font.sans-serif'] = ['Arial Unicode MS']  # 设置中文字体
        plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题

        # 准备数据
        dates = [d['date'] for d in data]
        opens = [d['open'] for d in data]
        highs = [d['high'] for d in data]
        lows = [d['low'] for d in data]
        closes = [d['close'] for d in data]
        volumes = [d['volume'] for d in data] if 'volume' in data[0] else None

        # 创建图表
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10),
                                       gridspec_kw={'height_ratios': [3, 1]})

        # 绘制K线
        for i in range(len(dates)):
            color = 'green' if closes[i] >= opens[i] else 'red'
            ax1.plot([i, i], [lows[i], highs[i]], color=color, linewidth=1)
            ax1.plot([i - 0.2, i + 0.2], [opens[i], opens[i]], color=color, linewidth=3)
            ax1.plot([i - 0.2, i + 0.2], [closes[i], closes[i]], color=color, linewidth=3)

        # 添加技术指标
        if indicators:
            close_values = [d['close'] for d in data]
            for indicator in indicators:
                if indicator == 'MA5':
                    ma5 = MA(close_values, 5)
                    ax1.plot(range(len(ma5)), ma5, label='MA5', color='blue', linewidth=1)
                elif indicator == 'MA10':
                    ma10 = MA(close_values, 10)
                    ax1.plot(range(len(ma10)), ma10, label='MA10', color='orange', linewidth=1)
                elif indicator == 'BOLL':
                    upper, mid, lower = BOLL(close_values)
                    ax1.plot(range(len(upper)), upper, label='BOLL Upper', color='purple', linewidth=1)
                    ax1.plot(range(len(mid)), mid, label='BOLL Mid', color='purple', linewidth=1)
                    ax1.plot(range(len(lower)), lower, label='BOLL Lower', color='purple', linewidth=1)

        # 绘制成交量
        if volumes:
            for i in range(len(dates)):
                color = 'green' if closes[i] >= opens[i] else 'red'
                ax2.bar(i, volumes[i], color=color, alpha=0.5)

        # 设置图表属性
        ax1.set_title(title)
        ax1.set_ylabel('Price')
        ax1.legend()
        ax1.grid(True)

        if volumes:
            ax2.set_ylabel('Volume')
            ax2.grid(True)

        # 设置X轴刻度
        plt.xticks(range(len(dates)), dates, rotation=45)

        # 保存或显示图表
        if save_path:
            plt.savefig(save_path)
            logger.info(f"图表已保存到: {save_path}")
            return {"status": "success", "message": "图表保存成功", "path": save_path}
        else:
            plt.show()
            logger.info("图表已显示")
            return {"status": "success", "message": "图表显示成功"}

    except ValueError as e:
        logger.error(f"数据验证失败: {e}")
        return {"status": "error", "message": str(e), "type": "invalid_data"}
    except Exception as e:
        logger.error(f"绘制K线图失败: {e}", exc_info=True)
        return {"status": "error", "message": str(e), "type": "runtime_error"}
    finally:
        plt.close()


@mcp.tool()
async def analyze_cross(
        data1: List[float],
        data2: List[float]
) -> Dict:
    """分析两条线的交叉情况"""
    try:
        cross_result = CROSS(data1, data2)
        return {
            "cross_today": RET(cross_result),
            "cross_history": cross_result.tolist()
        }
    except Exception as e:
        logger.error(f"分析交叉情况失败: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    # 启动服务器
    mcp.run(transport='stdio')
