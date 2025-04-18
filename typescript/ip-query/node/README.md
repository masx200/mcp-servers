# IP Query MCP Server

这是一个基于Model Context Protocol (MCP)的IP地址查询服务器，提供IP地址查询功能。

## 功能

该MCP服务器提供以下工具：

1. `get_my_ip` - 查询当前IP地址及其地理位置信息
2. `get_ip_location` - 查询指定IP地址的地理位置信息

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 运行

```bash
npm start
```

## 环境变量

- `ALIYUN_IP_API_KEY` - 阿里云IP地址查询API的密钥

## API使用示例

### 查询当前IP地址

```json
{
  "name": "get_my_ip",
  "arguments": {}
}
```

### 查询指定IP地址

```json
{
  "name": "get_ip_location",
  "arguments": {
    "ip": "8.8.8.8"
  }
}
```

## 响应格式

### 成功响应

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"ip\":\"8.8.8.8\",\"country\":\"美国\",\"region\":\"加利福尼亚州\",\"city\":\"山景城\",\"isp\":\"Google LLC\"}"
    }
  ],
  "isError": false
}
```

### 错误响应

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Failed to get IP information"
    }
  ],
  "isError": true
}
``` 