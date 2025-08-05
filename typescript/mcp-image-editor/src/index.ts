#!/usr/bin/env node
import axios from "axios";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import open from "open";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { translatePromptToEnglish } from "./translate-utils.js";

const server = new Server(
  {
    name: "example-servers/yunwu",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {}, // Required for image resources
    },
  },
);

// 检查所有必需的环境变量
if (!process.env.API_KEY) {
  console.error("API_KEY environment variable is not set");
  process.exit(1);
}

if (!process.env.BAIDU_TRANSLATE_APP_ID) {
  console.error("BAIDU_TRANSLATE_APP_ID environment variable is not set");
  process.exit(1);
}

if (!process.env.BAIDU_TRANSLATE_APP_KEY) {
  console.error("BAIDU_TRANSLATE_APP_KEY environment variable is not set");
  process.exit(1);
}

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://yunwu.ai";

// 图片生成API调用函数 - 提交任务
async function submitGenerateTask(
  prompt: string,
  aspectRatio: string = "1:1",
  n: number = 1,
) {
  try {
    console.error(`提交图片生成任务到: ${BASE_URL}/v1/images/generations`);
    console.error(`请求数据:`, {
      model: "flux-kontext-pro",
      prompt,
      aspect_ratio: aspectRatio,
      n,
    });

    const response = await axios.post(
      `${BASE_URL}/v1/images/generations`,
      {
        model: "flux-kontext-pro",
        prompt,
        aspect_ratio: aspectRatio,
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30秒超时
      },
    );

    console.error(`API响应状态: ${response.status}`);
    console.error(`API响应数据:`, response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`图片生成任务提交失败:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 503) {
        throw new Error(
          `服务暂时不可用(503)，请稍后重试。可能原因：服务器维护或过载`,
        );
      }

      throw new Error(
        `图片生成任务提交失败: ${error.response?.status} ${error.response?.statusText} - ${
          JSON.stringify(error.response?.data)
        }`,
      );
    }
    throw error;
  }
}

// 图片上传函数 - 上传本地图片到MCP服务器
async function uploadImageToMcp(imagePath: string): Promise<string> {
  try {
    console.error(`开始上传图片: ${imagePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    // 读取图片文件
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);

    console.error(`图片文件大小: ${imageBuffer.length} bytes`);

    // 创建FormData
    const formData = new FormData();
    formData.append("file", imageBuffer, {
      filename: fileName,
      contentType: "image/" + path.extname(imagePath).slice(1).toLowerCase(),
    });

    // 上传图片
    const response = await axios.post(
      "https://www.mcpcn.cc/api/fileUploadAndDownload/uploadMcpFile",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30秒超时
      },
    );

    console.error(`上传响应状态: ${response.status}`);
    console.error(`上传响应数据:`, response.data);

    // 检查响应格式
    if (response.data.code !== 0) {
      throw new Error(`图片上传失败: ${response.data.msg || "未知错误"}`);
    }

    if (!response.data.data || !response.data.data.url) {
      throw new Error("上传响应中缺少图片URL");
    }

    const uploadedUrl = response.data.data.url;
    console.error(`图片上传成功，URL: ${uploadedUrl}`);

    return uploadedUrl;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`图片上传失败:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw new Error(
        `图片上传失败: ${error.response?.status} ${error.response?.statusText} - ${
          JSON.stringify(error.response?.data)
        }`,
      );
    }
    console.error(`图片上传失败:`, error);
    throw error;
  }
}

// 异步编辑函数 - 提交编辑任务
async function submitEditTask(
  prompt: string,
  imageUrl: string,
  useMax: boolean = false,
) {
  try {
    const endpoint =
      `${BASE_URL}/replicate/v1/models/black-forest-labs/flux-kontext-pro/predictions`;

    console.error(`提交图片编辑任务到: ${endpoint}`);
    console.error(`请求数据:`, {
      input: {
        prompt,
        input_image: imageUrl,
        aspect_ratio: "match_input_image",
        output_format: "jpg",
        safety_tolerance: 2,
        prompt_upsampling: false,
      },
    });

    const response = await axios.post(
      endpoint,
      {
        input: {
          prompt,
          input_image: imageUrl,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: false,
        },
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30秒超时
      },
    );

    console.error(`API响应状态: ${response.status}`);
    console.error(`API响应数据:`, response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`图片编辑任务提交失败:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      throw new Error(
        `图片编辑任务提交失败: ${error.response?.status} ${error.response?.statusText} - ${
          JSON.stringify(error.response?.data)
        }`,
      );
    }
    throw error;
  }
}

