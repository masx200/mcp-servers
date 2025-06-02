#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import https from "https";

// 响应接口
interface BookInfoResponse {
  status: number;
  msg: string;
  result: {
    title: string;
    subtitle: string;
    pic: string;
    author: string;
    summary: string;
    publisher: string;
    pubplace: string;
    pubdate: string;
    page: string;
    price: string;
    binding: string;
    isbn: string;
    isbn10: string;
    keyword: string;
    edition: string;
    impression: string;
    language: string;
    format: string;
    class: string;
    cip: string;
    sellerlist: Array<{
      seller: string;
      price: string;
      link?: string;
    }>;
  };
}

interface BookSearchResponse {
  status: number;
  msg: string;
  result: {
    keyword: string;
    total: number;
    pagenum: number;
    pagesize: number;
    list: Array<{
      title: string;
      author: string;
      pic: string;
      isbn: string;
    }>;
  };
}

function getAppCode(): string {
  const appCode = process.env.JISU_APPCODE;
  if (!appCode) {
    console.error("环境变量JISU_APPCODE未设置");
    process.exit(1);
  }
  return appCode;
}

const JISU_APPCODE = getAppCode();

// 工具定义
const ISBN_QUERY_TOOL: Tool = {
  name: "isbn_query",
  description: "通过ISBN查询图书信息",
  inputSchema: {
    type: "object",
    properties: {
      isbn: {
        type: "string",
        description: "图书的ISBN号码"
      }
    },
    required: ["isbn"]
  }
};

const BOOK_SEARCH_TOOL: Tool = {
  name: "book_search",
  description: "通过标题搜索图书",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "搜索的图书标题"
      },
      pagenum: {
        type: "number",
        description: "页码（默认为第一页，一页20条）"
      }
    },
    required: ["title"]
  }
};

const TOOLS = [ISBN_QUERY_TOOL, BOOK_SEARCH_TOOL] as const;

// 创建自定义agent以忽略SSL验证
const agent = new https.Agent({
  rejectUnauthorized: false
});

async function handleIsbnQuery(isbn: string) {
  const host = 'https://jisuisbn.market.alicloudapi.com';
  const path = '/isbn/query';

  // 构建查询字符串
  const url = `${host}${path}?isbn=${isbn}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'APPCODE ' + JISU_APPCODE,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      agent: agent
    });

    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return {
        content: [{
          type: "text",
          text: `查询图书信息失败: HTTP 状态 ${response.status}`
        }],
        isError: true
      };
    }

    const content = await response.text();

    try {
      const data = JSON.parse(content) as BookInfoResponse;

      if (data.status !== 0) {
        return {
          content: [{
            type: "text",
            text: `查询失败: ${data.msg}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }],
        isError: false
      };
    } catch (e) {
      return {
        content: [{
          type: "text",
          text: `解析响应失败: ${content}`
        }],
        isError: true
      };
    }
  } catch (error: any) {
    console.error("请求出错:", error);
    return {
      content: [{
        type: "text",
        text: `查询出错: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleBookSearch(title: string, pagenum: number = 1) {
  const host = 'https://jisuisbn.market.alicloudapi.com';
  const path = '/isbn/search';

  // 构建查询字符串
  const encodedTitle = encodeURIComponent(title);
  const querys = `pagenum=${pagenum}&title=${encodedTitle}`;
  const url = `${host}${path}?${querys}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'APPCODE ' + JISU_APPCODE,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      agent: agent
    });

    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return {
        content: [{
          type: "text",
          text: `搜索图书失败: HTTP 状态 ${response.status}`
        }],
        isError: true
      };
    }

    const content = await response.text();

    try {
      const data = JSON.parse(content) as BookSearchResponse;

      if (data.status !== 0) {
        return {
          content: [{
            type: "text",
            text: `搜索失败: ${data.msg}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }],
        isError: false
      };
    } catch (e) {
      return {
        content: [{
          type: "text",
          text: `解析响应失败: ${content}`
        }],
        isError: true
      };
    }
  } catch (error: any) {
    console.error("请求出错:", error);
    return {
      content: [{
        type: "text",
        text: `搜索出错: ${error.message}`
      }],
      isError: true
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "book-info",
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
      case "isbn_query": {
        const { isbn } = request.params.arguments as { isbn: string };
        return await handleIsbnQuery(isbn);
      }

      case "book_search": {
        const { title, pagenum = 1 } = request.params.arguments as {
          title: string;
          pagenum?: number;
        };
        return await handleBookSearch(title, pagenum);
      }

      default:
        return {
          content: [{
            type: "text",
            text: `未知工具: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
