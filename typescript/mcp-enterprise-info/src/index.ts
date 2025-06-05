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
  },
  outputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "返回码"
      },
      msg: {
        type: "string",
        description: "返回消息"
      },
      isFee: {
        type: "number",
        description: "是否收费"
      },
      seqNo: {
        type: "string",
        description: "序列号"
      },
      data: {
        type: "object",
        properties: {
          result: {
            type: "number",
            description: "结果标识"
          },
          info: {
            type: "object",
            properties: {
              companyName: {
                type: "string",
                description: "公司名称"
              },
              creditCode: {
                type: "string",
                description: "统一社会信用代码"
              },
              orgNumber: {
                type: "string",
                description: "组织机构代码"
              },
              companyType: {
                type: "string",
                description: "企业类型"
              },
              keyPersonName: {
                type: "string",
                description: "法人"
              },
              keyPersonType: {
                type: "string",
                description: "法人类型"
              },
              regCapital: {
                type: "string",
                description: "注册资本"
              },
              actualCapital: {
                type: "any",
                description: "实缴资本"
              },
              province: {
                type: "string",
                description: "省份"
              },
              provinceCode: {
                type: "string",
                description: "省份编码"
              },
              city: {
                type: "string",
                description: "城市"
              },
              cityCode: {
                type: "string",
                description: "城市编号"
              },
              district: {
                type: "string",
                description: "区县"
              },
              districtCode: {
                type: "string",
                description: "区县编号"
              },
              regNumber: {
                type: "string",
                description: "注册号"
              },
              authority: {
                type: "string",
                description: "登记机关"
              },
              regLocation: {
                type: "string",
                description: "注册地址"
              },
              regStatus: {
                type: "string",
                description: "运营状态"
              },
              businessScope: {
                type: "string",
                description: "经营范围"
              },
              establishTime: {
                type: "string",
                description: "成立时间"
              },
              approvedTime: {
                type: "string",
                description: "核准日期"
              },
              termStart: {
                type: "string",
                description: "运营时间从"
              },
              termEnd: {
                type: "string",
                description: "运营时间至"
              },
              lastUpdatedTime: {
                type: "string",
                description: "更新时间"
              },
              historyNames: {
                type: "string",
                description: "历史曾用名"
              },
              industry: {
                type: "object",
                description: "行业信息",
                properties: {
                  industry: {
                    type: "string",
                    description: "行业门类描述"
                  },
                  industryCode: {
                    type: "string",
                    description: "行业描述code"
                  },
                  subIndustry: {
                    type: "string",
                    description: "行业大类描述"
                  },
                  subIndustryCode: {
                    type: "string",
                    description: "行业大类code"
                  },
                  middleCategory: {
                    type: "string",
                    description: "行业中类描述"
                  },
                  middleCategoryCode: {
                    type: "string",
                    description: "行业中类code"
                  },
                  smallCategory: {
                    type: "string",
                    description: "行业小类描述"
                  },
                  smallCategoryCode: {
                    type: "string",
                    description: "行业小类code"
                  }
                }
              },
              contacts: {
                type: "object",
                description: "联系信息",
                properties: {
                  address: {
                    type: "array",
                    description: "注册地址",
                    items: {
                      type: "object",
                      properties: {
                        note: {
                          type: "string",
                          description: "备注"
                        },
                        value: {
                          type: "string",
                          description: "地址值"
                        }
                      }
                    }
                  },
                  phoneNumber: {
                    type: "array",
                    description: "电话号码",
                    items: {
                      type: "object",
                      properties: {
                        note: {
                          type: "string",
                          description: "备注"
                        },
                        value: {
                          type: "string",
                          description: "电话号码值"
                        }
                      }
                    }
                  },
                  email: {
                    type: "array",
                    description: "邮箱",
                    items: {
                      type: "object",
                      properties: {
                        note: {
                          type: "string",
                          description: "备注"
                        },
                        value: {
                          type: "string",
                          description: "邮箱值"
                        }
                      }
                    }
                  },
                  website: {
                    type: "array",
                    description: "官网",
                    items: {
                      type: "object",
                      properties: {
                        note: {
                          type: "string",
                          description: "备注"
                        },
                        value: {
                          type: "string",
                          description: "网址值"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
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
      structuredContent: data,
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
}

runServer().catch((error) => {
  console.error("运行服务器时发生致命错误:", error);
  process.exit(1);
});