// 查询任务状态 - 已注释（使用直接编辑接口时不需要）

async function getTaskStatus(taskId: string) {
  try {
    const statusUrl = `${BASE_URL}/replicate/v1/predictions/${taskId}`;
    console.error(`查询任务状态: ${statusUrl}`);

    const response = await axios.get(
      statusUrl,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
        timeout: 10000, // 10秒超时
      },
    );

    console.error(`查询状态响应: ${response.status}`);
    console.error(`查询状态数据:`, response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`查询任务状态失败:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 404) {
        throw new Error(`任务不存在或已过期`);
      }

      throw new Error(
        `查询任务状态失败: ${error.response?.status} ${error.response?.statusText}`,
      );
    }
    throw error;
  }
}

async function waitForCompletion(taskId: string, maxAttempts: number = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await getTaskStatus(taskId);

      // 检查任务是否完成 - status为"succeeded"说明任务完成
      if (result.status === "succeeded") {
        console.error(`任务完成！获取到输出图片`);
        return result;
      }

      // 检查是否失败
      if (result.status === "failed") {
        throw new Error(`任务失败: ${result.error || "未知错误"}`);
      }

      // 显示当前状态
      const status = result.status || "starting";
      console.error(
        `任务状态: ${status}，等待2秒后重试... (${i + 1}/${maxAttempts})`,
      );

      // 等待2秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`查询尝试 ${i + 1} 失败:`, error);
      if (i === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error("任务超时，请稍后重试");
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // {
    //   name: "generate_image",
    //   description:
    //     "生成图像并返回可点击的链接查看生成的图像。" +
    //     "该工具将返回一个可在浏览器中点击查看图像的URL。" +
    //     "使用高质量的FLUX Kontext Pro模型进行图像生成。" +
    //     "\n响应将包含查看生成图像的直接链接。",
    //   inputSchema: {
    //     type: "object",
    //     properties: {
    //       prompt: {
    //         type: "string",
    //         description: "期望图像的文本描述",
    //       },
    //       aspect_ratio: {
    //         type: "string",
    //         description: "图像宽高比，如 '1:1', '16:9', '21:9' 等",
    //         default: "1:1",
    //       },
    //       n: {
    //         type: "number",
    //         description: "生成图像的数量",
    //         default: 1,
    //       },
    //     },
    //     required: ["prompt"],
    //   },
    // },
    {
      name: "edit_image",
      description: "编辑现有图像，支持在图片上添加、修改或删除元素。" +
        "可以在图片中添加图案、在背景中添加物体、修改颜色风格等。" +
        "支持对人物、动物、物品进行精确编辑，如在短袖上添加图案、在帽子上加装饰等。" +
        "\n适用场景：给图片添加图案、在物体上加装饰、修改图片元素、改变图片风格等。",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "描述如何编辑图像的文本提示",
          },
          image: {
            type: "string",
            description: "要编辑的原始图像本地文件路径",
          },
          use_max: {
            type: "boolean",
            description: "是否使用max模式（效果更好但可能更慢）",
            default: false,
          },
          aspect_ratio: {
            type: "string",
            description: "图像宽高比，如 '1:1', '16:9', '21:9' 等",
            default: "16:9",
          },
          n: {
            type: "number",
            description: "生成图像的数量",
            default: 1,
          },
        },
        required: ["prompt", "image"],
      },
    },
  ],
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "yunwu://images",
        mimeType: "image/png",
        name: "Generated Images",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "yunwu://images") {
    return {
      contents: [
        {
          uri: "yunwu://images",
          mimeType: "image/png",
          blob: "", // Empty since this is just for listing
        },
      ],
    };
  }
  throw new Error("Resource not found");
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // if (request.params.name === "generate_image") {
  //   try {
  //     const {
  //       prompt,
  //       aspect_ratio = "1:1",
  //       n = 1,
  //     } = request.params.arguments as any;

  //     console.error(`开始生成图像: 模型=flux-kontext-pro, 原始提示词="${prompt}"`);

  //     // 翻译prompt为英文
  //     const translatedPrompt = await translatePromptToEnglish(prompt);
  //     console.error(`翻译后提示词="${translatedPrompt}"`);

  //     // 调用图片生成API
  //     const result = await submitGenerateTask(translatedPrompt, aspect_ratio, n);

  //     if (!result.data || result.data.length === 0) {
  //       throw new Error("未生成图像");
  //     }

  //     const imgUrl = result.data[0].url;

  //     // 自动在默认浏览器中打开图像URL
  //     await open(imgUrl);

  //     // 返回格式化的消息和可点击的链接
  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: `图像生成成功！\n图像已在默认浏览器中打开。\n\n生成详情：\n- 模型: flux-kontext-pro\n- 原始提示词: "${prompt}"\n- 翻译后提示词: "${translatedPrompt}"\n- 宽高比: ${aspect_ratio}\n- 生成数量: ${n}\n- 图像URL: ${imgUrl}\n\n您也可以点击上面的URL再次查看图像。`,
  //         },
  //       ],
  //     };
  //   } catch (error: unknown) {
  //     console.error("详细错误:", error);
  //     const errorMessage =
  //       error instanceof Error ? error.message : "未知错误";
  //     return {
  //       content: [{ type: "text", text: `图像生成错误: ${errorMessage}` }],
  //       isError: true,
  //     };
  //   }
  // }

  if (request.params.name === "edit_image") {
    try {
      const {
        prompt,
        image,
        use_max = false,
        aspect_ratio = "16:9",
        n = 1,
      } = request.params.arguments as any;

      const mode = use_max ? "flux-kontext-max" : "flux-kontext-pro";
      console.error(`开始异步编辑图像: 模式=${mode}, 原始提示词="${prompt}"`);

      // 翻译prompt为英文
      const translatedPrompt = await translatePromptToEnglish(prompt);
      console.error(`翻译后提示词="${translatedPrompt}"`);

      // 第一步：上传图片到MCP服务器获取URL
      console.error(`第一步：上传图片 ${image}`);
      const imageUrl = await uploadImageToMcp(image);

      // 第二步：提交编辑任务
      console.error(`第二步：提交编辑任务，图片URL: ${imageUrl}`);
      const taskResult = await submitEditTask(
        translatedPrompt,
        imageUrl,
        use_max,
      );

      if (!taskResult.id) {
        throw new Error("任务提交失败，未获取到任务ID");
      }

      const taskId = taskResult.id;

      console.error(`任务已提交，任务ID: ${taskId}`);

      // 第三步：等待任务完成
      console.error(`第三步：等待任务完成...`);
      const result = await waitForCompletion(taskId);

      if (!result.output) {
        throw new Error("图像编辑失败，未获取到编辑后的图像");
      }

      const editedImgUrl = result.output;

      // 自动在默认浏览器中打开编辑后的图像URL
      await open(editedImgUrl);

      // 返回格式化的消息和可点击的链接
      return {
        content: [
          {
            type: "text",
            text:
              `图像编辑成功！\n编辑后的图像已在默认浏览器中打开。\n\n编辑详情：\n- 模式: ${mode}\n- 原始提示词: "${prompt}"\n- 翻译后提示词: "${translatedPrompt}"\n- 原始图像路径: ${image}\n- 上传后图像URL: ${imageUrl}\n- 任务ID: ${taskId}\n- 编辑后图像: ${editedImgUrl}\n\n您也可以点击上面的URL再次查看编辑后的图像。`,
          },
        ],
      };
    } catch (error: unknown) {
      console.error("详细错误:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        content: [{ type: "text", text: `图像编辑错误: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  throw new Error(`未知工具: ${request.params.name}`);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("图片生成/编辑MCP服务器正在stdio上运行");
}

runServer().catch(console.error);
