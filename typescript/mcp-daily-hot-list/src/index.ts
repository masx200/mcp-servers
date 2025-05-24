#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 定义站点信息接口
interface SiteInfo {
  "站点": string;
  "类别": string;
  "调用名称": string;
}

// 站点信息列表
const SITE_LIST: SiteInfo[] = [
  { "站点": "哔哩哔哩", "类别": "热门榜", "调用名称": "bilibili" },
  { "站点": "AcFun", "类别": "排行榜", "调用名称": "acfun" },
  { "站点": "微博", "类别": "热搜榜", "调用名称": "weibo" },
  { "站点": "知乎", "类别": "热榜", "调用名称": "zhihu" },
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

// 定义获取站点数据的输出结构 (用于所有单个站点工具)
const SITE_DATA_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "返回内容数组",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["text"],
            description: "内容类型，固定为text"
          },
          text: {
            type: "string",
            description: "格式化的榜单数据文本，包含以下信息：\n- 站点名称和类别\n- 数据总数和显示条数\n- 每条数据包含：\n  * 排名和标题\n  * 🔗 链接地址\n  * 📱 移动端链接（如果不同）\n  * 🔥 热度（格式化为万/亿）\n  * ⏰ 时间（相对时间或具体时间）\n  * 📝 描述信息（如果有）\n  * 🆔 ID信息（如果有）"
          }
        },
        required: ["type", "text"]
      }
    },
    isError: {
      type: "boolean",
      description: "是否为错误响应，true表示获取数据失败"
    }
  },
  required: ["content", "isError"],
  additionalProperties: false
};

// 为每个站点生成一个工具
const SITE_SPECIFIC_TOOLS: Tool[] = SITE_LIST.map((site): Tool => {
  const toolName = `get_data_${site.调用名称}`;
  return {
    name: toolName,
    description: `获取 ${site.站点} - ${site.类别} 的数据`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: SITE_DATA_OUTPUT_SCHEMA
  };
});

// 工具定义
const GET_SITE_LIST_TOOL: Tool = {
  name: "get_site_list",
  description: "获取支持的站点列表及其类别",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const TOOLS: readonly Tool[] = [GET_SITE_LIST_TOOL, ...SITE_SPECIFIC_TOOLS];

// 统一的错误处理函数
function handleError(message: string, isError: boolean = true) {
  return {
    content: [{ type: "text", text: message }],
    isError,
  };
}

// 处理获取站点列表的请求
async function handleGetSiteList() {
  const siteListText = SITE_LIST.map(site => `站点: ${site.站点}, 类别: ${site.类别}`).join("\n");
  return {
    content: [{
      type: "text",
      text: `支持的站点列表:\n${siteListText}`
    }],
    isError: false
  };
}

// 处理根据站点名称获取数据的请求
async function handleGetSiteData(siteName: string) {
  // 查找目标站点
  const targetSite = SITE_LIST.find(site => site.站点 === siteName);

  // 如果未找到目标站点，返回错误信息
  if (!targetSite) {
    return handleError(`未找到站点: ${siteName}。请从支持的站点列表中选择。`);
  }

  const apiUrl = `https://www.mcpcn.cc/newsapi/${targetSite.调用名称}`;

  try {
    // 发起请求获取数据
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return handleError(`获取 ${siteName} 数据失败: HTTP 状态 ${response.status}`);
    }

    const data: any = await response.json();

    // 检查数据格式并返回结果
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const formattedData = data.data.slice(0, 30).map((item: any, index: number) => {
        // 基础信息提取
        const title = item.title || "无标题"; // 新闻标题
        const url = item.url || item.link || ""; // 新闻链接
        const mobileUrl = item.mobileUrl || ""; // 移动端链接
        
        // 热度信息处理
        const hot = item.hot ? formatHotNumber(item.hot) : null; // 热度数值，格式化显示
        
        // 时间信息处理
        const timestamp = item.timestamp ? formatTimestamp(item.timestamp) : null; // 时间戳转换为可读时间
        
        // 其他信息收集
        const otherInfo: string[] = [];
        
        // 添加热度信息（如果存在）
        if (hot) {
          otherInfo.push(`🔥 热度: ${hot}`);
        }
        
        // 添加时间信息（如果存在）
        if (timestamp) {
          otherInfo.push(`⏰ 时间: ${timestamp}`);
        }
        
        // 添加描述信息（如果存在）
        if (item.desc) {
          otherInfo.push(`📝 描述: ${item.desc}`);
        }
        
        // 添加ID信息（如果存在）
        if (item.id) {
          otherInfo.push(`🆔 ID: ${item.id}`);
        }

        // 格式化输出文本
        let text = `${index + 1}. ${title}`;
        
        // 添加主要链接
        if (url) {
          text += `\n   🔗 链接: ${url}`;
        }
        
        // 添加移动端链接（如果与主链接不同）
        if (mobileUrl && mobileUrl !== url) {
          text += `\n   📱 移动端: ${mobileUrl}`;
        }
        
        // 添加其他详细信息
        if (otherInfo.length > 0) {
          text += `\n   ${otherInfo.join(" | ")}`;
        }
        
        return text;
      }).join("\n\n");
      
      return {
        content: [{
          type: "text",
          text: `${siteName} - ${targetSite.类别} (共${data.data.length}条数据，显示前30条):\n\n${formattedData}`
        }],
        isError: false
      };
    } else {
      return handleError(`未找到 ${siteName} 的有效数据或数据格式不正确。`);
    }
  } catch (error: any) {
    return handleError(`查询 ${siteName} 出错: ${error.message}`);
  }
}

