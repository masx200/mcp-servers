import fetch from "node-fetch";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";
import fs from "fs";
import FormData from "form-data";
import { CLIENT_ID, CLIENT_SECRET } from "./oauth.js";

// 生成MD5
function md5(content: string) {
  console.error("=== MD5计算 ===");
  console.error("输入内容长度:", content.length);
  console.error("输入内容前100字符:", content.substring(0, 100));
  const hash = crypto.createHash("md5").update(content).digest("hex");
  console.error("MD5结果:", hash);
  return hash;
}
// 生成随机字符串
function randomString(length: number) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(
    0,
    length,
  );
}
// 生成签名
function getSignature({
  contentMd5,
  timestamp,
  nonce,
  accessKeyId,
  signatureVersion,
  signatureMethod,
  appSecret,
}: {
  contentMd5: string;
  timestamp: string;
  nonce: string;
  accessKeyId: string;
  signatureVersion: string;
  signatureMethod: string;
  appSecret: string;
}) {
  console.error("=== 开始生成签名 ===");
  console.error("签名参数:");
  console.error("  contentMd5:", contentMd5);
  console.error("  timestamp:", timestamp);
  console.error("  nonce:", nonce);
  console.error("  accessKeyId:", accessKeyId);
  console.error("  signatureVersion:", signatureVersion);
  console.error("  signatureMethod:", signatureMethod);
  console.error("  appSecret长度:", appSecret.length);

  const signHeaders: Record<string, string> = {
    "x-bili-accesskeyid": accessKeyId,
    "x-bili-content-md5": contentMd5,
    "x-bili-signature-method": signatureMethod,
    "x-bili-signature-nonce": nonce,
    "x-bili-signature-version": signatureVersion,
    "x-bili-timestamp": timestamp,
  };
  console.error("签名头部字典:", JSON.stringify(signHeaders, null, 2));

  const keys = Object.keys(signHeaders).sort();
  console.error("排序后的键:", keys);

  const signStr = keys.map((k) => `${k}:${signHeaders[k]}`).join("\n");
  console.error("待签名字符串:");
  console.error(signStr);
  console.error("待签名字符串长度:", signStr.length);

  const signature = crypto.createHmac("sha256", appSecret).update(signStr)
    .digest("hex");
  console.error("生成的最终签名:", signature);
  console.error("=== 签名生成完成 ===");

  return signature;
}

