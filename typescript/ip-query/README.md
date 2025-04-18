# IP Query MCP

这是一个基于Model Context Protocol (MCP)的IP地址查询服务，提供IP地址查询功能。

## 功能

该MCP提供以下工具：

1. `get_my_ip` - 查询当前IP地址及其地理位置信息
2. `get_ip_location` - 查询指定IP地址的地理位置信息

## 实现

该MCP有两个实现版本：

- Node.js版本 (`node/`)
- Python版本 (尚未实现)

## 使用方法

### Node.js版本

1. 进入`node/`目录
2. 安装依赖：`npm install`
3. 构建：`npm run build`
4. 运行：`npm start`

### 环境变量

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