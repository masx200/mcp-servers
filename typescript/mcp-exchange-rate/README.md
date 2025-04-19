# 汇率转换工具

这是一个基于 Model Context Protocol (MCP) 的汇率转换工具，允许 AI 模型查询实时汇率数据并进行货币转换计算。

## 功能特点

- **实时汇率转换**：支持全球 160+ 种货币之间的实时汇率转换
- **货币代码和名称转换**：可以在货币代码（如 USD）和货币名称（如 美元）之间进行转换
- **简单易用的接口**：提供直观的工具接口，便于 AI 模型调用

## 环境配置

> 注意：需要在[阿里云市场](https://market.aliyun.com/)申请"极速汇率"API的APPCODE作为API密钥。

## 使用方法
```json
{
  "mcpServers": {
    "mcp-server/exchange-rate": {
      "command": "node",
      "args": [
        "mcp-exchange-rate/dist/index.js"
      ],
      "env": {
        "EXCHANGE_RATE_API_KEY": "API的APPCODE作为API密钥"
      },
      "autoApprove": [
        "exchange_rate_convert",
        "currency_convert"
      ]
    }
  }
}
```
### 工具功能

该工具提供两个主要功能：

1. **汇率转换** (`exchange_rate_convert`)
   - 输入：源货币代码、金额和目标货币代码
   - 输出：转换结果，包含汇率信息

2. **货币代码转换** (`currency_convert`)
   - 输入：货币名称或代码
   - 输出：对应的货币代码或名称

## 示例

### 汇率转换示例

输入:
```json
{
  "from": "USD",
  "amount": "100",
  "to": "CNY"
}
```

输出:
```json
{
  "from": "USD",
  "to": "CNY",
  "fromname": "美元",
  "toname": "人民币",
  "rate": "7.2536",
  "camount": "725.36"
}
```

### 货币代码转换示例

输入:
```json
{
  "text": "美元"
}
```

输出:
```
转换结果: USD
```

## 支持的货币

该工具支持超过160种全球货币，包括但不限于：
- CNY (人民币)
- USD (美元)
- EUR (欧元)
- JPY (日元)
- HKD (港币)
- GBP (英镑)
- 以及更多...

## 技术实现

- 基于 Model Context Protocol (MCP) SDK 构建
- 使用阿里云市场的极速汇率 API 获取实时汇率数据
- 通过 stdio 传输实现与 AI 模型的通信

## 注意事项

- API 调用受到阿里云市场的限制，请注意使用频率
- 汇率数据可能会有延迟，不适用于高频交易场景

## 许可证

[MIT](LICENSE)