// 分区信息接口
export async function getVideoCategories(
  { access_token }: { access_token: string },
) {
  const urlPath = "/arcopen/fn/archive/type/list";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}`;
  const method = "GET";
  const contentMd5 = md5("");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });

  const headers = {
    "Accept": "application/json",
    "Access-Token": access_token,
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": "application/json",
    "Host": host,
    "Connection": "keep-alive",
  };

  const res = await fetch(url, { method, headers });
  const text = await res.text();

  if (!res.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      `B站分区列表接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new McpError(
      ErrorCode.InternalError,
      "B站分区列表接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    throw new McpError(
      ErrorCode.InternalError,
      data.message || "获取分区列表失败",
    );
  }

  // 过滤数据，只保留schema中定义的字段
  const filteredCategories = Array.isArray(data.data)
    ? data.data.map((item: any) => ({
      id: item.id,
      parent: item.parent,
      name: item.name,
      desc: item.desc || item.description || "", // 有些API可能用description字段
    }))
    : [];

  const result = {
    content: filteredCategories,
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 文件上传预处理
export async function uploadVideoPreprocess({
  access_token,
  filename,
}: {
  access_token: string;
  filename: string;
}) {
  console.error("=== 开始视频预处理 ===");
  console.error("文件名:", filename);
  console.error("access_token:", access_token);

  const urlPath = "/arcopen/fn/archive/video/init";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}`;
  const method = "POST";

  const body = JSON.stringify({
    name: filename,
    utype: "0",
  });
  console.error("请求体:", body);

  const contentMd5 = md5(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });

  const headers = {
    "Accept": "application/json",
    "Access-Token": access_token,
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": "application/json",
    "Host": host,
    "Connection": "keep-alive",
  };

  console.error("预处理请求头部:", JSON.stringify(headers, null, 2));

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const text = await res.text();
  console.error("预处理响应状态:", res.status);
  console.error("预处理响应内容:", text);

  if (!res.ok) {
    console.error("预处理请求失败，状态码:", res.status);
    throw new McpError(
      ErrorCode.InternalError,
      `B站视频预处理接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
    console.error("预处理解析的数据:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("预处理JSON解析失败:", e);
    throw new McpError(
      ErrorCode.InternalError,
      "B站视频预处理接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    console.error("预处理API错误:", data.code, data.message);
    throw new McpError(
      ErrorCode.InternalError,
      data.message || "视频预处理失败",
    );
  }

  console.error("=== 视频预处理成功 ===");
  const result = {
    content: [data.data],
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 上传封面
export async function uploadCover({
  access_token,
  cover_file_path,
}: {
  access_token: string;
  cover_file_path: string; // 本地图片文件路径
}) {
  console.error("=== 开始上传封面 ===");
  console.error("封面文件路径:", cover_file_path);
  console.error("access_token:", access_token);

  const urlPath = "/arcopen/fn/archive/cover/upload";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}`;
  const method = "POST";

  // 读取文件内容
  const fileBuffer = fs.readFileSync(cover_file_path);
  console.error("文件读取成功，文件大小:", fileBuffer.length, "bytes");

  const filename = cover_file_path.split("/").pop() || "cover.jpg";
  console.error("提取的文件名:", filename);

  // 使用form-data库构建multipart/form-data
  const formData = new FormData();
  formData.append("file", fileBuffer, {
    filename: filename,
    contentType: "image/jpeg",
  });

  // 获取form-data的完整Buffer
  const formDataBuffer = formData.getBuffer();
  console.error("FormData总长度:", formDataBuffer.length);

  // 计算文件内容的MD5和FormData整体的MD5进行对比
  const fileContentMd5 = crypto.createHash("md5").update(fileBuffer).digest(
    "hex",
  );
  console.error("文件内容MD5值:", fileContentMd5);

  // 计算整个form-data body的MD5
  const formDataMd5 = crypto.createHash("md5").update(formDataBuffer).digest(
    "hex",
  );
  console.error("FormData的MD5值:", formDataMd5);

  // 根据B站API文档，现在使用FormData整体的MD5
  // 但是根据文档说明"将body的请求体内容（除文件外）当作字符串进行MD5编码"
  // 我们尝试几种不同的MD5计算方式

  // 方法1：FormData整体的MD5（刚才尝试过，失败了）
  console.error("FormData的MD5值:", formDataMd5);

  // 方法2：只计算multipart header部分的MD5（不包含文件内容）
  const formDataStart =
    `--${formData.getBoundary()}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const formDataEnd = `\r\n--${formData.getBoundary()}--\r\n`;
  const headerOnlyContent = formDataStart + formDataEnd;
  const headerOnlyMd5 = crypto.createHash("md5").update(headerOnlyContent)
    .digest("hex");
  console.error("仅header部分MD5值:", headerOnlyMd5);

  // 方法3：空字符串MD5（GET请求或空body的处理方式）
  const emptyMd5 = crypto.createHash("md5").update("").digest("hex");
  console.error("空字符串MD5值:", emptyMd5);

  // 尝试使用空字符串的MD5，因为这可能是multipart/form-data的特殊处理方式
  const contentMd5 = emptyMd5; // 尝试空字符串的MD5
  console.error("本次使用的MD5值(空字符串):", contentMd5);

  // 输出FormData的前200字节和后50字节用于调试
  console.error(
    "FormData前200字节:",
    formDataBuffer.subarray(0, 200).toString("hex"),
  );
  console.error(
    "FormData后50字节:",
    formDataBuffer.subarray(-50).toString("hex"),
  );

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  console.error("时间戳:", timestamp);
  console.error("随机数:", nonce);

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });
  console.error("生成的签名:", signature);

  const headers = {
    "Accept": "application/json",
    "Access-Token": access_token,
    "access-token": access_token, // 也添加小写的access-token头，有些API需要
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": formData.getHeaders()["content-type"],
    "Host": host,
    "Connection": "keep-alive",
  };

  console.error("请求头部信息:", JSON.stringify(headers, null, 2));
  console.error("请求URL:", url);
  console.error("请求方法:", method);

  const res = await fetch(url, {
    method,
    headers,
    body: formDataBuffer,
  });

  const text = await res.text();
  console.error("响应状态码:", res.status);
  console.error("响应状态文本:", res.statusText);
  console.error("响应内容:", text);

  if (!res.ok) {
    console.error("请求失败，状态码:", res.status);
    throw new McpError(
      ErrorCode.InternalError,
      `B站封面上传接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
    console.error("解析的响应数据:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("JSON解析失败:", e);
    throw new McpError(
      ErrorCode.InternalError,
      "B站封面上传接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    console.error("API返回错误代码:", data.code, "错误信息:", data.message);
    throw new McpError(ErrorCode.InternalError, data.message || "封面上传失败");
  }

  console.error("=== 封面上传成功 ===");
  const result = {
    content: [data.data],
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 提交稿件
export async function submitArchive({
  access_token,
  upload_token,
  title,
  desc,
  cover,
  tag,
  tid,
  copyright = 1,
  no_reprint = 0,
  source,
}: {
  access_token: string;
  upload_token: string; // 单个upload_token，不是数组
  title: string;
  desc?: string;
  cover?: string;
  tag: string;
  tid: number;
  copyright?: number; // 1-原创，2-转载
  no_reprint?: number; // 0-允许转载，1-禁止转载
  source?: string; // 转载来源，copyright为2时必填
}) {
  console.error("=== 开始提交稿件 ===");
  console.error("upload_token:", upload_token);
  console.error("title:", title);
  console.error("tid:", tid);
  console.error("copyright:", copyright);

  const urlPath = "/arcopen/fn/archive/add-by-utoken";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}?upload_token=${upload_token}`;
  const method = "POST";

  // 构建请求体 - 根据官方文档格式
  const bodyData: any = {
    title,
    tag,
    tid,
    copyright,
  };

  // 可选字段
  if (desc) bodyData.desc = desc;
  if (cover) bodyData.cover = cover;
  if (no_reprint !== undefined) bodyData.no_reprint = no_reprint;
  if (source && copyright === 2) bodyData.source = source;

  const body = JSON.stringify(bodyData);
  console.error("请求体:", body);

  const contentMd5 = md5(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });

  const headers = {
    "Accept": "application/json",
    "Access-Token": access_token,
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": "application/json",
    "Host": host,
    "Connection": "keep-alive",
  };

  console.error("稿件提交请求头部:", JSON.stringify(headers, null, 2));
  console.error("稿件提交URL:", url);

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const text = await res.text();
  console.error("稿件提交响应状态:", res.status);
  console.error("稿件提交响应内容:", text);

  if (!res.ok) {
    console.error("稿件提交请求失败，状态码:", res.status);
    throw new McpError(
      ErrorCode.InternalError,
      `B站稿件提交接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
    console.error("稿件提交解析的数据:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("稿件提交JSON解析失败:", e);
    throw new McpError(
      ErrorCode.InternalError,
      "B站稿件提交接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    console.error("稿件提交API错误:", data.code, data.message);
    throw new McpError(ErrorCode.InternalError, data.message || "稿件提交失败");
  }

  console.error("=== 稿件提交成功 ===");
  const result = {
    content: [data.data],
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 获取已投稿视频列表（保持原有功能）
export async function getVideoList({ access_token }: { access_token: string }) {
  const urlPath = "/arcopen/fn/archive/viewlist?ps=20&pn=1&status=all";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}`;
  const method = "GET";
  const contentMd5 = md5("");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });

  const headers = {
    "Accept": "application/json",
    "Access-Token": access_token,
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": "application/json",
    "Host": host,
    "Connection": "keep-alive",
  };
  console.error("请求headers:", headers);
  console.error("请求url:", url);

  const res = await fetch(url, {
    method,
    headers,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      `B站视频列表接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }
  if (text.trim().startsWith("<")) {
    throw new McpError(
      ErrorCode.InternalError,
      "B站视频列表接口返回了HTML: " + text.slice(0, 100),
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new McpError(
      ErrorCode.InternalError,
      "B站视频列表接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    throw new McpError(
      ErrorCode.InternalError,
      data.message || "获取视频列表失败",
    );
  }
  const result = {
    content: Array.isArray(data.data.list)
      ? data.data.list.map((item: any) => ({
        resource_id: item.resource_id,
        title: item.title,
        cover: item.cover,
        tid: item.tid,
        no_reprint: item.no_reprint,
        desc: item.desc,
        tag: item.tag,
        copyright: item.copyright,
        video_info: item.video_info,
        addit_info: item.addit_info,
        ctime: item.ctime,
        ptime: item.ptime,
      }))
      : [],
    isError: false,
  };
  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 视频分片上传
export async function uploadVideoChunk({
  upload_token,
  video_file_path,
  part_number = 1,
}: {
  upload_token: string;
  video_file_path: string;
  part_number?: number;
}) {
  const url =
    `https://openupos.bilivideo.com/video/v2/part/upload?upload_token=${upload_token}&part_number=${part_number}`;

  // 读取视频文件
  const fileBuffer = fs.readFileSync(video_file_path);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: fileBuffer,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      `B站视频分片上传接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new McpError(
      ErrorCode.InternalError,
      "B站视频分片上传接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    throw new McpError(
      ErrorCode.InternalError,
      data.message || "视频分片上传失败",
    );
  }

  const result = {
    content: [{ success: true, message: "视频分片上传成功" }],
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// 视频分片合片
export async function completeVideoUpload({
  upload_token,
}: {
  upload_token: string;
}) {
  console.error("=== 开始视频分片合片 ===");
  console.error("upload_token:", upload_token);

  const urlPath = "/arcopen/fn/archive/video/complete";
  const host = "member.bilibili.com";
  const url = `https://${host}${urlPath}?upload_token=${upload_token}`;
  const method = "POST";

  // 空的JSON body
  const body = JSON.stringify({});
  console.error("请求体:", body);

  const contentMd5 = md5(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString(18);
  const signatureVersion = "2.0";
  const signatureMethod = "HMAC-SHA256";

  const signature = getSignature({
    contentMd5,
    timestamp,
    nonce,
    accessKeyId: CLIENT_ID,
    signatureVersion,
    signatureMethod,
    appSecret: CLIENT_SECRET,
  });

  const headers = {
    "Accept": "application/json",
    "Authorization": signature,
    "X-Bili-Accesskeyid": CLIENT_ID,
    "X-Bili-Content-Md5": contentMd5,
    "X-Bili-Signature-Method": signatureMethod,
    "X-Bili-Signature-Nonce": nonce,
    "X-Bili-Signature-Version": signatureVersion,
    "X-Bili-Timestamp": timestamp,
    "User-Agent": "Node.js",
    "Content-Type": "application/json",
    "Host": host,
    "Connection": "keep-alive",
  };

  console.error("合片请求头部:", JSON.stringify(headers, null, 2));

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const text = await res.text();
  console.error("合片响应状态:", res.status);
  console.error("合片响应内容:", text);

  if (!res.ok) {
    console.error("合片请求失败，状态码:", res.status);
    throw new McpError(
      ErrorCode.InternalError,
      `B站视频合片接口返回${res.status}: ${text.slice(0, 100)}`,
    );
  }

  let data;
  try {
    data = JSON.parse(text);
    console.error("合片解析的数据:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("合片JSON解析失败:", e);
    throw new McpError(
      ErrorCode.InternalError,
      "B站视频合片接口返回非JSON: " + text.slice(0, 100),
    );
  }

  if (data.code !== 0) {
    console.error("合片API错误:", data.code, data.message);
    throw new McpError(ErrorCode.InternalError, data.message || "视频合片失败");
  }

  console.error("=== 视频分片合片成功 ===");
  const result = {
    content: [{ success: true, message: "视频分片合片成功" }],
    isError: false,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
