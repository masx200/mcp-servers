#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 获取API密钥
function getApiKey(): string {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.error("NEWS_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

const NEWS_API_KEY = getApiKey();

// 新闻分类列表
const NEWS_CATEGORIES = [
  "头条",
  "新闻",
  "财经",
  "体育",
  "娱乐",
  "军事",
  "教育",
  "科技",
  "NBA",
  "股票",
  "星座",
  "女性",
  "健康",
  "育儿",
];

// 工具定义
const GET_NEWS_BY_CATEGORY_TOOL: Tool = {
  name: "get_news_by_category",
  description: "根据分类获取新闻列表",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: `新闻分类，可选值：${NEWS_CATEGORIES.join(", ")}`,
      },
      num: {
        type: "integer",
        description: "返回新闻数量，默认10，最大40",
        default: 10,
      },
      start: {
        type: "integer",
        description: "起始位置，默认0",
        default: 0,
      },
    },
    required: ["channel"],
  },
  outputSchema: {
    type: "object",
    properties: {
      status: {
        type: "any",
        description: "返回状态码，0表示成功",
      },
      msg: {
        type: "string",
        description: "返回状态信息",
      },
      result: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "新闻分类",
          },
          num: {
            type: "string",
            description: "返回新闻数量",
          },
          list: {
            type: "array",
            description: "新闻列表",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "新闻标题",
                },
                time: {
                  type: "string",
                  description: "发布时间",
                },
                src: {
                  type: "string",
                  description: "新闻来源",
                },
                category: {
                  type: "string",
                  description: "新闻分类",
                },
                pic: {
                  type: "string",
                  description: "图片URL",
                },
                content: {
                  type: "string",
                  description: "新闻内容",
                },
                url: {
                  type: "string",
                  description: "移动端URL",
                },
                weburl: {
                  type: "string",
                  description: "网页端URL",
                },
              },
            },
          },
        },
      },
    },
  },
};

const SEARCH_NEWS_TOOL: Tool = {
  name: "search_news_by_keyword",
  description: "根据关键词搜索新闻",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "搜索关键词",
      },
    },
    required: ["keyword"],
  },
  outputSchema: {
    type: "object",
    properties: {
      status: {
        type: "any",
        description: "返回状态码，0表示成功",
      },
      msg: {
        type: "string",
        description: "返回状态信息",
      },
      result: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "搜索关键词",
          },
          num: {
            type: "string",
            description: "返回新闻数量",
          },
          list: {
            type: "array",
            description: "新闻列表",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "新闻标题",
                },
                time: {
                  type: "string",
                  description: "发布时间",
                },
                src: {
                  type: "string",
                  description: "新闻来源",
                },
                category: {
                  type: "string",
                  description: "新闻分类",
                },
                pic: {
                  type: "string",
                  description: "图片URL",
                },
                content: {
                  type: "string",
                  description: "新闻内容",
                },
                url: {
                  type: "string",
                  description: "移动端URL",
                },
                weburl: {
                  type: "string",
                  description: "网页端URL",
                },
              },
            },
          },
        },
      },
    },
  },
};

const TOOLS = [GET_NEWS_BY_CATEGORY_TOOL, SEARCH_NEWS_TOOL] as const;

// 处理根据分类获取新闻的请求
async function handleGetNewsByCategory(
  channel: string,
  num: number = 10,
  start: number = 0,
) {
  // 验证分类是否有效
  if (!NEWS_CATEGORIES.includes(channel)) {
    return {
      content: [{
        type: "text",
        text: `无效的新闻分类: ${channel}。有效分类为: ${
          NEWS_CATEGORIES.join(", ")
        }`,
      }],
      isError: true,
    };
  }

  const host = "https://jisunews.market.alicloudapi.com";
  const path = "/news/get";

  // 构建查询参数
  const encodedChannel = encodeURIComponent(channel);
  const querys = `channel=${encodedChannel}&num=${num}&start=${start}`;
  const url = `${host}${path}?${querys}`;

  // 设置请求头
  const headers = {
    "Authorization": `APPCODE ${NEWS_API_KEY}`,
    "Content-Type": "application/json; charset=UTF-8",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return {
        content: [{
          type: "text",
          text: `获取新闻失败: HTTP 状态 ${response.status}`,
        }],
        isError: true,
      };
    }

    // 获取响应文本并解析为JSON
    const responseText = await response.text();

    const data = JSON.parse(responseText);

    // 直接返回API的原始数据，符合outputSchema格式
    if (data.status === 0) {
      return {
        structuredContent: data,
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2),
        }],
        data: data, // 返回原始API数据，符合outputSchema
        isError: false,
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `获取新闻失败: ${data.msg || "未知错误"}`,
        }],
        data: data, // 即使出错也返回原始数据
        isError: true,
      };
    }
  } catch (error: any) {
    console.error("请求出错:", error);
    return {
      content: [{
        type: "text",
        text: `查询出错: ${error.message}`,
      }],
      isError: true,
    };
  }
}

// 处理根据关键词搜索新闻的请求
async function handleSearchNewsByKeyword(keyword: string) {
  const host = "https://jisunews.market.alicloudapi.com";
  const path = "/news/search";

  // 构建查询参数
  const encodedKeyword = encodeURIComponent(keyword);
  const querys = `keyword=${encodedKeyword}`;
  const url = `${host}${path}?${querys}`;

  // 设置请求头
  const headers = {
    "Authorization": `APPCODE ${NEWS_API_KEY}`,
    "Content-Type": "application/json; charset=UTF-8",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return {
        content: [{
          type: "text",
          text: `搜索新闻失败: HTTP 状态 ${response.status}`,
        }],
        isError: true,
      };
    }

    // 获取响应文本并解析为JSON
    const responseText = await response.text();

    // 解析JSON响应
    const data = JSON.parse(responseText);

    // 直接返回API的原始数据，符合outputSchema格式
    if (data.status === 0) {
      return {
        structuredContent: data,
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2),
        }],
        data: data, // 返回原始API数据，符合outputSchema
        isError: false,
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `搜索新闻失败: ${data.msg || "未知错误"}`,
        }],
        data: data, // 即使出错也返回原始数据
        isError: true,
      };
    }
  } catch (error: any) {
    console.error("请求出错:", error);
    return {
      content: [{
        type: "text",
        text: `搜索出错: ${error.message}`,
      }],
      isError: true,
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "news-headlines",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_news_by_category": {
        const { channel, num = 10, start = 0 } = request.params.arguments as {
          channel: string;
          num?: number;
          start?: number;
        };
        return await handleGetNewsByCategory(channel, num, start);
      }

      case "search_news_by_keyword": {
        const { keyword } = request.params.arguments as { keyword: string };
        return await handleSearchNewsByKeyword(keyword);
      }

      default:
        return {
          content: [{
            type: "text",
            text: `未知工具: ${request.params.name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("新闻头条 MCP 服务器正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
