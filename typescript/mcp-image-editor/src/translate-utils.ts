import fetch from "node-fetch";
import pkg from "crypto-js";
const { MD5 } = pkg;

const API_ENDPOINT = "http://api.fanyi.baidu.com/api/trans/vip/translate";

function getBaiduApiCredentials() {
  // 环境变量检查已在index.ts中进行，这里直接使用
  const appId = process.env.BAIDU_TRANSLATE_APP_ID!;
  const appKey = process.env.BAIDU_TRANSLATE_APP_KEY!;

  return { appId, appKey };
}

function generateSign(
  text: string,
  salt: number,
  appKey: string,
  appId: string,
): string {
  const str = appId + text + salt + appKey;
  return MD5(str).toString();
}

export async function translateChineseToEnglish(text: string): Promise<string> {
  try {
    console.error(`[百度翻译] 开始调用API，文本: "${text}"`);
    const { appId, appKey } = getBaiduApiCredentials();
    const salt = Math.floor(Math.random() * 10000000);
    const sign = generateSign(text, salt, appKey, appId);

    const params = new URLSearchParams({
      q: text,
      from: "zh",
      to: "en",
      appid: appId,
      salt: salt.toString(),
      sign: sign,
    });

    const url = `${API_ENDPOINT}?${params.toString()}`;
    console.error(`[百度翻译] 请求URL: ${url}`);

    const response = await fetch(url);
    console.error(`[百度翻译] 响应状态: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json() as any;
    console.error(`[百度翻译] 响应数据:`, JSON.stringify(data));

    if ("error_code" in data) {
      if (data.error_code === "58000") {
        console.error("[百度翻译] IP白名单限制，跳过翻译");
        return text; // IP限制时直接返回原文
      }
      throw new Error(
        `Translation API error: ${data.error_code} - ${data.error_msg}`,
      );
    }

    const result = data.trans_result.map((item: any) => item.dst).join("\n");
    console.error(`[百度翻译] 翻译成功: "${result}"`);
    return result;
  } catch (error) {
    console.error("[百度翻译] 翻译错误:", error);
    return text; // 翻译失败时返回原文
  }
}

export async function translatePromptToEnglish(
  prompt: string,
): Promise<string> {
  console.error(`[翻译] 开始翻译: "${prompt}"`);

  if (!prompt || prompt.trim() === "") {
    console.error(`[翻译] 空prompt，直接返回`);
    return prompt;
  }

  // 检查是否包含中文字符
  const chineseRegex = /[\u4e00-\u9fff]/;
  const hasChinese = chineseRegex.test(prompt);
  console.error(`[翻译] 检测中文字符: ${hasChinese}`);

  if (!hasChinese) {
    console.error(`[翻译] 无中文字符，直接返回原文`);
    return prompt; // 没有中文直接返回
  }

  console.error(`[翻译] 调用百度翻译API`);
  const result = await translateChineseToEnglish(prompt);
  console.error(`[翻译] 翻译结果: "${result}"`);
  return result;
}
