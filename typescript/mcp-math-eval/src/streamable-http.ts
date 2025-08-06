#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import * as math from "mathjs";
import { randomUUID } from "node:crypto";
/**
 * 数学表达式计算MCP服务器
 * 支持计算各种数学表达式，如 (342-342*3/2)^2
 * 现在支持数值积分和符号微分
 */
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// 数值积分函数 - 使用辛普森规则
function numericalIntegrate(
  expression: string,
  variable: string,
  a: number,
  b: number,
  n: number = 1000,
): number {
  if (n % 2 !== 0) n++; // 确保n是偶数

  const h = (b - a) / n;
  let sum = 0;

  // 创建一个作用域来计算表达式
  const scope: any = {};

  for (let i = 0; i <= n; i++) {
    const x = a + i * h;
    scope[variable] = x;

    const y = math.evaluate(expression, scope);

    if (i === 0 || i === n) {
      sum += y;
    } else if (i % 2 === 1) {
      sum += 4 * y;
    } else {
      sum += 2 * y;
    }
  }

  return (h / 3) * sum;
}

// 解析积分表达式
function parseIntegrate(input: string): {
  expression: string;
  variable: string;
  lower: number;
  upper: number;
} | null {
  // 匹配 integrate("表达式", "变量", 下限, 上限) 格式
  const match = input.match(
    /integrate\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i,
  );

  if (match) {
    return {
      expression: match[1],
      variable: match[2],
      lower: parseFloat(match[3]),
      upper: parseFloat(match[4]),
    };
  }

  return null;
}

// 解析导数表达式
function parseDerivative(
  input: string,
): { expression: string; variable: string } | null {
  // 匹配 derivative("表达式", "变量") 格式
  const match = input.match(
    /derivative\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/i,
  );

  if (match) {
    return {
      expression: match[1],
      variable: match[2],
    };
  }

  return null;
}

// 计算符号导数
function calculateDerivative(expression: string, variable: string): string {
  try {
    const expr = math.parse(expression);
    const derivative = math.derivative(expr, variable);
    return derivative.toString();
  } catch (error) {
    throw new Error(
      `导数计算失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }
}

function factory() {
  // Create MCP server
  const server = new McpServer(
    {
      name: "mcp-math-eval",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // 定义工具
  const tools: Tool[] = [
    {
      name: "calculate_math_expression",
      description:
        "计算数学表达式并返回结果。支持基本运算、幂运算、三角函数、积分、导数等。",
      inputSchema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              "要计算的数学表达式，如 '(342-342*3/2)^2'、'sin(pi/4)'、积分 'integrate(\"2*x\", \"x\", 0, 5)' 或导数 'derivative(\"x^3 + 2*x\", \"x\")' 等",
          },
        },
        required: ["expression"],
      },
    },
  ];

  // 列出可用工具
  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  // 处理工具调用
  server.server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
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

          // 检查是否是导数表达式
          const derivativeParams = parseDerivative(cleanExpression);

          if (derivativeParams) {
            // 计算导数
            const result = calculateDerivative(
              derivativeParams.expression,
              derivativeParams.variable,
            );

            return {
              content: [
                {
                  type: "text",
                  text: `导数计算结果：${result}

原函数：f(${derivativeParams.variable}) = ${derivativeParams.expression}
导数：f'(${derivativeParams.variable}) = ${result}

注意：这是符号微分的结果，给出的是导数的解析表达式。

支持的导数格式：
derivative("表达式", "变量")
例如：derivative("x^3 + 2*x", "x") → 3 * x^2 + 2
     derivative("sin(x)", "x") → cos(x)
     derivative("e^x", "x") → e^x
     derivative("ln(x)", "x") → 1/x`,
                },
              ],
            };
          }

          // 检查是否是积分表达式
          const integralParams = parseIntegrate(cleanExpression);

          if (integralParams) {
            // 计算积分
            const result = numericalIntegrate(
              integralParams.expression,
              integralParams.variable,
              integralParams.lower,
              integralParams.upper,
            );

            const formattedResult = Number.isInteger(result)
              ? result.toString()
              : parseFloat(result.toFixed(10)).toString();

            return {
              content: [
                {
                  type: "text",
                  text: `积分计算结果：${formattedResult}

积分表达式：∫[${integralParams.lower}→${integralParams.upper}] ${integralParams.expression} d${integralParams.variable}
数值积分结果：${formattedResult}

注意：这是使用辛普森规则的数值积分结果，精度约为10位小数。

支持的积分格式：
integrate("表达式", "变量", 下限, 上限)
例如：integrate("2*x", "x", 0, 5)
     integrate("sin(x)", "x", 0, pi)
     integrate("x^2", "x", 1, 3)`,
                },
              ],
            };
          } else {
            // 普通数学表达式计算
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
- 其他函数：sqrt, abs, ceil, floor, round
- 积分：integrate("表达式", "变量", 下限, 上限)
- 导数：derivative("表达式", "变量")`,
                },
              ],
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : "未知错误";

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
- 对数：log(100)
- 积分：integrate("2*x", "x", 0, 5)
- 导数：derivative("x^3 + 2*x", "x")`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`未知工具：${name}`);
    },
  );

  return server;
}

const app = express();
app.use(express.json());
app.use(authenticateToken);
// Token验证中间件
async function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = process.env.HTTP_API_TOKEN;
  if (!token) {
    return next(); // 未设置token，允许匿名访问
  }

  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.split(" ")[1];

  if (
    !authHeader?.startsWith("Bearer ") ||
    !bearerToken ||
    bearerToken !== token
  ) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Invalid or missing token",
      },
      id: null,
    });
  }

  next();
}

// Map to store transports by session ID
const transports = new Map();

// Handle POST requests for client-to-server communication
app.post("/mcp", authenticateToken, async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"];
  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing transport
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports.set(transport!.sessionId!, transport);
        console.log(`New session initialized: ${sessionId}`);
      },
      // DNS rebinding protection is disabled by default for backwards compatibility
      // If you are running this server locally, you can enable it:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1', 'localhost'],
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport!.sessionId) {
        console.log(`Session closed: ${transport!.sessionId}`);
        transports.delete(transport!.sessionId);
      }
    };
    transport.onmessage = async (message, extra) => {
      console.error("message:", JSON.stringify(message, null, 4));
      console.error("extra:", JSON.stringify(extra, null, 4));
    };
    const server = factory();
    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport!.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
async function handleSessionRequest(
  req: express.Request,
  res: express.Response,
) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.get(sessionId);
  await transport.handleRequest(req, res);
}

// Handle GET requests for server-to-client notifications via SSE
app.get("/mcp", authenticateToken, handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/mcp", authenticateToken, handleSessionRequest);

// Start the server
const PORT = process.env.HTTP_API_PORT || 3000;
app.on("error", (err) => console.error("Failed to start HTTP server:", err));
app.listen(PORT, (err) => {
  if (err) return console.error("Failed to start HTTP server:", err);
  const { HTTP_API_TOKEN, HTTP_API_PORT } = process.env;
  console.log(`MCP calculator streamable HTTP server configuration:`);
  console.log(JSON.stringify({ HTTP_API_TOKEN, HTTP_API_PORT }, null, 4));
  console.log(
    `MCP calculator streamable HTTP server listening on http://localhost:${PORT}`,
  );
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);

  const token = process.env.HTTP_API_TOKEN;
  if (token) {
    console.log("HTTP API token authentication enabled,token:", token);
  } else {
    console.log(
      "HTTP API token authentication disabled (anonymous access allowed)",
    );
  }
});
