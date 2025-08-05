# 交通信息查询工具

这是一个基于 Model Context Protocol (MCP) 的交通信息查询工具,允许 AI
模型查询实时油价和车辆限行信息。

## 功能特点

- **实时油价查询**:支持查询全国各省份的今日油价
- **车辆限行信息查询**:可查询指定城市和日期的尾号限行信息
- **简单易用的接口**:提供直观的工具接口,便于 AI 模型调用

## 环境配置

> 注意:需要在[阿里云市场](https://market.aliyun.com/)申请"今日油价"和"机动车尾号限行"API
> 的 APPCODE 作为 API 密钥。

## 使用方法

```json
{
  "mcpServers": {
    "mcp-server/traffic-info": {
      "command": "node",
      "args": [
        "mcp-traffic-info/dist/index.js"
      ],
      "env": {
        "OIL_PRICE_API_KEY": "API的APPCODE作为API密钥"
      },
      "autoApprove": [
        "oil_price_query",
        "vehicle_limit_query"
      ]
    }
  }
}
```

### 工具功能

该工具提供两个主要功能:

1. **油价查询** (`oil_price_query`)
   - 输入:省份名称
   - 输出:该省份的今日油价信息

2. **车辆限行查询** (`vehicle_limit_query`)
   - 输入:城市名称和日期
   - 输出:指定城市和日期的尾号限行信息

## 示例

### 油价查询示例

输入:

```json
{
  "prov": "北京"
}
```

输出:

```json
{
  "status": "0",
  "msg": "ok",
  "result": {
    "prov": "北京",
    "p0": "6.72",
    "p89": "7.23",
    "p92": "7.58",
    "p95": "8.07",
    "p98": "9.13",
    "time": "2023-06-01"
  }
}
```

### 车辆限行查询示例

输入:

```json
{
  "city": "hangzhou",
  "date": "2023-06-01"
}
```

输出:

```json
{
  "status": "0",
  "msg": "ok",
  "result": {
    "city": "杭州",
    "date": "2023-06-01",
    "week": "星期四",
    "holiday": "",
    "limit": "限行",
    "number": "2和7"
  }
}
```

## 支持的查询范围

- 油价查询:支持全国各省份
- 车辆限行查询:支持主要实施限行政策的城市

## 技术实现

- 基于 Model Context Protocol (MCP) SDK 构建
- 使用阿里云市场的今日油价和机动车尾号限行 API 获取实时数据
- 通过 stdio 传输实现与 AI 模型的通信

## 注意事项

- API 调用受到阿里云市场的限制,请注意使用频率
- 油价和限行信息可能会有延迟,请以官方发布为准

## 许可证

[MIT](LICENSE)
