# MCP-A股量化分析服务

基于MCP协议的A股量化分析工具，为AI Agent提供股票推荐、行情分析、K线图绘制等功能

## 功能特性

- 📈 A股精选股票推荐
- 📊 K线图绘制(支持MA5/MA10等技术指标)
- 🔍 股票历史数据查询
- 📉 技术指标计算(MACD, BOLL等)
- 🧮 量化分析模型

## 快速开始

### 环境要求
- Python 3.12+
- 安装依赖库:
```bash
uv add "mcp[cli]" matplotlib 
uv add "mcp[cli]" pandas
uv add "mcp[cli]" tushare
```

### 运行服务
```bash
mcp dev server.py
```

### MCP配置
```json
"ashare_quant": {
    "command": "uv",
    "args": [
        "--directory",
        "path/mcp-servers/python/mcp-ashare-quant",
        "run", 
        "server.py"
    ],
    "disabled": false,
    "autoApprove": []
}
```

## API说明

### 股票推荐
- `recommend_a_shares()`: 推荐符合条件的A股股票
  - 参数: limit(数量), min_price(最低价), max_price(最高价)等
  - 返回: 股票列表及推荐理由

### K线图绘制  
- `plot_kline()`: 绘制股票K线图
  - 参数: data(股票数据), indicators(技术指标)
  - 返回: 图表文件路径

### 数据获取
- `get_stock_data()`: 获取股票历史数据
  - 参数: code(股票代码), count(数据条数)
  - 返回: OHLCV数据

### 技术指标
- `calculate_technical_indicators()`: 计算技术指标
  - 参数: data(股票数据), indicators(指标列表)
  - 返回: 包含指标值的数据

## 使用示例

### 获取股票推荐
```python
recommendations = recommend_a_shares(limit=15)
```

### 绘制K线图
```python 
data = get_stock_data(code="sh600519", count=20)
plot_kline(data, indicators=["MA5","MA10"])
```

## 注意事项
- 使用前需配置Tushare API token
- 图表功能需要matplotlib支持
- 数据获取有频率限制，请合理使用
