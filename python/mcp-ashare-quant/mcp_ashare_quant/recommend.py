import sys
import requests
import pandas as pd
from datetime import datetime
import time
import random


def get_stock_data():
    """从东方财富网API获取A股股票数据"""
    print("正在获取股票数据...", file=sys.stderr)

    url = "http://72.push2.eastmoney.com/api/qt/clist/get"

    params = {
        'pn': 1,  # 页码
        'pz': 5000,  # 每页数量
        'po': 1,  # 排序方向，1为升序
        'np': 1,
        'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
        'fltt': 2,
        'invt': 2,
        'fid': 'f3',  # 按涨跌幅排序
        'fs': 'm:0+t:6,m:0+t:13,m:0+t:80,m:1+t:2,m:1+t:23',  # A股范围
        'fields': 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23'
    }

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)

        print(f"API响应状态码: {response.status_code}", file=sys.stderr)

        if response.status_code != 200:
            print(f"API请求失败，状态码: {response.status_code}", file=sys.stderr)
            return []

        json_data = response.json()

        print(f"API返回的数据类型: {type(json_data)}", file=sys.stderr)
        print(f"API返回的数据键: {json_data.keys()}", file=sys.stderr)

        if 'data' not in json_data or 'diff' not in json_data['data']:
            print("API返回的数据格式不正确", file=sys.stderr)
            print(f"API返回的数据: {json_data}", file=sys.stderr)
            return []

        stocks = json_data['data']['diff']
        print(f"API返回的股票数量: {len(stocks)}", file=sys.stderr)

        formatted_stocks = []

        for stock in stocks:
            try:
                original_price = stock['f2']
                adjusted_price = original_price / 100 if original_price > 1000 else original_price  # 调整价格逻辑

                stock_info = {
                    'symbol': stock['f12'],  # 股票代码
                    'name': stock['f14'],  # 股票名称
                    'price': adjusted_price,  # 当前价格
                    'change_percent': stock['f3'] / 100,  # 涨跌幅
                    'volume': stock['f5'] / 100,  # 成交量(手)
                    'amount': stock['f6'] / 10000,  # 成交额(万元)
                    'market_cap': stock['f20'] / 100000000,  # 总市值(亿元)
                    'pe_ratio': stock['f9'],  # 市盈率
                    'pb_ratio': stock['f23'],  # 市净率
                    'turnover_rate': stock['f8'] / 100,  # 换手率
                }
                formatted_stocks.append(stock_info)

                # 添加调试信息
                print(f"处理股票: {stock_info['symbol']}, 原始价格: {original_price}, 调整后价格: {adjusted_price}", file=sys.stderr)

            except KeyError as e:
                print(f"处理股票数据时出错，缺少键: {e}", file=sys.stderr)
            except Exception as e:
                print(f"处理股票数据时出现未知错误: {e}", file=sys.stderr)

        print(f"成功格式化 {len(formatted_stocks)} 只股票的数据", file=sys.stderr)
        return formatted_stocks

    except requests.exceptions.RequestException as e:
        print(f"请求异常: {e}", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}", file=sys.stderr)
    except Exception as e:
        print(f"获取股票数据时出现未知错误: {e}", file=sys.stderr)

    return []


