#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  checkLocalToken,
  generateBilibiliWebAuthorizeLink,
  pollCodeAndGetToken,
} from "./oauth.js";
import { getUserInfo, getUserStat } from "./user.js";
import {
  completeVideoUpload,
  getVideoCategories,
  getVideoList,
  submitArchive,
  uploadCover,
  uploadVideoChunk,
  uploadVideoPreprocess,
} from "./video.js";

const USER_INFO_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "用户信息数组，每项为单个用户信息对象",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "用户昵称" },
          face: { type: "string", description: "用户头像" },
          openid: { type: "string", description: "用户openid" },
        },
        required: ["name", "face", "openid"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const USER_STAT_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "用户维度数据数组，每项为单个用户维度对象",
      items: {
        type: "object",
        properties: {
          following: { type: "integer", description: "关注数" },
          follower: { type: "integer", description: "粉丝数" },
          arc_passed_total: {
            type: "integer",
            description: "视频稿件投稿数（审核通过）",
          },
        },
        required: ["following", "follower", "arc_passed_total"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const VIDEO_LIST_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "视频稿件数组，每项为单个视频对象",
      items: {
        type: "object",
        properties: {
          resource_id: { type: "string", description: "稿件ID" },
          title: { type: "string", description: "稿件标题" },
          cover: { type: "string", description: "封面地址" },
          tid: { type: "integer", description: "分区id" },
          no_reprint: { type: "integer", description: "是否禁止转载" },
          desc: { type: "string", description: "视频描述" },
          tag: { type: "string", description: "标签" },
          copyright: { type: "integer", description: "1-原创，2-转载" },
          video_info: { type: "object", description: "视频信息" },
          addit_info: { type: "object", description: "审核信息" },
          ctime: { type: "integer", description: "创建时间" },
          ptime: { type: "integer", description: "发布时间" },
        },
        required: [
          "resource_id",
          "title",
          "cover",
          "tid",
          "no_reprint",
          "desc",
          "tag",
          "copyright",
          "video_info",
          "addit_info",
          "ctime",
          "ptime",
        ],
        additionalProperties: false,
      },
      minItems: 0,
      maxItems: 20,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const VIDEO_CATEGORIES_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "视频分区数组",
      items: {
        type: "object",
        properties: {
          id: { type: "integer", description: "分区ID" },
          parent: { type: "integer", description: "父分区ID" },
          name: { type: "string", description: "分区名称" },
          desc: { type: "string", description: "分区描述" },
        },
        additionalProperties: false,
      },
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const UPLOAD_PREPROCESS_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "上传预处理结果",
      items: {
        type: "object",
        properties: {
          upload_token: {
            type: "string",
            description: "上传令牌，用于后续文件上传和稿件提交",
          },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const UPLOAD_VIDEO_CHUNK_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "视频分片上传结果",
      items: {
        type: "object",
        properties: {
          success: { type: "boolean", description: "上传是否成功" },
          message: { type: "string", description: "上传结果信息" },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const COMPLETE_VIDEO_UPLOAD_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "视频分片合片结果",
      items: {
        type: "object",
        properties: {
          success: { type: "boolean", description: "合片是否成功" },
          message: { type: "string", description: "合片结果信息" },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const UPLOAD_COVER_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "封面上传结果",
      items: {
        type: "object",
        properties: {
          url: { type: "string", description: "封面URL地址" },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const SUBMIT_ARCHIVE_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      description: "稿件提交结果",
      items: {
        type: "object",
        properties: {
          resource_id: { type: "string", description: "稿件资源ID(BV号)" },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean", description: "请求状态标识" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const WEB_AUTHORIZE_LINK_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          state: { type: "string", description: "授权流程唯一标识" },
          authorize_url: { type: "string", description: "B站网页授权链接" },
          tips: { type: "string", description: "提示信息" },
        },
        required: ["state", "authorize_url", "tips"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const WEB_POLL_AND_TOKEN_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          access_token: { type: "string", description: "access_token" },
          refresh_token: { type: "string", description: "refresh_token" },
          expires_in: { type: "integer", description: "过期时间戳" },
        },
        required: ["access_token", "refresh_token", "expires_in"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const CHECK_LOCAL_TOKEN_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hasValidToken: { type: "boolean", description: "是否有有效的token" },
          access_token: {
            type: "string",
            description: "access_token（如果有效）",
          },
          refresh_token: {
            type: "string",
            description: "refresh_token（如果有效）",
          },
          expires_at: {
            type: "integer",
            description: "过期时间戳（如果有效）",
          },
          message: { type: "string", description: "状态消息" },
        },
        required: ["hasValidToken", "message"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 1,
    },
    isError: { type: "boolean" },
  },
  required: ["content", "isError"],
  additionalProperties: false,
};

const BILIBILI_WEB_AUTHORIZE_LINK_TOOL: Tool = {
  name: "bilibili_web_authorize_link",
  description:
    `生成B站网页授权链接，自动打开浏览器进行扫码授权。授权时请确保勾选以下权限：
📱 基础信息 - 获得您的公开信息（头像、昵称、openid），以授权绑定第三方应用
📊 投稿效果管理 - 获取您的用户数据（关注数、粉丝数、投稿数），以进行投稿效果管理  
🎬 UP主视频稿件管理 - 获得您授权的视频稿件管理能力，以帮助您编辑、发布、删除视频稿件
📈 视频稿件数据管理 - 获取您发布的视频稿件数据（标题、发布时间、播放数、点赞数、评论数、硬币数、充电数、收藏数、弹幕数、分享数），以进行视频稿件数据管理与分析

授权完成后请调用 bilibili_web_poll_and_token 获取访问令牌。`,
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  outputSchema: WEB_AUTHORIZE_LINK_OUTPUT_SCHEMA,
};

const BILIBILI_WEB_POLL_AND_TOKEN_TOOL: Tool = {
  name: "bilibili_web_poll_and_token",
  description: "轮询获取code并自动换取access_token，需传state。",
  inputSchema: {
    type: "object",
    properties: {
      state: { type: "string", description: "授权时生成的state" },
    },
    required: ["state"],
  },
  outputSchema: WEB_POLL_AND_TOKEN_OUTPUT_SCHEMA,
};

const BILIBILI_GET_USER_INFO_TOOL: Tool = {
  name: "bilibili_get_user_info",
  description:
    `获取B站用户信息。\n返回字段：\n- name: 用户昵称\n- face: 用户头像\n- openid: 用户openid`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
    },
    required: ["access_token"],
  },
  outputSchema: USER_INFO_OUTPUT_SCHEMA,
};

const BILIBILI_GET_VIDEO_LIST_TOOL: Tool = {
  name: "bilibili_get_video_list",
  description:
    `获取B站已投稿视频列表。\n返回字段：\n- resource_id: 稿件ID\n- title: 稿件标题\n- cover: 封面地址\n- tid: 分区id\n- no_reprint: 是否禁止转载\n- desc: 视频描述\n- tag: 标签\n- copyright: 1-原创，2-转载\n- video_info: 视频信息\n- addit_info: 审核信息\n- ctime: 创建时间\n- ptime: 发布时间`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
    },
    required: ["access_token"],
  },
  outputSchema: VIDEO_LIST_OUTPUT_SCHEMA,
};

const BILIBILI_GET_USER_STAT_TOOL: Tool = {
  name: "bilibili_get_user_stat",
  description:
    `获取B站用户维度数据，包括关注数、粉丝数、投稿数等。\n返回字段：\n- following: 关注数\n- follower: 粉丝数\n- arc_passed_total: 视频稿件投稿数（审核通过）`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
    },
    required: ["access_token"],
  },
  outputSchema: USER_STAT_OUTPUT_SCHEMA,
};

const BILIBILI_CHECK_LOCAL_TOKEN_TOOL: Tool = {
  name: "bilibili_check_local_token",
  description:
    "优先调用该方法检查access_token，检查本地是否有有效的B站access_token缓存。如果有有效token则直接返回，避免重新授权。token缓存在用户主目录的.bilibili_mcp_token.json文件中。",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  outputSchema: CHECK_LOCAL_TOKEN_OUTPUT_SCHEMA,
};

const BILIBILI_GET_VIDEO_CATEGORIES_TOOL: Tool = {
  name: "bilibili_get_video_categories",
  description:
    `获取B站视频分区列表。用于投稿时选择合适的分区。\n返回字段：\n- id: 分区ID\n- parent: 父分区ID\n- name: 分区名称\n- desc: 分区描述`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
    },
    required: ["access_token"],
  },
  outputSchema: VIDEO_CATEGORIES_OUTPUT_SCHEMA,
};

const BILIBILI_UPLOAD_VIDEO_PREPROCESS_TOOL: Tool = {
  name: "bilibili_upload_video_preprocess",
  description:
    `视频上传预处理，获取上传令牌。在上传视频文件前必须先调用此接口。\n返回字段：\n- upload_token: 上传令牌，用于后续文件上传和稿件提交`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
      filename: { type: "string", description: "视频文件名" },
    },
    required: ["access_token", "filename"],
  },
  outputSchema: UPLOAD_PREPROCESS_OUTPUT_SCHEMA,
};

