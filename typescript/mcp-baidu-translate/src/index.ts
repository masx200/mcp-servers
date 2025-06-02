#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import pkg from "crypto-js";
const { MD5 } = pkg;

// 从环境变量获取百度翻译API凭证
function getBaiduApiCredentials() {
  const appId = process.env.BAIDU_TRANSLATE_APP_ID;
  const appKey = process.env.BAIDU_TRANSLATE_APP_KEY;
  
  if (!appId) {
    console.error("错误: 未设置环境变量 BAIDU_TRANSLATE_APP_ID");
    process.exit(1);
  }
  
  if (!appKey) {
    console.error("错误: 未设置环境变量 BAIDU_TRANSLATE_APP_KEY");
    process.exit(1);
  }
  
  return { appId, appKey };
}

// 百度翻译API配置
const API_ENDPOINT = "http://api.fanyi.baidu.com/api/trans/vip/translate";
const { appId: APP_ID, appKey: APP_KEY } = getBaiduApiCredentials();

// 支持的语言列表
const SUPPORTED_LANGUAGES = {
  zh: "中文",
  en: "英语",
  yue: "粤语",
  wyw: "文言文",
  jp: "日语",
  kor: "韩语",
  fra: "法语",
  spa: "西班牙语",
  th: "泰语",
  ara: "阿拉伯语",
  ru: "俄语",
  pt: "葡萄牙语",
  de: "德语",
  it: "意大利语",
  el: "希腊语",
  nl: "荷兰语",
  pl: "波兰语",
  bul: "保加利亚语",
  est: "爱沙尼亚语",
  dan: "丹麦语",
  fin: "芬兰语",
  cs: "捷克语",
  rom: "罗马尼亚语",
  slo: "斯洛文尼亚语",
  swe: "瑞典语",
  hu: "匈牙利语",
  cht: "繁体中文",
  vie: "越南语",
};

// API响应接口定义
interface BaiduTranslateResult {
  from: string;
  to: string;
  trans_result: Array<{
    src: string;
    dst: string;
  }>;
}

interface BaiduTranslateError {
  error_code: string;
  error_msg: string;
}

type BaiduTranslateResponse = BaiduTranslateResult | BaiduTranslateError;

// 生成MD5签名
function generateSign(text: string, salt: number): string {
  const str = APP_ID + text + salt + APP_KEY;
  return MD5(str).toString();
}

// 翻译工具定义
const TRANSLATE_TEXT_TOOL: Tool = {
  name: "translate_text",
  description: "使用百度翻译进行文本翻译",
  inputSchema: {
    type: "object" as const,
    properties: {
      text: {
        type: "string",
        description: "需要翻译的文本内容",
      },
      from_lang: {
        type: "string",
        description: "源语言代码，例如：'en'表示英语，'zh'表示中文，留空则自动检测",
      },
      to_lang: {
        type: "string",
        description: "目标语言代码，例如：'zh'表示中文，'en'表示英语",
      },
    },
    required: ["text", "to_lang"],
  },
  outputSchema: {
    type: "object" as const,
    description: "翻译结果",
    properties: {
      content: {
        type: "array" as const,
        description: "翻译结果",
        items: {
          type: "object" as const,
          properties: {
            type: { type: "string", enum: ["text"] },
            text: { type: "string", description: "翻译后的文本" },
          },
        },
      },
      detected_language: { 
        type: "string", 
        description: "检测到的源语言（如果源语言未指定）" 
      },
      isError: { type: "boolean", description: "是否发生错误" },
      errorMessage: { 
        type: "string", 
        description: "错误信息，如果isError为true则提供" 
      },
    },
    required: ["content", "isError", "errorMessage"],
  },
};

// 查询支持语言工具
const GET_SUPPORTED_LANGUAGES_TOOL: Tool = {
  name: "get_supported_languages",
  description: "获取百度翻译API支持的所有语言列表",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  outputSchema: {
    type: "object" as const,
    description: "支持的语言列表",
    properties: {
      content: {
        type: "array" as const,
        description: "语言列表",
        items: {
          type: "object" as const,
          properties: {
            type: { type: "string", enum: ["text"] },
            text: { type: "string", description: "语言列表的文本表示" },
          },
        },
      },
      isError: { type: "boolean", description: "是否发生错误" },
      errorMessage: { 
        type: "string", 
        description: "错误信息，如果isError为true则提供" 
      },
    },
    required: ["content", "isError", "errorMessage"],
  },
};

const TOOLS: readonly Tool[] = [TRANSLATE_TEXT_TOOL, GET_SUPPORTED_LANGUAGES_TOOL];

// 处理文本翻译请求
async function handleTranslateText(input: any) {
  if (!input || typeof input !== 'object') {
    return {
      content: [],
      isError: true,
      errorMessage: "输入参数格式错误，预期为包含text和to_lang字段的对象。",
    };
  }

  const { text, from_lang, to_lang } = input;

  if (!text) {
    return {
      content: [],
      isError: true,
      errorMessage: "翻译文本不能为空",
    };
  }

  if (!to_lang) {
    return {
      content: [],
      isError: true,
      errorMessage: "目标语言不能为空",
    };
  }

  try {
    // 生成随机数和签名
    const salt = Math.floor(Math.random() * 10000000);
    const sign = generateSign(text, salt);

    // 构建请求参数
    const params = new URLSearchParams({
      q: text,
      from: from_lang || "auto",
      to: to_lang,
      appid: APP_ID,
      salt: salt.toString(),
      sign: sign,
    });

    // 发送请求
    const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      return {
        content: [],
        isError: true,
        errorMessage: `API请求失败，HTTP状态码: ${response.status}`,
      };
    }

    const data = await response.json() as BaiduTranslateResponse;

    // 检查是否是错误响应
    if ('error_code' in data) {
      return {
        content: [],
        isError: true,
        errorMessage: `翻译API错误：${data.error_code} - ${data.error_msg}`,
      };
    }

    // 正常响应
    return {
      content: [{
        type: "text",
        text: data.trans_result.map(item => item.dst).join('\n')
      }],
      detected_language: data.from,
      isError: false,
      errorMessage: "",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [],
      isError: true,
      errorMessage: `系统错误: ${errorMessage}`,
    };
  }
}

// 处理获取支持语言请求
function handleGetSupportedLanguages() {
  try {
    const languageList = Object.entries(SUPPORTED_LANGUAGES)
      .map(([code, name]) => `${code}: ${name}`)

    return {
      content: [{
        type: "text",
        text: JSON.stringify(languageList, null, 2)
      }],
      isError: false,
      errorMessage: "",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [],
      isError: true,
      errorMessage: `获取支持语言列表时发生错误: ${errorMessage}`,
    };
  }
}

// MCP 服务器配置与启动
const server = new Server(
  {
    name: "mcp-baidu-translate",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册请求处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    const toolInput = request.params.arguments;

    if (toolName === TRANSLATE_TEXT_TOOL.name) {
      return await handleTranslateText(toolInput);
    } else if (toolName === GET_SUPPORTED_LANGUAGES_TOOL.name) {
      return handleGetSupportedLanguages();
    }

    return {
      content: [],
      isError: true,
      errorMessage: `未找到名为 '${toolName}' 的工具。`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [],
      isError: true,
      errorMessage: `处理请求时发生系统内部错误: ${errorMessage}`,
    };
  }
});

// 启动服务器
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
}

runServer(); 