def filter_and_rank_stocks(stocks, criteria):
    """根据多个标准筛选和排序股票"""
    filtered_stocks = []

    print(f"开始筛选，总股票数: {len(stocks)}", file=sys.stderr)

    for stock in stocks:
        try:
            price_check = criteria['min_price'] <= stock['price'] <= criteria['max_price']
            volume_check = stock['volume'] >= criteria['min_volume']
            pe_check = stock['pe_ratio'] > 0
            pb_check = stock['pb_ratio'] > 0

            if not price_check:
                print(
                    f"股票 {stock['symbol']} 价格 {stock['price']} 不在范围 {criteria['min_price']} - {criteria['max_price']} 内", file=sys.stderr)
            if not volume_check:
                print(f"股票 {stock['symbol']} 成交量 {stock['volume']} 小于最小要求 {criteria['min_volume']}", file=sys.stderr)
            if not pe_check:
                print(f"股票 {stock['symbol']} 市盈率 {stock['pe_ratio']} 不为正", file=sys.stderr)
            if not pb_check:
                print(f"股票 {stock['symbol']} 市净率 {stock['pb_ratio']} 不为正", file=sys.stderr)

            if price_check and volume_check and pe_check and pb_check:
                # 计算综合得分
                price_score = 1 - (stock['price'] - criteria['min_price']) / (
                            criteria['max_price'] - criteria['min_price'])
                volume_score = min(1, (stock['volume'] - criteria['min_volume']) / criteria['min_volume'])
                pe_score = 1 / (1 + abs(stock['pe_ratio'] - criteria['target_pe']) / criteria['target_pe'])
                pb_score = 1 / (1 + abs(stock['pb_ratio'] - criteria['target_pb']) / criteria['target_pb'])
                turnover_score = min(1, stock['turnover_rate'] / criteria['target_turnover'])

                stock['score'] = (price_score + volume_score + pe_score + pb_score + turnover_score) / 5
                filtered_stocks.append(stock)
            else:
                print(f"股票 {stock['symbol']} 被过滤掉", file=sys.stderr)
        except Exception as e:
            print(f"筛选股票时出错: {e}, 股票: {stock}", file=sys.stderr)

    print(f"筛选后的股票数: {len(filtered_stocks)}", file=sys.stderr)

    # 按综合得分排序
    ranked_stocks = sorted(filtered_stocks, key=lambda x: x['score'], reverse=True)

    return ranked_stocks


def recommend_stocks(limit=10):
    """推荐股票"""
    stock_data = get_stock_data()

    if not stock_data:
        print("无法获取股票数据，请检查网络连接或尝试稍后再试", file=sys.stderr)
        return []

    # 调整筛选标准
    criteria = {
        'min_price': 1,  # 最低股价
        'max_price': 200,  # 最高股价
        'min_volume': 100,  # 最小成交量（手）
        'target_pe': 30,  # 目标市盈率
        'target_pb': 3,  # 目标市净率
        'target_turnover': 2,  # 目标换手率
    }

    ranked_stocks = filter_and_rank_stocks(stock_data, criteria)

    return ranked_stocks[:limit]


# main 函数和 display_recommendations 函数保持不变
def display_recommendations(recommendations):
    """展示推荐的股票信息"""
    if not recommendations:
        print("没有找到符合条件的股票。", file=sys.stderr)
        return

    print(f"\n为您推荐以下 {len(recommendations)} 只股票：", file=sys.stderr)
    print("\n{:<8} {:<8} {:<8} {:<8} {:<10} {:<10} {:<8} {:<8} {:<8} {:<8}".format(
        "股票代码", "股票名称", "现价", "涨跌幅(%)", "成交量(万手)", "总市值(亿)", "市盈率", "市净率", "换手率(%)",
        "得分"), file=sys.stderr)
    print("-" * 100, file=sys.stderr)

    for stock in recommendations:
        print("{:<8} {:<8} {:<8.2f} {:<8.2f} {:<10.2f} {:<10.2f} {:<8.2f} {:<8.2f} {:<8.2f} {:<8.2f}".format(
            stock['symbol'], stock['name'], stock['price'], stock['change_percent'],
            stock['volume'] / 10000, stock['market_cap'], stock['pe_ratio'],
            stock['pb_ratio'], stock['turnover_rate'], stock['score']), file=sys.stderr)

    print("\n⚠️ 投资风险提示：", file=sys.stderr)
    print("1. 股市有风险，投资需谨慎。", file=sys.stderr)
    print("2. 本推荐基于简单的量化指标，不构成任何投资建议。", file=sys.stderr)
    print("3. 投资决策应基于个人风险承受能力和充分研究。", file=sys.stderr)
    print("4. 过往表现不代表未来收益，请理性分析，审慎决策。", file=sys.stderr)


def main():
    print("A股精选股票推荐工具", file=sys.stderr)
    print("=" * 50, file=sys.stderr)

    try:
        limit = int(input("请输入希望推荐的股票数量(默认10只)：") or "10")

        print("\n正在分析数据，请稍候...", file=sys.stderr)
        recommendations = recommend_stocks(limit)
        display_recommendations(recommendations)

    except ValueError as e:
        print(f"输入错误: {e}", file=sys.stderr)
        print("请输入有效的数字!", file=sys.stderr)
    except KeyboardInterrupt:
        print("\n程序被用户中断", file=sys.stderr)
    except Exception as e:
        print(f"程序出错: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
if __name__ == "__main__":
    main()
