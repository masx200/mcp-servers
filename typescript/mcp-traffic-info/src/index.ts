#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

function getApiKey(name: string): string {
  const apiKey = process.env[name];
  if (!apiKey) {
    console.error(`${name} 环境变量未设置`);
    process.exit(1);
  }
  return apiKey;
}

const OIL_PRICE_API_KEY = getApiKey("OIL_PRICE_API_KEY");

// 工具定义
const OIL_PRICE_TOOL: Tool = {
  name: "oil_price_query",
  description: "查询今日油价",
  inputSchema: {
    type: "object",
    properties: {
      prov: {
        type: "string",
        description: "省份，如北京，广西"
      }
    },
    required: ["prov"]
  },
  outputSchema: {
    type: "object",
    properties: {
      msg: { type: "string" },
      success: { type: "boolean" },
      code: { type: "number" },
      data: {
        type: "object",
        properties: {
          orderNo: { type: "string" },
          ret_code: { type: "number" },
          list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prov: { type: "string", description: "省份" },
                p0: { type: "string", description: "0号油价格" },
                p89: { type: "string", description: "89号油价格" },
                p90: { type: "string", description: "90号油价格" },
                p92: { type: "string", description: "92号油价格" },
                p93: { type: "string", description: "93号油价格" },
                p95: { type: "string", description: "95号油价格" },
                p97: { type: "string", description: "97号油价格" },
                p98: { type: "string", description: "98号油价格" },
                ct: { type: "string", description: "更新时间" }
              }
            }
          }
        }
      }
    }
  }
};

const VEHICLE_LIMIT_TOOL: Tool = {
  name: "vehicle_limit_query",
  description: "查询尾号限行信息",
  inputSchema: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "城市名称，如hangzhou"
      },
      date: {
        type: "string",
        description: "日期，格式为YYYY-MM-DD，默认为今天"
      }
    },
    required: ["city"]
  },
  outputSchema: {
    type: "object",
    properties: {
      status: { type: "string" },
      msg: { type: "string" },
      result: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市代码" },
          cityname: { type: "string", description: "城市名称" },
          date: { type: "string", description: "日期" },
          week: { type: "string", description: "星期几" },
          time: {
            type: "array",
            items: { type: "string" },
            description: "限行时间段"
          },
          area: { type: "string", description: "限行区域详细描述" },
          summary: { type: "string", description: "限行规则摘要" },
          numberrule: { type: "string", description: "限行规则类型" },
          number: { type: "string", description: "限行的尾号" }
        }
      }
    }
  }
};

const TOOLS = [OIL_PRICE_TOOL, VEHICLE_LIMIT_TOOL] as const;

async function handleOilPriceQuery(prov: string) {
  const host = 'https://smjryjcx.market.alicloudapi.com';
  const path = '/oil/price';
  const encodedProv = encodeURIComponent(prov);
  const url = `${host}${path}?prov=${encodedProv}`;

  const headers = {
    "Authorization": `APPCODE ${OIL_PRICE_API_KEY}`
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`);
    }

    const data = await response.json();
    return {
      structuredContent: data,
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
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

async function handleVehicleLimitQuery(city: string, date: string) {
  // 如果没有提供日期参数，设置为今天
  if (!date) {
    const today = new Date();
    date = today.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
  }

  const host = 'https://jisuclwhxx.market.alicloudapi.com';
  const path = '/vehiclelimit/query';
  const encodedCity = encodeURIComponent(city);
  const encodedDate = encodeURIComponent(date);
  const url = `${host}${path}?city=${encodedCity}&date=${encodedDate}`;

  const headers = {
    "Authorization": `APPCODE ${OIL_PRICE_API_KEY}`
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`);
    }

    const data = await response.json();
    return {
      structuredContent: data,
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
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

// 服务器设置
const server = new Server(
  {
    name: "traffic-info",
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
      case "oil_price_query": {
        const { prov } = request.params.arguments as { prov: string };
        return await handleOilPriceQuery(prov);
      }
      case "vehicle_limit_query": {
        const { city, date } = request.params.arguments as { city: string; date: string };
        return await handleVehicleLimitQuery(city, date);
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
  console.error("交通信息 MCP 服务器正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
