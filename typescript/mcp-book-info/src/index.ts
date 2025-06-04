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
  const appCode = process.env.JISU_ALIYUN_APPCODE;
  if (!appCode) {
    console.error("JISU_ALIYUN_APPCODE environment variable is not set");
    process.exit(1);
  }
  return appCode;
}

const JISU_APPCODE = getAppCode();

// 工具定义修改部分
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
  },
  outputSchema: {
    type: "object",
    properties: {
      status: { type: "number" },
      msg: { type: "string" },
      result: {
        type: "object",
        properties: {
          title: { type: "string", description: "图书标题" },
          subtitle: { type: "string", description: "副标题" },
          pic: { type: "string", description: "图书封面图片URL" },
          author: { type: "string", description: "作者" },
          summary: { type: "string", description: "图书简介" },
          publisher: { type: "string", description: "出版社" },
          pubplace: { type: "string", description: "出版地" },
          pubdate: { type: "string", description: "出版日期" },
          page: { type: "any", description: "页数" },
          price: { type: "string", description: "价格" },
          binding: { type: "string", description: "装帧方式" },
          isbn: { type: "string", description: "ISBN-13" },
          isbn10: { type: "string", description: "ISBN-10" },
          keyword: { type: "string", description: "关键词" },
          edition: { type: "string", description: "版次" },
          impression: { type: "string", description: "印次" },
          language: { type: "string", description: "语言" },
          format: { type: "string", description: "开本" },
          class: { type: "string", description: "分类号" },
          cip: { type: "string", description: "CIP数据核字号" },
          sellerlist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                seller: { type: "string", description: "销售商" },
                price: { type: "string", description: "售价" },
                link: { type: "string", description: "购买链接" }
              }
            },
            description: "销售商列表"
          }
        }
      }
    }
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
  },
  outputSchema: {
    type: "object",
    properties: {
      status: { type: "number" },
      msg: { type: "string" },
      result: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "搜索关键词" },
          total: { type: "number", description: "总结果数" },
          pagenum: { type: "number", description: "当前页码" },
          pagesize: { type: "number", description: "每页结果数" },
          list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "图书标题" },
                author: { type: "string", description: "作者" },
                pic: { type: "string", description: "图书封面图片URL" },
                isbn: { type: "string", description: "ISBN" }
              }
            },
            description: "搜索结果列表"
          }
        }
      }
    }
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

      // 修改返回格式
      return {
        structuredContent: data,
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
        structuredContent: data,
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
  console.error("图书信息查询 MCP 服务器正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
