#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ServerResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 图书信息接口
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

// 图书搜索接口
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

// 配置
const CONFIG = {
  API_HOST: "https://jisuisbn.market.alicloudapi.com",
  ENDPOINTS: {
    ISBN_QUERY: "/isbn/query",
    BOOK_SEARCH: "/isbn/search",
  },
};

// 获取环境变量
function getAppCode(): string {
  const appCode = process.env.JISU_ALIYUN_APPCODE;
  if (!appCode) {
    console.error("JISU_ALIYUN_APPCODE 环境变量未设置");
    process.exit(1);
  }
  return appCode;
}

const JISU_APPCODE = getAppCode();

// 通用API请求函数
async function makeApiRequest<T>(url: string): Promise<ServerResult> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": "APPCODE " + JISU_APPCODE,
        "Content-Type": "application/json; charset=UTF-8",
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `API请求失败: HTTP 状态 ${response.status}`,
      );
    }

    const content = await response.text();

    try {
      const data = JSON.parse(content) as T & { status: number; msg: string };

      if (data.status !== 0) {
        throw new McpError(
          ErrorCode.InternalError,
          `操作失败: ${data.msg}`,
        );
      }

      return {
        structuredContent: data,
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2),
        }],
        isError: false,
      };
    } catch (e) {
      if (e instanceof McpError) {
        throw e;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `解析响应失败: ${content}`,
      );
    }
  } catch (error: unknown) {
    if (error instanceof McpError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `请求出错: ${errorMessage}`,
    );
  }
}

// 工具定义
const ISBN_QUERY_TOOL: Tool = {
  name: "isbn_query",
  description: "通过ISBN查询图书信息",
  inputSchema: {
    type: "object",
    properties: {
      isbn: {
        type: "string",
        description: "图书的ISBN号码",
      },
    },
    required: ["isbn"],
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
                link: { type: "string", description: "购买链接" },
              },
            },
            description: "销售商列表",
          },
        },
      },
    },
  },
};

const BOOK_SEARCH_TOOL: Tool = {
  name: "book_search",
  description: "通过标题搜索图书",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "搜索的图书标题",
      },
      pagenum: {
        type: "number",
        description: "页码（默认为第一页，一页20条）",
      },
    },
    required: ["title"],
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
                isbn: { type: "string", description: "ISBN" },
              },
            },
            description: "搜索结果列表",
          },
        },
      },
    },
  },
};

const TOOLS = [ISBN_QUERY_TOOL, BOOK_SEARCH_TOOL] as const;

// ISBN查询处理函数
async function handleIsbnQuery(isbn: string): Promise<ServerResult> {
  const url = `${CONFIG.API_HOST}${CONFIG.ENDPOINTS.ISBN_QUERY}?isbn=${isbn}`;
  return makeApiRequest<BookInfoResponse>(url);
}

// 图书搜索处理函数
async function handleBookSearch(
  title: string,
  pagenum: number = 1,
): Promise<ServerResult> {
  const encodedTitle = encodeURIComponent(title);
  const querys = `pagenum=${pagenum}&title=${encodedTitle}`;
  const url = `${CONFIG.API_HOST}${CONFIG.ENDPOINTS.BOOK_SEARCH}?${querys}`;
  return makeApiRequest<BookSearchResponse>(url);
}

// 创建服务器实例
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

// 设置错误处理
server.onerror = (error) => console.error("[MCP Error]", error);
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

// 设置请求处理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "isbn_query": {
        const { isbn } = args as { isbn: string };
        if (!isbn) {
          throw new McpError(ErrorCode.InvalidParams, "必须提供ISBN号码");
        }
        return await handleIsbnQuery(isbn);
      }

      case "book_search": {
        const { title, pagenum = 1 } = args as {
          title: string;
          pagenum?: number;
        };
        if (!title) {
          throw new McpError(ErrorCode.InvalidParams, "必须提供图书标题");
        }
        return await handleBookSearch(title, pagenum);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${name}`,
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `执行工具 ${name} 时发生错误: ${errorMessage}`,
    );
  }
});

// 启动服务器
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("图书信息查询 MCP 服务器正在通过 stdio 运行");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

runServer().catch(console.error);
