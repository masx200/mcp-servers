# MCP 服务：每日热榜 (mcp-daily-hot-list)

**版本 (Version):** 0.1.0

## 描述 (Description)

`mcp-daily-hot-list` 服务提供从多个主流网站获取每日热门榜单数据的功能。用户可以通过此服务查询支持的站点列表，并进一步获取特定站点的实时热榜信息。返回的数据经过格式化，易于阅读和使用。

## 可用工具 (Available Tools)

该服务提供以下工具：

### 1. `get_site_list`

*   **描述 (Description):**
    获取本服务支持的所有站点及其对应的热榜类别。
*   **输入参数 (Input Parameters):**
    无。此工具不需要任何输入参数。
*   **输出结构 (Output Structure):**
    返回一个对象，其中包含一个文本内容，列出了所有支持的站点及其类别。
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "支持的站点列表:\n站点: 哔哩哔哩, 类别: 热门榜\n站点: AcFun, 类别: 排行榜\n..."
        }
      ],
      "isError": false
    }
    ```
    *   `content`: 数组，通常包含一个 `text` 类型的对象。
        *   `type`: 固定为 `"text"`。
        *   `text`: 格式化的字符串，包含了所有支持的站点名和类别名，每行一个站点。
    *   `isError`: 布尔值。`false` 表示请求成功，`true` 表示请求失败。

### 2. `get_data_{site_call_name}`

*   **示例 (Examples):** `get_data_bilibili`, `get_data_weibo`, `get_data_zhihu`
*   **描述 (Description):**
    获取指定站点最新的热榜数据。`{site_call_name}` 部分需要替换为目标站点的"调用名称"（详见下方的"支持的站点列表"）。
    例如，调用 `get_data_bilibili` 将获取"哔哩哔哩 - 热门榜"的数据。
*   **输入参数 (Input Parameters):**
    无。此工具不需要任何输入参数。
*   **输出结构 (Output Structure):**
    返回一个对象，其中包含一个热榜项目列表。
    ```json
    {
      "content": [
        {
          "type": "hotListItem",
          "rank": 1,
          "id": "BV1q8ExzYEs6",
          "title": "SEVENTEEN 'THUNDER' Official MV",
          "desc": "SEVENTEEN 'THUNDER' Official MV\n\n#SEVENTEEN \n#HAPPY_BURSTDAY\n#SVT_THUNDER",
          "cover": "https://i0.hdslb.com/bfs/archive/8d4ea3251893291530ee3f95f77a8cbac8fd109b.jpg",
          "author": "SEVENTEEN",
          "timestamp": 1748250000000,
          "hot": 1097028,
          "url": "https://b23.tv/BV1q8ExzYEs6",
          "mobileUrl": "https://m.bilibili.com/video/BV1q8ExzYEs6"
        },
        {
          "type": "hotListItem",
          "rank": 2,
          "id": "SOME_OTHER_ID",
          "title": "Another Hot Item",
          "desc": "Description for another item.",
          "cover": "https://example.com/cover.jpg",
          "author": "Another Author",
          "timestamp": 1748250000001,
          "hot": 500000,
          "url": "https://example.com/item2",
          "mobileUrl": "https://m.example.com/item2"
        }
      ],
      "isError": false
    }
    ```
    *   `content`: 数组，包含多个 `hotListItem` 对象。每个对象代表一个热榜条目，并 **必须包含** 以下所有属性：
        *   `type` (string): 固定为 `"hotListItem"`。
        *   `rank` (number): 项目在榜单上的排名。
        *   `id` (string): 项目的唯一标识符 (如果原始API未提供，则为空字符串)。
        *   `title` (string): 项目的主要标题 (如果原始API未提供，则为"无标题")。
        *   `desc` (string): 关于项目的简短描述或摘要 (如果原始API未提供，则为空字符串)。
        *   `cover` (string): 封面图片的URL (如果原始API未提供，则为空字符串)。
        *   `author` (string): 项目的作者或发布者 (如果原始API未提供，则为空字符串)。
        *   `timestamp` (number): 项目发布或更新的时间戳（毫秒）(如果原始API未提供，则为0)。
        *   `hot` (number): 项目的原始热度值 (如果原始API未提供，则为0)。
        *   `url` (string): 指向该项目内容的网页链接 (如果原始API未提供，则为空字符串)。
        *   `mobileUrl` (string): 指向该项目内容的移动端优化网页链接 (如果原始API未提供，则为空字符串)。
    *   `isError`: 布尔值。`false` 表示请求成功且获取到数据，`true` 表示请求过程中发生错误或未找到有效数据。 如果为 `true`，`content` 数组可能包含一个错误对象，而不是 `hotListItem`。

## 支持的站点列表 (Supported Sites)

下表列出了当前服务支持的所有站点及其类别和调用名称（用于 `get_data_{site_call_name}` 工具）。

| 站点名称 (Site Name) | 类别 (Category) | 调用名称 (Call Name) |
| :------------------- | :-------------- | :------------------- |
| 哔哩哔哩             | 热门榜          | `bilibili`           |
| AcFun                | 排行榜          | `acfun`              |
| 微博                 | 热搜榜          | `weibo`              |
| 知乎                 | 热榜            | `zhihu`              |
| 知乎日报             | 推荐榜          | `zhihu-daily`        |
| 百度                 | 热搜榜          | `baidu`              |
| 抖音                 | 热点榜          | `douyin`             |
| 快手                 | 热点榜          | `kuaishou`           |
| 豆瓣电影             | 新片榜          | `douban-movie`       |
| 豆瓣讨论小组         | 讨论精选        | `douban-group`       |
| 百度贴吧             | 热议榜          | `tieba`              |
| 少数派               | 热榜            | `sspai`              |
| IT之家               | 热榜            | `ithome`             |
| IT之家「喜加一」     | 最新动态        | `ithome-xijiayi`     |
| 简书                 | 热门推荐        | `jianshu`            |
| 果壳                 | 热门文章        | `guokr`              |
| 澎湃新闻             | 热榜            | `thepaper`           |
| 今日头条             | 热榜            | `toutiao`            |
| 36 氪                | 热榜            | `36kr`               |
| 51CTO                | 推荐榜          | `51cto`              |
| CSDN                 | 排行榜          | `csdn`               |
| NodeSeek             | 最新动态        | `nodeseek`           |
| 稀土掘金             | 热榜            | `juejin`             |
| 腾讯新闻             | 热点榜          | `qq-news`            |
| 新浪网               | 热榜            | `sina`               |
| 新浪新闻             | 热点榜          | `sina-news`          |
| 网易新闻             | 热点榜          | `netease-news`       |
| 吾爱破解             | 榜单            | `52pojie`            |
| 全球主机交流         | 榜单            | `hostloc`            |
| 虎嗅                 | 24小时          | `huxiu`              |
| 酷安                 | 热榜            | `coolapk`            |
| 虎扑                 | 步行街热帖      | `hupu`               |
| 爱范儿               | 快讯            | `ifanr`              |
| 英雄联盟             | 更新公告        | `lol`                |
| 米游社               | 最新消息        | `miyoushe`           |
| 原神                 | 最新消息        | `genshin`            |
| 崩坏3                | 最新动态        | `honkai`             |
| 崩坏：星穹铁道       | 最新动态        | `starrail`           |
| 微信读书             | 飙升榜          | `weread`             |
| NGA                  | 热帖            | `ngabbs`             |
| V2EX                 | 主题榜          | `v2ex`               |
| HelloGitHub          | Trending        | `hellogithub`        |
| 中央气象台           | 全国气象预警    | `weatheralarm`       |
| 中国地震台           | 地震速报        | `earthquake`         |
| 历史上的今天         | 月-日           | `history`            |

## 注意事项 (Notes)

*   所有 `get_data_{site_call_name}` 工具均从 `https://www.mcpcn.cc/newsapi/{site_call_name}` 获取数据。
*   数据返回条数默认为 API 返回的前30条。
*   热度、时间等信息的可用性取决于源 API 是否提供。 