const BILIBILI_UPLOAD_VIDEO_CHUNK_TOOL: Tool = {
  name: "bilibili_upload_video_chunk",
  description:
    `上传视频文件分片。在获取upload_token后，需要调用此接口上传视频文件。\n返回字段：\n- success: 上传是否成功\n- message: 上传结果信息`,
  inputSchema: {
    type: "object",
    properties: {
      upload_token: {
        type: "string",
        description: "视频上传令牌（从预处理接口获取）",
      },
      video_file_path: {
        type: "string",
        description: "本地视频文件路径，如: /path/to/video.mp4",
      },
      part_number: {
        type: "integer",
        description: "分片编号，默认为1",
        "default": 1,
      },
    },
    required: ["upload_token", "video_file_path"],
  },
  outputSchema: UPLOAD_VIDEO_CHUNK_OUTPUT_SCHEMA,
};

const BILIBILI_COMPLETE_VIDEO_UPLOAD_TOOL: Tool = {
  name: "bilibili_complete_video_upload",
  description:
    `完成视频分片合并。在所有视频分片上传完成后，调用此接口通知服务器将分片合并成完整视频文件。\n返回字段：\n- success: 合片是否成功\n- message: 合片结果信息`,
  inputSchema: {
    type: "object",
    properties: {
      upload_token: {
        type: "string",
        description: "视频上传令牌（从预处理接口获取）",
      },
    },
    required: ["upload_token"],
  },
  outputSchema: COMPLETE_VIDEO_UPLOAD_OUTPUT_SCHEMA,
};

