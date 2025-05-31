#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as math from "mathjs";

/**
 * 数学表达式计算MCP服务器
 * 支持计算各种数学表达式，如 (342-342*3/2)^2
 */

const server = new Server(
  {
    name: "mcp-math-eval",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义工具
const tools: Tool[] = [
  {
    name: "calculate_math_expression",
    description: "计算数学表达式并返回结果。支持基本运算、幂运算、三角函数等。",
    inputSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "要计算的数学表达式，如 '(342-342*3/2)^2' 或 'sin(pi/4)' 等",
        },
      },
      required: ["expression"],
    },
  },
];

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  if (name === "calculate_math_expression") {
    try {
      const { expression } = args as { expression: string };
      
      if (!expression || typeof expression !== "string") {
        throw new Error("表达式不能为空且必须是字符串");
      }

      // 清理输入，移除可能的前缀
      let cleanExpression = expression.trim();
      
      // 如果以"计算："开头，则移除这个前缀
      if (cleanExpression.startsWith("计算：")) {
        cleanExpression = cleanExpression.substring(3).trim();
      }
      
      if (!cleanExpression) {
        throw new Error("数学表达式不能为空");
      }

      // 使用mathjs计算表达式
      const result = math.evaluate(cleanExpression);
      
      // 格式化结果
      let formattedResult: string;
      if (typeof result === "number") {
        // 如果是整数，显示为整数；如果是小数，保留合适的精度
        if (Number.isInteger(result)) {
          formattedResult = result.toString();
        } else {
          // 最多保留10位小数，去除尾随零
          formattedResult = parseFloat(result.toFixed(10)).toString();
        }
      } else {
        formattedResult = result.toString();
      }

      return {
        content: [
          {
            type: "text",
            text: `计算结果：${formattedResult}

原始表达式：${cleanExpression}
计算结果：${formattedResult}

支持的运算：
- 基本运算：+, -, *, /, ^(幂)
- 括号：()
- 三角函数：sin, cos, tan, asin, acos, atan
- 对数：log, log10, ln
- 常数：pi, e
- 其他函数：sqrt, abs, ceil, floor, round`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      
      return {
        content: [
          {
            type: "text",
            text: `计算错误：${errorMessage}

请检查您的数学表达式是否正确。

支持的格式示例：
- 基本运算：2 + 3 * 4
- 幂运算：(342-342*3/2)^2
- 三角函数：sin(pi/4)
- 平方根：sqrt(16)
- 对数：log(100)`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`未知工具：${name}`);
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("数学表达式计算MCP服务器已启动");
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
