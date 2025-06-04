import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// API 端点
const API_BASE_URL = "http://cx.shouji.360.cn/phonearea.php";

// 外部API响应接口定义
interface ApiRawData {
  province: string;
  city: string;
  sp: string;
}

interface ApiResponse {
  code: number;
  data: ApiRawData | null; 
}

const QUERY_PHONE_LOCATION_OUTPUT_SCHEMA = {
  type: "object" as const,
  description: "手机号归属地查询结果的结构",
  properties: {
    content: {
      type: "array" as const,
      description: "结果数组。成功时包含一个text对象，失败时为空。",
      items: {
        type: "object" as const,
        properties: {
          province: { type: "string", description: "省份" },
          city: { type: "string", description: "城市" },
          sp: { type: "string", description: "运营商" },
        },
      },
    },
    isError: { type: "boolean", description: "请求是否发生错误" },
    errorMessage: { type: "string", description: "错误信息（如果 isError 为 true 时提供）" },
  },
};

// 工具定义
const QUERY_PHONE_LOCATION_TOOL: Tool = {
  name: "query_phone_location",
  description: "根据手机号码查询其归属地信息（省份、城市、运营商）。",
  inputSchema: {
    type: "object" as const,
    properties: {
      phone_number: {
        type: "string",
        description: "需要查询的11位手机号码。",
        pattern: "^\\d{11}$" // 启用手机号格式校验
      },
    },
    required: ["phone_number"],
  },
  outputSchema: QUERY_PHONE_LOCATION_OUTPUT_SCHEMA,
};

const TOOLS: readonly Tool[] = [QUERY_PHONE_LOCATION_TOOL];

// 处理手机号查询逻辑
async function handleQueryPhoneLocation(input: any) {
  // 验证输入是否为对象类型
  if (!input || typeof input !== 'object') {
    return {
      content: [],
      isError: true,
      errorMessage: "输入参数格式错误，预期为包含phone_number字段的对象。",
    };
  }

  const phoneNumber = input.phone_number;

  if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
    return {
      content: [],
      isError: true,
      errorMessage: "无效的手机号码格式。请输入11位数字的手机号码。",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}?number=${phoneNumber}`);
    if (!response.ok) {
      return {
        content: [],
        isError: true,
        errorMessage: `API请求失败，HTTP状态码: ${response.status}`,
      };
    }

    let apiResponse: ApiResponse;
    try {
      apiResponse = await response.json() as ApiResponse;
    } catch (jsonError) {
      console.error("API响应JSON解析错误:", jsonError);
      return {
        content: [],
        isError: true,
        errorMessage: "API返回的数据格式不正确，无法解析JSON响应。",
      };
    }

    if (apiResponse.code !== 0 || !apiResponse.data) {
      let errorMessage = "未能查询到该手机号码的归属地信息。";
      if (apiResponse.code !== 0) {
        errorMessage = `API返回错误，错误码: ${apiResponse.code}。`;
      }
      return {
        content: [],
        isError: true,
        errorMessage: errorMessage,
      };
    }

    const { province = "", city = "", sp = "" } = apiResponse.data;
    
    // 检查必要的字段是否为空
    if (!province && !city && !sp) {
      return {
        content: [],
        isError: true,
        errorMessage: "API返回的数据不完整，无法获取有效的归属地信息。",
      };
    }

    const locationInfo = { "号码": phoneNumber, "省份": province, "城市": city, "运营商": sp };

    return {
      structuredContent: locationInfo,
      content: [
        {
          type: "text",
          text: JSON.stringify([locationInfo], null, 2)
        },
      ],
      isError: false,
      errorMessage: "",
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("处理手机号归属地查询时发生严重错误:", errorMessage);
    return {
      content: [],
      isError: true,
      errorMessage: `系统内部错误: ${errorMessage}`,
    };
  }
}

// MCP 服务器配置与启动
const server = new Server(
  {
    name: "mcp-phone-location",
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

// 注册请求处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    const toolInput = request.params.arguments;

    console.error(`收到工具调用请求: ${toolName}, 输入: ${JSON.stringify(toolInput)}`);

    if (toolName === QUERY_PHONE_LOCATION_TOOL.name) {
      return await handleQueryPhoneLocation(toolInput);
    }

    console.error(`未知的工具名称: ${toolName}`);
    return {
      content: [],
      isError: true,
      errorMessage: `未找到名为 '${toolName}' 的工具。`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("处理工具调用请求时发生严重错误:", errorMessage);
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
    console.error("MCP 手机号码归属地查询服务已启动");
    console.error(`已注册 ${TOOLS.length} 个工具: ${TOOLS.map((t) => t.name).join(", ")}`);
  } catch (error) {
    console.error("MCP 服务启动失败:", error);
    process.exit(1);
  }
}

runServer();