const BILIBILI_UPLOAD_COVER_TOOL: Tool = {
  name: "bilibili_upload_cover",
  description:
    `上传视频封面图片。支持JPEG、PNG等格式。\n返回字段：\n- url: 封面图片URL地址`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
      cover_file_path: {
        type: "string",
        description: "本地图片文件路径，如: /path/to/cover.jpg",
      },
    },
    required: ["access_token", "cover_file_path"],
  },
  outputSchema: UPLOAD_COVER_OUTPUT_SCHEMA,
};

const BILIBILI_SUBMIT_ARCHIVE_TOOL: Tool = {
  name: "bilibili_submit_archive",
  description:
    `提交视频稿件投稿。完成视频上传、合片和封面上传后，调用此接口提交稿件。\n返回字段：\n- resource_id: 稿件资源ID(BV号)`,
  inputSchema: {
    type: "object",
    properties: {
      access_token: { type: "string", description: "Access-Token" },
      upload_token: {
        type: "string",
        description: "视频上传令牌（从预处理接口获取，完成上传和合片后使用）",
      },
      title: { type: "string", description: "视频标题，长度小于80" },
      desc: { type: "string", description: "视频描述，长度小于250（可选）" },
      cover: { type: "string", description: "封面图片URL（可选，建议提供）" },
      tag: {
        type: "string",
        description: "视频标签，多个标签用英文逗号分隔，总长度小于200",
      },
      tid: {
        type: "integer",
        description: "分区ID，可通过bilibili_get_video_categories获取",
      },
      copyright: {
        type: "integer",
        description: "版权类型：1-原创，2-转载",
        "default": 1,
      },
      no_reprint: {
        type: "integer",
        description: "是否禁止转载：0-允许转载，1-禁止转载",
        "default": 0,
      },
      source: { type: "string", description: "转载来源（copyright为2时必填）" },
    },
    required: ["access_token", "upload_token", "title", "tag", "tid"],
  },
  outputSchema: SUBMIT_ARCHIVE_OUTPUT_SCHEMA,
};