/**
 * 格式化热度数值，将大数字转换为更易读的格式
 * @param hot 热度数值
 * @returns 格式化后的热度字符串
 */
function formatHotNumber(hot: number): string {
  if (hot >= 100000000) {
    // 大于1亿，显示为亿
    return `${(hot / 100000000).toFixed(1)}亿`;
  } else if (hot >= 10000) {
    // 大于1万，显示为万
    return `${(hot / 10000).toFixed(1)}万`;
  } else {
    // 小于1万，直接显示
    return hot.toString();
  }
}

/**
 * 格式化时间戳为可读的时间格式
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  // 如果是今天的内容，显示相对时间
  if (diffDays === 0) {
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 0 ? "刚刚" : `${diffMinutes}分钟前`;
    } else {
      return `${diffHours}小时前`;
    }
  } 
  // 如果是昨天的内容
  else if (diffDays === 1) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  // 如果是更早的内容，显示具体日期
  else {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 服务器设置
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

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async (request: any) => {
  return { tools: TOOLS as Tool[] }; 
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    const toolName = request.params.name; // 获取工具名称
    console.error(`收到工具调用请求: ${toolName}`); // 添加日志

    if (toolName === "get_site_list") {
      return await handleGetSiteList(); // 处理获取站点列表请求
    }

    // 检查是否为特定站点的工具调用
    const siteToolPrefix = "get_data_";
    if (toolName.startsWith(siteToolPrefix)) {
      const siteCallName = toolName.substring(siteToolPrefix.length);
      console.error(`尝试获取站点数据: ${siteCallName}`); // 添加日志
      const targetSite = SITE_LIST.find(s => s.调用名称 === siteCallName);
      if (targetSite) {
        console.error(`找到目标站点: ${targetSite.站点}`); // 添加日志
        return await handleGetSiteData(targetSite.站点); // 使用站点的中文名称调用
      } else {
        return handleError(`未找到调用名称为 ${siteCallName} 的站点配置。`);
      }
    }

    return handleError(`未知工具: ${toolName}`);
  } catch (error) {
    console.error('处理请求时发生错误:', error); // 添加错误日志
    return handleError(`错误: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 运行服务器
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP 日报热门榜服务器正在通过 stdio 运行");
  console.error(`已注册 ${TOOLS.length} 个工具`); // 添加启动日志
  console.error(`工具列表: ${TOOLS.map(t => t.name).join(', ')}`); // 显示所有工具名称
}

// 启动服务器并处理错误
runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});