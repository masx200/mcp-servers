# 企业信息查询工具

这是一个基于 Model Context Protocol (MCP) 的企业信息查询工具,允许 AI 模型查询企业的基本信息。

## 功能特点

- **企业基本信息查询**:支持通过企业名称、统一社会信用代码或注册号查询企业详细信息
- **全面的企业数据**:提供包括公司名称、注册资本、经营状态、经营范围等在内的详细企业信息
- **简单易用的接口**:提供直观的工具接口,便于 AI 模型调用

## 环境配置

> 注意:需要在阿里云市场申请"企业工商信息查询"API 的 APPCODE 作为 API 密钥。

## 使用方法

```json
{
  "mcpServers": {
    "mcp-server/enterprise-info": {
      "command": "node",
      "args": [
        "mcp-enterprise-info/dist/index.js"
      ],
      "env": {
        "ENTERPRISE_INFO_API_KEY": "API的APPCODE作为API密钥"
      },
      "autoApprove": [
        "enterprise_info_query"
      ]
    }
  }
}
```

### 工具功能

该工具提供一个主要功能:

1. **企业信息查询** (`enterprise_info_query`)
   - 输入:企业名称、统一社会信用代码或注册号
   - 输出:企业详细信息

## 示例

### 企业信息查询示例

输入:
```json
{
  "keyword": "阿里巴巴"
}
```
## 支持的查询方式

该工具支持以下方式查询企业信息:
- 企业名称inputSchema
- 统一社会信用代码
- 注册号

## 技术实现

- 基于 Model Context Protocol (MCP) SDK 构建
- 使用阿里云市场的企业工商信息查询 API 获取企业数据
- 通过 stdio 传输实现与 AI 模型的通信

## 注意事项

- API 调用受到阿里云市场的限制,请注意使用频率
- 企业信息数据可能存在更新延迟,不适用于需要实时精确数据的场景

## 许可证
- 接口地址为：https://market.aliyun.com/apimarket/detail/cmapi00064569#sku=yuncode5856900001
[MIT](LICENSE)