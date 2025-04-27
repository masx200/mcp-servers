# 电影影讯 MCP 服务器

这是一个基于 Model Context Protocol (MCP) 的电影影讯查询工具，允许 AI 模型获取最新的电影信息、影院信息以及相关查询。

## 功能特点

- **当前上映电影查询**：支持查询指定城市当前上映的电影
- **电影院查询**：查询特定电影在指定城市的放映影院
- **影院排片查询**：获取特定影院的电影排片信息
- **电影详情查询**：查询特定电影的详细信息
- **城市影院列表**：获取指定城市的电影院列表
- **电影城市列表**：获取支持电影查询的城市列表

## 环境配置

> 注意：需要在[极速数据](https://www.jisuapi.com/api/movie/)申请"电影影讯"API的APPKEY作为API密钥。

## 使用方法
```json
{
  "mcpServers": {
    "mcp-server/movie-info": {
      "command": "node",
      "args": [
        "movie-info-server.js"
      ],
      "env": {
        "MOVIE_API_KEY": "极速数据API的APPKEY"
      },
      "autoApprove": [
        "current_movies",
        "movie_theaters",
        "theater_movies",
        "movie_detail",
        "city_theaters",
        "movie_cities"
      ]
    }
  }
}
```

### 工具功能

该工具提供六个主要功能：

1. **当前上映电影查询** (`current_movies`)
   - 输入：城市ID或城市名称、日期
   - 输出：当前上映的电影列表

2. **电影院查询** (`movie_theaters`)
   - 输入：城市ID或城市名称、电影ID、日期
   - 输出：放映指定电影的影院列表

3. **影院排片查询** (`theater_movies`)
   - 输入：影院ID、日期
   - 输出：指定影院的电影排片信息

4. **电影详情查询** (`movie_detail`)
   - 输入：电影ID或电影名称
   - 输出：电影的详细信息

5. **城市影院列表** (`city_theaters`)
   - 输入：城市ID或城市名称、关键词（可选）
   - 输出：指定城市的影院列表

6. **电影城市列表** (`movie_cities`)
   - 输入：上级ID（可选）
   - 输出：支持电影查询的城市列表

## 示例

### 当前上映电影查询示例

输入:
```json
{
  "city": "北京",
  "date": "2023-05-20"
}
```

输出:
```json
{
  "status": 0,
  "msg": "ok",
  "result": {
    "city": "北京",
    "cityid": "1",
    "date": "2023-05-20",
    "list": [
      {
        "movieid": "123456",
        "moviename": "示例电影",
        "pic": "http://example.com/movie.jpg"
      },
      // 更多电影...
    ]
  }
}
```

### 电影详情查询示例

输入:
```json
{
  "movieid": "123456"
}
```

输出:
```json
{
  "status": 0,
  "msg": "ok",
  "result": {
    "moviename": "示例电影",
    "movieid": "123456",
    "enname": "Example Movie",
    "pic": "http://example.com/movie.jpg",
    "class": "动作 冒险",
    "year": "2023",
    "releasedate": "2023-05-01",
    "country": "中国",
    "director": "张三",
    "actor": "李四,王五"
  }
}
```

## 技术实现

- 基于 Model Context Protocol (MCP) SDK 构建
- 使用极速数据的电影影讯 API 获取实时电影数据
- 通过 stdio 传输实现与 AI 模型的通信
- 自动处理API响应，提供格式化的JSON输出

## 注意事项

- API 调用受到极速数据的限制，请注意使用频率
- 某些API可能需要城市ID而不是城市名称，请参考API文档
- 日期格式应为 YYYY-MM-DD

## 许可证

[MIT](LICENSE)

---
