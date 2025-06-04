#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// 响应接口
interface IPResponse {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  orderNo?: string;
}

// IP地址API响应接口
interface IPAddressResponse {
  success: boolean;
  code: number;
  msg: string;
  data: string;
}

// 阿里云IP地址查询API响应接口
interface AliyunIPLocationResponse {
  ip: string;
  msg: string;
  success: boolean;
  code: number;
  data: {
    orderNo: string;
    province: string;
    city: string;
    nation: string;
    ip: string;
    isp: string;
  };
}

// 获取API密钥
function getApiKey(): string {
  const apiKey = process.env.ALIYUN_IP_API_KEY;
  if (!apiKey) {
    console.error("ALIYUN_IP_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

const ALIYUN_IP_API_KEY = getApiKey();

// 工具定义
const GET_MY_IP_TOOL: Tool = {
  name: "get_my_ip",
  description: "查询当前IP地址及其地理位置信息",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  outputSchema: {
    type: "object",
    properties: {
      ip: {
        type: "string",
        description: "IP地址"
      }
    },
    required: ["ip"]
  }
};

const GET_IP_LOCATION_TOOL: Tool = {
  name: "get_ip_location",
  description: "查询指定IP地址的地理位置信息",
  inputSchema: {
    type: "object",
    properties: {
      ip: {
        type: "string",
        description: "要查询的IP地址"
      }
    },
    required: ["ip"]
  },
  outputSchema: {
    type: "object",
    properties: {
      ip: {
        type: "string",
        description: "IP地址"
      },
      country: {
        type: "string",
        description: "国家"
      },
      region: {
        type: "string",
        description: "省份/地区"
      },
      city: {
        type: "string",
        description: "城市"
      },
      isp: {
        type: "string",
        description: "互联网服务提供商"
      },
      orderNo: {
        type: "string",
        description: "订单号"
      }
    },
    required: ["ip", "country", "region", "city", "isp"]
  }
};

const IP_TOOLS = [
  GET_MY_IP_TOOL,
  GET_IP_LOCATION_TOOL
] as const;

// API处理函数
async function handleGetMyIP() {
  try {
    // 首先获取当前IP地址
    const ipResponse = await fetch("https://www.ipplus360.com/getIP");
    if (!ipResponse.ok) {
      return {
        content: [{
          type: "text",
          text: `获取IP地址失败: ${ipResponse.statusText}`
        }],
        isError: true
      };
    }
    
    const ipData = await ipResponse.json() as IPAddressResponse;
    // 检查响应是否成功
    if (!ipData.success || ipData.code !== 200) {
      return {
        content: [{
          type: "text",
          text: `获取IP地址失败: ${ipData.msg}`
        }],
        isError: true
      };
    }
    
    const ip = ipData.data;
    
    // 然后获取IP地址的地理位置信息
    // return await getIPLocation(ip);
    return {
      structuredContent: { ip: ip },
      content: [{
        type: "text",
        text: JSON.stringify({ ip: ip }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleGetIPLocation(ip: string) {
  return await getIPLocation(ip);
}

// 获取IP地址的地理位置信息
async function getIPLocation(ip: string) {
  try {
    // 使用阿里云IP地址查询API
    const host = 'https://kzipglobal.market.alicloudapi.com';
    const path = '/api/ip/query';
    const url = `${host}${path}?ip=${ip}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'APPCODE ' + ALIYUN_IP_API_KEY
      }
    });
    
    if (!response.ok) {
      return {
        content: [{
          type: "text",
          text: `获取IP地址位置信息失败: ${response.statusText}`
        }],
        isError: true
      };
    }
    
    const result = await response.json() as AliyunIPLocationResponse;
    
    const ipInfo: IPResponse = {
      ip: ip,
      country: result.data.nation || "未知",
      region: result.data.province || "未知",
      city: result.data.city || "未知",
      isp: result.data.isp || "未知",
      orderNo: result.data.orderNo
    };
    
    return {
      structuredContent: ipInfo,
      content: [{
        type: "text",
        text: JSON.stringify(ipInfo, null, 2)
      }, {
        type: "text",
        text: `\n\n原始API响应数据:\n${JSON.stringify(result, null, 2)}`
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// 服务器设置
const server = new Server(
  {
    name: "mcp-server/ip-query",
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
  tools: IP_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_my_ip": {
        return await handleGetMyIP();
      }
      
      case "get_ip_location": {
        const { ip } = request.params.arguments as { ip: string };
        return await handleGetIPLocation(ip);
      }
      
      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IP Query MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 