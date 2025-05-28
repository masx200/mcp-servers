import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 接口定义
interface HotItem {
  id?: string;
  title: string;
  desc?: string;
  cover?: string;
  author?: string;
  timestamp?: number;
  hot?: number;
  url?: string;
  mobileUrl?: string;
}

interface ApiResponse {
  data: HotItem[];
}

interface SiteInfo {
  站点: string;
  类别: string;
  调用名称: string;
}

// API配置
const API_BASE_URL = "https://www.mcpcn.cc/newsapi";

// Schema定义
const OUTPUT_SCHEMA = {
  type: "object" as const,
  description: "热门榜单数据返回格式",
  properties: {
    content: {
      type: "array",
      description: "返回内容数组，包含多条热门数据",
      items: {
        type: "object",
        description: "单条热门数据的内容结构 (JSON object with pre-formatted fields)",
        properties: {
          itemDisplayTitle: { type: "string", description: "列表项的展示标题 (例如: 1. 标题内容)" },
          itemTitle: { type: "string", description: "原始标题" },
          itemUrl: { type: "string", description: "格式化的原文链接 (例如: 🔗 链接：https://xxx.com/xxx)" },
          itemMobileUrl: { type: "string", description: "格式化的移动端链接 (例如: 📱 移动端链接：https://m.xxx.com/xxx)" },
          itemHotness: { type: "string", description: "格式化的热度 (例如: 🔥 热度：10.5万)" },
          itemTimestamp: { type: "string", description: "格式化的发布时间 (例如: ⏰ 时间：5分钟前)" },
          itemDescription: { type: "string", description: "格式化的内容描述 (例如: 📝 描述：这是描述内容)" },
          itemAuthor: { type: "string", description: "格式化的作者信息 (例如: 👤 作者：张三)" },
          itemId: { type: "string", description: "格式化的唯一标识符 (例如: 🆔 ID：12345)" }
        },
        required: ["itemDisplayTitle", "itemTitle"],
        additionalProperties: false
      },
      minItems: 1,
      maxItems: 4
    },
    isError: {
      type: "boolean",
      description: "请求状态标识：\n" +
                  "- false: 表示请求成功\n" +
                  "- true: 表示请求失败"
    }
  },
  required: ["content", "isError"],
  additionalProperties: false
}

// 站点信息列表
const SITE_LIST: SiteInfo[] = [
  { "站点": "哔哩哔哩", "类别": "热门榜", "调用名称": "bilibili" },
  { "站点": "AcFun", "类别": "排行榜", "调用名称": "acfun" },
  { "站点": "微博", "类别": "热搜榜", "调用名称": "weibo" },
  { "站点": "知乎日报", "类别": "推荐榜", "调用名称": "zhihu-daily" },
  { "站点": "百度", "类别": "热搜榜", "调用名称": "baidu" },
  { "站点": "抖音", "类别": "热点榜", "调用名称": "douyin" },
  { "站点": "快手", "类别": "热点榜", "调用名称": "kuaishou" },
  { "站点": "豆瓣电影", "类别": "新片榜", "调用名称": "douban-movie" },
  { "站点": "豆瓣讨论小组", "类别": "讨论精选", "调用名称": "douban-group" },
  { "站点": "百度贴吧", "类别": "热议榜", "调用名称": "tieba" },
  { "站点": "少数派", "类别": "热榜", "调用名称": "sspai" },
  { "站点": "IT之家", "类别": "热榜", "调用名称": "ithome" },
  { "站点": "IT之家「喜加一」", "类别": "最新动态", "调用名称": "ithome-xijiayi" },
  { "站点": "简书", "类别": "热门推荐", "调用名称": "jianshu" },
  { "站点": "果壳", "类别": "热门文章", "调用名称": "guokr" },
  { "站点": "澎湃新闻", "类别": "热榜", "调用名称": "thepaper" },
  { "站点": "今日头条", "类别": "热榜", "调用名称": "toutiao" },
  { "站点": "36 氪", "类别": "热榜", "调用名称": "36kr" },
  { "站点": "51CTO", "类别": "推荐榜", "调用名称": "51cto" },
  { "站点": "CSDN", "类别": "排行榜", "调用名称": "csdn" },
  { "站点": "NodeSeek", "类别": "最新动态", "调用名称": "nodeseek" },
  { "站点": "稀土掘金", "类别": "热榜", "调用名称": "juejin" },
  { "站点": "腾讯新闻", "类别": "热点榜", "调用名称": "qq-news" },
  { "站点": "新浪网", "类别": "热榜", "调用名称": "sina" },
  { "站点": "新浪新闻", "类别": "热点榜", "调用名称": "sina-news" },
  { "站点": "网易新闻", "类别": "热点榜", "调用名称": "netease-news" },
  { "站点": "吾爱破解", "类别": "榜单", "调用名称": "52pojie" },
  { "站点": "全球主机交流", "类别": "榜单", "调用名称": "hostloc" },
  { "站点": "虎嗅", "类别": "24小时", "调用名称": "huxiu" },
  { "站点": "酷安", "类别": "热榜", "调用名称": "coolapk" },
  { "站点": "虎扑", "类别": "步行街热帖", "调用名称": "hupu" },
  { "站点": "爱范儿", "类别": "快讯", "调用名称": "ifanr" },
  { "站点": "英雄联盟", "类别": "更新公告", "调用名称": "lol" },
  { "站点": "米游社", "类别": "最新消息", "调用名称": "miyoushe" },
  { "站点": "原神", "类别": "最新消息", "调用名称": "genshin" },
  { "站点": "崩坏3", "类别": "最新动态", "调用名称": "honkai" },
  { "站点": "崩坏：星穹铁道", "类别": "最新动态", "调用名称": "starrail" },
  { "站点": "微信读书", "类别": "飙升榜", "调用名称": "weread" },
  { "站点": "NGA", "类别": "热帖", "调用名称": "ngabbs" },
  { "站点": "V2EX", "类别": "主题榜", "调用名称": "v2ex" },
  { "站点": "HelloGitHub", "类别": "Trending", "调用名称": "hellogithub" },
  { "站点": "中央气象台", "类别": "全国气象预警", "调用名称": "weatheralarm" },
  { "站点": "中国地震台", "类别": "地震速报", "调用名称": "earthquake" },
  { "站点": "历史上的今天", "类别": "月-日", "调用名称": "history" }
];

