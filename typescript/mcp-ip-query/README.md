# IP Query MCP

这是一个基于 Model Context Protocol (MCP) 的 IP 地址查询服务，提供 IP 地址查询功能。

## 功能特点

- **查询当前IP地址**：获取当前设备的公共 IP 地址及其地理位置信息。
- **查询指定IP地址**：获取指定 IP 地址的地理位置信息。

## 环境配置

> 注意：您需要拥有阿里云 IP 地址查询 API 的密钥才能使用此服务。请将密钥配置为环境变量 `ALIYUN_IP_API_KEY`。

## 使用方法

```json
{
  "mcpServers": {
    "mcp-server/ip-query": {
      "command": "node",
      "args": [
        "index.js" 
      ],
      "env": {
        "ALIYUN_IP_API_KEY": "您的阿里云IP API密钥"
      },
      "autoApprove": [
        "get_my_ip",
        "get_ip_location"
      ]
    }
  }
}
```

### 工具功能

该 MCP 提供以下工具：

1. **查询当前IP地址** (`get_my_ip`)
   - 输入：无
   - 输出：当前IP地址及其地理位置信息

2. **查询指定IP地址** (`get_ip_location`)
   - 输入：IP 地址 (字符串, 例如: "8.8.8.8")
   - 输出：指定IP地址的地理位置信息

## 示例

### 查询当前IP地址示例

调用工具:
```json
{
  "name": "get_my_ip",
  "arguments": {}
}
```

预期输出 (示例):
```json
{
  "ip": "114.114.114.114",
  "pro": "江苏省",
  "proCode": "320000",
  "city": "南京市",
  "cityCode": "320100",
  "region": "",
  "regionCode": "0",
  "addr": "江苏省南京市 电信",
  "regionNames": "",
  "err": ""
}
```

### 查询指定IP地址示例

调用工具:
```json
{
  "name": "get_ip_location",
  "arguments": {
    "ip": "8.8.8.8"
  }
}
```

预期输出 (示例):
```json
{
  "ip": "8.8.8.8",
  "pro": "美国",
  "proCode": "0",
  "city": "",
  "cityCode": "0",
  "region": "",
  "regionCode": "0",
  "addr": "美国 加利福尼亚州山景市谷歌公司DNS服务器",
  "regionNames": "",
  "err": ""
}
```

## 技术实现

- 基于 Model Context Protocol (MCP) SDK 构建。
- 使用阿里云 IP 地址查询 API 获取 IP 地理位置数据。
- 通过 stdio 传输实现与 AI 模型的通信。
- 自动处理 API 响应，提供格式化的 JSON 输出。

## 注意事项

- 请确保已正确配置 `ALIYUN_IP_API_KEY` 环境变量。
- API 调用可能受到阿里云的频率限制，请查阅相关文档了解详情。

## 许可证

本项目采用 MIT 许可证。详情请参阅 `LICENSE` 文件（如果项目包含）。