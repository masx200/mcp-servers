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
interface EnterpriseInfoResponse {
  code: string;
  msg: string;
  isFee: number;
  seqNo: string;
  data: {
    result: number;
    info: {
      companyName: string;
      creditCode: string;
      orgNumber: string;
      companyType: string;
      keyPersonName: string;
      keyPersonType: string;
      regCapital: string;
      actualCapital: string;
      province: string;
      provinceCode: string;
      city: string;
      cityCode: string;
      district: string;
      districtCode: string;
      regNumber: string;
      authority: string;
      regLocation: string;
      regStatus: string;
      businessScope: string;
      establishTime: string;
      approvedTime: string;
      termStart: string;
      termEnd: string;
      lastUpdatedTime: string;
      historyNames: string;
      industry: {
        industry: string;
        industryCode: string;
        subIndustry: string;
        subIndustryCode: string;
        middleCategory: string;
        middleCategoryCode: string;
        smallCategory: string;
        smallCategoryCode: string;
      };
      contacts: {
        address: Array<{ note: string; value: string }>;
        phoneNumber: Array<{ note: string; value: string }>;
        email: Array<{ note: string; value: string }>;
        website: Array<{ note: string; value: string }>;
      };
    };
  };
}

function getApiKey(): string {
  const apiKey = process.env.ENTERPRISE_INFO_API_KEY;
  if (!apiKey) {
    console.error("ENTERPRISE_INFO_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

const ENTERPRISE_INFO_API_KEY = getApiKey();

// 工具定义
const ENTERPRISE_INFO_TOOL: Tool = {
  name: "enterprise_info_query",
  description: "查询企业基本信息",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "企业名称或统一社会信用代码或注册号"
      }
    },
    required: ["keyword"]
  }
};

const TOOLS = [ENTERPRISE_INFO_TOOL] as const;

async function handleEnterpriseInfoQuery(keyword: string){
  // 按照Python示例构建URL
  const host = 'https://sxenbase.market.alicloudapi.com';
  const path = '/enterprise_base_info/query';

  // 这里需要对中文关键词进行编码
  const encodedKeyword = encodeURIComponent(keyword);
  const querys = `keyword=${encodedKeyword}`;
  const url = `${host}${path}?${querys}`;

  console.log("请求URL:", url); // 调试用

  // 设置请求头，与Python代码保持一致
  const headers = {
    "Authorization": `APPCODE ${ENTERPRISE_INFO_API_KEY}`
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return {
        content: [{
          type: "text",
          text: `查询企业信息失败: HTTP 状态 ${response.status}`
        }],
        isError: true
      };
    }

    const data = await response.json();

    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }],
      isError: false
    };
  } catch (error:any) {
    console.error("请求出错:", error);
    // @ts-ignore
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
    name: "enterprise-info",
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
      case "enterprise_info_query": {
        const { keyword } = request.params.arguments as { keyword: string };
        return await handleEnterpriseInfoQuery(keyword);
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
  console.error("企业信息查询 MCP 服务器正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