// 工具定义
const GET_SITE_LIST_TOOL: Tool = {
  name: "get_site_list",
  description: "获取支持的站点列表及其类别",
  inputSchema: {
    type: "object",
    properties: {},
  },
  outputSchema: OUTPUT_SCHEMA,
};

const SITE_SPECIFIC_TOOLS: Tool[] = SITE_LIST.map(
  (site): Tool => ({
    name: `get_data_${site.调用名称}`,
    description: `获取 ${site.站点} - ${site.类别} 的数据`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: OUTPUT_SCHEMA,
  })
);

const TOOLS: readonly Tool[] = [GET_SITE_LIST_TOOL, ...SITE_SPECIFIC_TOOLS];

// 错误处理 - 返回符合MCP标准的JSON格式
function handleError(message: string, isError: boolean = true) {
  const errorResult = {
    content: [
      {
        itemDisplayTitle: "处理错误",
        itemTitle: message
      }
    ],
    isError
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(errorResult, null, 2)
      }
    ]
  };
}

// 格式化热度值
function formatHotValue(hot: number): string {
  if (hot >= 100000000) {
    return `${(hot / 100000000).toFixed(1)}亿`;
  } else if (hot >= 10000) {
    return `${(hot / 10000).toFixed(1)}万`;
  }
  return hot.toString();
}

// 格式化时间戳
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleString();
  }
}

// 获取站点列表处理函数 - 返回JSON格式
async function handleGetSiteList() {
  const result = {
    content: SITE_LIST.map((site, index) => ({
      itemDisplayTitle: `${index + 1}. ${site.站点}（${site.类别}）`,
      itemTitle: `${site.站点}（${site.类别}）`
    })),
    isError: false
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

// 获取站点数据处理函数 - 返回JSON格式
async function handleGetSiteData(siteName: string) {
  try {
    const targetSite = SITE_LIST.find((site) => site.站点 === siteName);
    if (!targetSite) {
      throw new Error(`未找到站点: ${siteName}`);
    }

    const apiUrl = `${API_BASE_URL}/${targetSite.调用名称}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse = (await response.json()) as ApiResponse;

    if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
      throw new Error("Invalid API response format");
    }

    // 检查API返回的数据是否为空
    if (apiResponse.data.length === 0) {
      throw new Error(`API for ${siteName} returned no data items. This site might have no hot content currently.`);
    }

    // 构建符合schema的JSON数据
    const result = {
      content: apiResponse.data.map((item: HotItem, index: number) => {
        const outputItem: {
          itemDisplayTitle: string;
          itemTitle: string;
          itemUrl?: string;
          itemMobileUrl?: string;
          itemHotness?: string;
          itemTimestamp?: string;
          itemDescription?: string;
          itemAuthor?: string;
          itemId?: string;
        } = {
          itemDisplayTitle: `${index + 1}. ${item.title}`,
          itemTitle: item.title,
        };
        
        if (item.url) outputItem.itemUrl = `🔗 链接：${item.url}`;
        if (item.mobileUrl) outputItem.itemMobileUrl = `📱 移动端链接：${item.mobileUrl}`;
        if (item.hot !== undefined) outputItem.itemHotness = `🔥 热度：${formatHotValue(item.hot)}`;
        if (item.timestamp !== undefined) outputItem.itemTimestamp = `⏰ 时间：${formatTimestamp(item.timestamp)}`;
        if (item.desc) outputItem.itemDescription = `📝 描述：${item.desc}`;
        if (item.author) outputItem.itemAuthor = `👤 作者：${item.author}`;
        if (item.id) outputItem.itemId = `🆔 ID：${item.id}`;
        
        return outputItem;
      }),
      isError: false
    };

    // 返回符合MCP标准的格式，内容为JSON字符串
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error("获取站点数据失败:", error);
    return handleError(`获取 ${siteName} 数据失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 服务器配置和启动
const server = new Server(
  {
    name: "mcp-daily-hot-list",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: TOOLS.reduce((acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      }, {} as Record<string, Tool>),
    },
  }
);

// 请求处理
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    console.error(`收到工具调用请求: ${toolName}`);

    if (toolName === "get_site_list") {
      return await handleGetSiteList();
    }

    const siteToolPrefix = "get_data_";
    if (toolName.startsWith(siteToolPrefix)) {
      const siteCallName = toolName.substring(siteToolPrefix.length);
      const targetSite = SITE_LIST.find((s) => s.调用名称 === siteCallName);

      if (targetSite) {
        console.error(`处理站点请求: ${targetSite.站点}`);
        return await handleGetSiteData(targetSite.站点);
      }

      return handleError(`未找到调用名称为 ${siteCallName} 的站点配置`);
    }

    return handleError(`未知工具: ${toolName}`);
  } catch (error) {
    console.error("处理请求时发生错误:", error);
    return handleError(
      `系统错误: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// 启动服务器
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP 日报热门榜服务器已启动");
    console.error(`已注册 ${TOOLS.length} 个工具`);
    console.error(`工具列表: ${TOOLS.map((t) => t.name).join(", ")}`);
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
}

runServer();
