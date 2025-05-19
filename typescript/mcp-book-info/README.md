# 图书信息 MCP 服务器

这是一个基于 Model Context Protocol (MCP) 的图书信息查询工具，允许 AI 模型通过 ISBN 或书名获取图书的详细信息。

## 功能特点

- **ISBN 查询**：通过 ISBN 号码查询图书的详细信息
- **图书搜索**：通过书名搜索图书，支持分页查询

## 环境配置

> 注意：需要在[极速数据](https://www.jisuapi.com/api/isbn/)申请"ISBN查询"API的APPCODE作为API密钥。

## 使用方法
```json
{
  "mcpServers": {
    "mcp-server/book-info": {
      "command": "node",
      "args": [
        "dist/index.js"
      ],
      "env": {
        "JISU_APPCODE": "极速数据API的APPCODE"
      },
      "autoApprove": [
        "isbn_query",
        "book_search"
      ]
    }
  }
}
```

### 工具功能

该工具提供两个主要功能：

1. **ISBN 查询** (`isbn_query`)
   - 输入：图书的 ISBN 号码
   - 输出：图书的详细信息，包括标题、作者、出版社、摘要等

2. **图书搜索** (`book_search`)
   - 输入：图书标题、页码（可选，默认为第一页）
   - 输出：符合搜索条件的图书列表

## 示例

### ISBN 查询示例

输入:
```json
{
  "isbn": "9787115428028"
}
```

输出:
```json
{
  "status": 0,
  "msg": "ok",
  "result": {
    "title": "深入理解Java虚拟机",
    "subtitle": "JVM高级特性与最佳实践（第2版）",
    "pic": "https://img3.doubanio.com/view/subject/l/public/s27458236.jpg",
    "author": "周志明",
    "summary": "《深入理解Java虚拟机:JVM高级特性与最佳实践(第2版)》内容简介：第1版两年内印刷近10次，4家网上书店的评论近4?000条，98%以上的评论全部为5星级的好评，是整个Java图书领域公认的经典著作和超级畅销书，繁体版在台湾也十分受欢迎。第2版在第1版的基础上做了很大的改进：根据最新的JDK 1.7对全书内容进行了全面的升级和补充；增加了大量处理各种常见JVM问题的技巧和最佳实践；增加了若干与生产环境相结合的实战案例；对第1版中的错误和不足之处的修正；等等。第2版不仅技术更新、内容更丰富，而且实战性更强。",
    "publisher": "机械工业出版社",
    "pubplace": "北京",
    "pubdate": "2013-6-1",
    "page": "433",
    "price": "79.00元",
    "binding": "平装",
    "isbn": "9787115428028",
    "isbn10": "7115428026",
    "keyword": "Java 虚拟机 JVM",
    "edition": "第2版",
    "impression": "",
    "language": "",
    "format": "",
    "class": "TP312JA",
    "cip": "TP312.1",
    "sellerlist": [
      {
        "seller": "京东",
        "price": "59.30元",
        "link": "https://item.jd.com/11252778.html"
      }
    ]
  }
}
```

### 图书搜索示例

输入:
```json
{
  "title": "深入理解Java",
  "pagenum": 1
}
```

输出:
```json
{
  "status": 0,
  "msg": "ok",
  "result": {
    "keyword": "深入理解Java",
    "total": 24,
    "pagenum": 1,
    "pagesize": 20,
    "list": [
      {
        "title": "深入理解Java虚拟机",
        "author": "周志明",
        "pic": "https://img3.doubanio.com/view/subject/l/public/s27458236.jpg",
        "isbn": "9787115428028"
      },
      {
        "title": "深入理解Java Web技术内幕",
        "author": "许令波",
        "pic": "https://img1.doubanio.com/view/subject/l/public/s28292344.jpg",
        "isbn": "9787121234200"
      }
    ]
  }
}
```

## 技术实现

- 使用极速数据的 ISBN 查询 API 获取图书数据
- 通过 Model Context Protocol (MCP) 与 AI 模型通信
- 使用 TypeScript 开发，确保类型安全
- 通过 stdio 传输实现与 AI 模型的通信
- 自动处理 API 响应，提供格式化的 JSON 输出

## 注意事项

- API 调用受到极速数据的限制，请注意使用频率
- ISBN 查询支持 10 位和 13 位 ISBN 号码
- 图书搜索默认每页返回 20 条记录

## 许可证

[ISC](LICENSE)

---