const BILIBILI_TOOLS = [
  BILIBILI_CHECK_LOCAL_TOKEN_TOOL,
  BILIBILI_WEB_AUTHORIZE_LINK_TOOL,
  BILIBILI_WEB_POLL_AND_TOKEN_TOOL,
  BILIBILI_GET_USER_INFO_TOOL,
  BILIBILI_GET_VIDEO_LIST_TOOL,
  BILIBILI_GET_USER_STAT_TOOL,
  BILIBILI_GET_VIDEO_CATEGORIES_TOOL,
  BILIBILI_UPLOAD_VIDEO_PREPROCESS_TOOL,
  BILIBILI_UPLOAD_VIDEO_CHUNK_TOOL,
  BILIBILI_COMPLETE_VIDEO_UPLOAD_TOOL,
  BILIBILI_UPLOAD_COVER_TOOL,
  BILIBILI_SUBMIT_ARCHIVE_TOOL,
] as const;

const server = new Server(
  {
    name: "mcp-bilibili",
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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: BILIBILI_TOOLS,
  };
});

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "bilibili_check_local_token":
          return checkLocalToken();
        case "bilibili_web_authorize_link":
          const result = generateBilibiliWebAuthorizeLink();
          // 自动打开浏览器
          const { authorize_url } = result.structuredContent.content[0];
          await import("./oauth.js").then((mod) =>
            mod.openBrowser(authorize_url)
          );
          // 返回内容中说明已自动打开浏览器
          result.structuredContent.content[0].tips =
            "已自动在本地浏览器打开授权链接，请扫码授权。⚠️重要：请务必勾选所有权限项目（基础信息、投稿效果管理、UP主视频稿件管理、视频稿件数据管理），否则部分功能将无法使用。";
          result.content[0].text = JSON.stringify(
            result.structuredContent,
            null,
            2,
          );
          return result;
        case "bilibili_web_poll_and_token":
          if (!args || typeof args.state !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "state参数缺失或类型错误",
            );
          }
          return await pollCodeAndGetToken({ state: args.state });
        case "bilibili_get_user_info":
          if (!args || typeof args.access_token !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "access_token参数缺失或类型错误",
            );
          }
          return await getUserInfo(args as { access_token: string });
        case "bilibili_get_video_list":
          if (!args || typeof args.access_token !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "access_token参数缺失或类型错误",
            );
          }
          return await getVideoList(args as { access_token: string });
        case "bilibili_get_user_stat":
          if (!args || typeof args.access_token !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "access_token参数缺失或类型错误",
            );
          }
          return await getUserStat(args as { access_token: string });
        case "bilibili_get_video_categories":
          if (!args || typeof args.access_token !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "access_token参数缺失或类型错误",
            );
          }
          return await getVideoCategories(args as { access_token: string });
        case "bilibili_upload_video_preprocess":
          if (
            !args || typeof args.access_token !== "string" ||
            typeof args.filename !== "string"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "参数缺失或类型错误：需要access_token(string)、filename(string)",
            );
          }
          return await uploadVideoPreprocess(
            args as { access_token: string; filename: string },
          );
        case "bilibili_upload_video_chunk":
          if (
            !args || typeof args.upload_token !== "string" ||
            typeof args.video_file_path !== "string"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "参数缺失或类型错误：需要upload_token(string)、video_file_path(string)",
            );
          }
          return await uploadVideoChunk(
            args as {
              upload_token: string;
              video_file_path: string;
              part_number?: number;
            },
          );
        case "bilibili_complete_video_upload":
          if (!args || typeof args.upload_token !== "string") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "参数缺失或类型错误：需要upload_token(string)",
            );
          }
          return await completeVideoUpload(args as { upload_token: string });
        case "bilibili_upload_cover":
          if (
            !args || typeof args.access_token !== "string" ||
            typeof args.cover_file_path !== "string"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "参数缺失或类型错误：需要access_token(string)、cover_file_path(string)",
            );
          }
          return await uploadCover(
            args as { access_token: string; cover_file_path: string },
          );
        case "bilibili_submit_archive":
          if (
            !args || typeof args.access_token !== "string" ||
            typeof args.upload_token !== "string" ||
            typeof args.title !== "string" || typeof args.tag !== "string" ||
            typeof args.tid !== "number"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "参数缺失或类型错误：需要access_token、upload_token、title、tag、tid",
            );
          }
          return await submitArchive(
            args as {
              access_token: string;
              upload_token: string;
              title: string;
              desc?: string;
              cover?: string;
              tag: string;
              tid: number;
              copyright?: number;
              no_reprint?: number;
              source?: string;
            },
          );
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`,
          );
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new McpError(
        ErrorCode.InternalError,
        `执行工具 ${name} 时发生错误: ${errorMessage}`,
      );
    }
  },
);

async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("BiliBili MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

runServer().catch(console.error);
