#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP A股量化分析 - 获取股票数据Demo
演示如何传递参数获取股票数据结果
"""

import asyncio
import json
from typing import Dict, Optional
from pydantic import BaseModel, Field
from typing import Annotated

# 导入相关模块
try:
    from mcp_ashare_quant.ashare import get_price
    from mcp_ashare_quant.server import get_stock_data, GetStockDataParams
    print("✓ 成功导入MCP模块")
except ImportError as e:
    print(f"✗ 导入失败: {e}")
    print("请确保已安装mcp-ashare-quant包")
    exit(1)


class StockDataDemo:
    """股票数据获取演示类"""
    
    def __init__(self):
        self.demo_cases = [
            {
                "name": "获取贵州茅台最近5天数据",
                "params": {
                    "code": "贵州茅台",
                    "frequency": "1d",
                    "count": 5,
                    "end_date": None
                }
            },
            {
                "name": "获取上证指数最近10天数据",
                "params": {
                    "code": "sh000001",
                    "frequency": "1d", 
                    "count": 10,
                    "end_date": None
                }
            },
            {
                "name": "获取平安银行周线数据",
                "params": {
                    "code": "sz000001",
                    "frequency": "1w",
                    "count": 8,
                    "end_date": None
                }
            },
            {
                "name": "获取比亚迪指定日期前的数据",
                "params": {
                    "code": "sz002594",
                    "frequency": "1d",
                    "count": 5,
                    "end_date": "2024-12-01"
                }
            }
        ]
    
    def print_separator(self, title: str):
        """打印分隔线"""
        print("\n" + "=" * 60)
        print(f" {title} ")
        print("=" * 60)
    
    def print_params(self, params: dict):
        """打印参数信息"""
        print("📋 传递的参数:")
        for key, value in params.items():
            print(f"  {key}: {value}")
        print()
    
    def print_result(self, result: dict):
        """打印结果信息"""
        if isinstance(result, list) and len(result) > 0:
            print("📊 获取到的数据:")
            print(f"  数据条数: {len(result)}")
            print("  数据字段:", list(result[0].keys()) if result else "无")
            print("\n  前3条数据:")
            for i, item in enumerate(result[:3]):
                print(f"    [{i+1}] {item}")
        elif isinstance(result, dict):
            if "error" in result:
                print(f"❌ 错误: {result}")
            else:
                print(f"📊 结果: {result}")
        else:
            print(f"📊 结果: {result}")
    
    async def demo_with_pydantic_validation(self, params: dict):
        """使用Pydantic参数验证的演示"""
        try:
            # 1. 参数验证和转换
            args = GetStockDataParams(**params)
            print("✓ 参数验证通过")
            
            # 2. 调用函数获取数据
            result = await get_stock_data(
                code=args.code,
                frequency=args.frequency,
                count=args.count,
                end_date=args.end_date
            )
            
            return result
            
        except Exception as e:
            return {"error": str(e), "type": "validation_error"}
    
    def demo_direct_call(self, params: dict):
        """直接调用底层函数的演示"""
        try:
            # 直接调用get_price函数
            df = get_price(
                code=params["code"],
                frequency=params["frequency"],
                count=params["count"],
                end_date=params["end_date"] if params["end_date"] else ''
            )
            
            # 转换为字典格式
            if hasattr(df, 'to_dict'):
                return df.to_dict(orient='records')
            else:
                return {"error": "返回数据格式错误"}
                
        except Exception as e:
            return {"error": str(e), "type": "direct_call_error"}
    
    async def run_demo_case(self, case: dict):
        """运行单个演示案例"""
        self.print_separator(case["name"])
        self.print_params(case["params"])
        
        # 方法1: 使用MCP服务器的参数验证方式
        print("🔄 方法1: 使用MCP服务器参数验证...")
        result1 = await self.demo_with_pydantic_validation(case["params"])
        self.print_result(result1)
        
        print("\n" + "-" * 40)
        
        # 方法2: 直接调用底层函数
        print("🔄 方法2: 直接调用底层函数...")
        result2 = self.demo_direct_call(case["params"])
        self.print_result(result2)
        
        return result1, result2
    
    async def run_all_demos(self):
        """运行所有演示案例"""
        print("🚀 MCP A股量化分析 - 股票数据获取Demo")
        print("本Demo演示如何传递参数获取股票数据结果")
        
        results = []
        
        for i, case in enumerate(self.demo_cases, 1):
            print(f"\n📍 案例 {i}/{len(self.demo_cases)}")
            result = await self.run_demo_case(case)
            results.append({
                "case": case["name"],
                "params": case["params"],
                "results": result
            })
        
        # 总结
        self.print_separator("Demo总结")
        print("✅ 完成所有演示案例")
        print(f"📊 总共测试了 {len(self.demo_cases)} 个案例")
        
        success_count = 0
        for result in results:
            result1, result2 = result["results"]
            if not (isinstance(result1, dict) and "error" in result1):
                success_count += 1
        
        print(f"🎯 成功率: {success_count}/{len(self.demo_cases)} ({success_count/len(self.demo_cases)*100:.1f}%)")
        
        return results


def demo_parameter_structure():
    """演示参数结构"""
    print("\n" + "=" * 60)
    print(" 参数结构说明 ")
    print("=" * 60)
    
    print("📋 GetStockDataParams 参数模型:")
    schema = GetStockDataParams.model_json_schema()
    print(json.dumps(schema, indent=2, ensure_ascii=False))
    
    print("\n📝 参数说明:")
    print("  code: 股票代码或中文名称 (必填)")
    print("    - 支持格式: 'sh000001', 'sz000001', '贵州茅台'等")
    print("  frequency: 数据频率 (可选，默认'1d')")
    print("    - 支持: '1d'(日线), '1w'(周线), '1m'(月线)")
    print("  count: 获取数据条数 (可选，默认5)")
    print("    - 范围: 1-1000")
    print("  end_date: 结束日期 (可选，默认None)")
    print("    - 格式: 'YYYY-MM-DD'")


async def main():
    """主函数"""
    # 演示参数结构
    demo_parameter_structure()
    
    # 运行演示
    demo = StockDataDemo()
    results = await demo.run_all_demos()
    
    # 额外演示：错误处理
    print("\n" + "=" * 60)
    print(" 错误处理演示 ")
    print("=" * 60)
    
    error_cases = [
        {
            "name": "无效股票代码",
            "params": {"code": "invalid_code", "frequency": "1d", "count": 5}
        },
        {
            "name": "无效频率",
            "params": {"code": "sh000001", "frequency": "invalid", "count": 5}
        }
    ]
    
    for case in error_cases:
        print(f"\n🔍 测试: {case['name']}")
        demo.print_params(case["params"])
        result = await demo.demo_with_pydantic_validation(case["params"])
        demo.print_result(result)


if __name__ == "__main__":
    # 运行演示
    asyncio.run(main())
