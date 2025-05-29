# MCP 服务：百度翻译API (mcp-baidu-translate)

**版本 (Version):** 1.0.0

## 描述 (Description)

`mcp-baidu-translate` 服务提供基于百度翻译API的文本翻译功能，支持多种语言之间的相互翻译。

## 环境变量配置

使用本服务前，需要先设置以下环境变量：

```bash
# 设置百度翻译API的APP ID
export BAIDU_TRANSLATE_APP_ID="您的百度翻译APP ID"

# 设置百度翻译API的密钥
export BAIDU_TRANSLATE_APP_KEY="您的百度翻译APP KEY"
```

您可以在[百度翻译开放平台](http://api.fanyi.baidu.com)申请获取APP ID和密钥。

## 可用工具 (Available Tools)

该服务提供以下工具：

### 1. `translate_text`

*   **描述 (Description):**
    使用百度翻译API翻译文本内容。
*   **输入参数 (Input Parameters):**
    *   `text` (string, 必需): 需要翻译的文本内容。
    *   `from_lang` (string, 可选): 源语言代码，例如：'en'表示英语，'zh'表示中文。如果不提供，系统会自动检测。
    *   `to_lang` (string, 必需): 目标语言代码，例如：'zh'表示中文，'en'表示英语。
*   **输出结构 (Output Structure):**
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "翻译后的文本内容"
        }
      ],
      "detected_language": "检测到的源语言（当源语言未指定时）",
      "isError": false,
      "errorMessage": ""
    }
    ```
    *   `content`: 翻译结果数组。如果翻译成功，包含一个文本对象；如果失败，则为空数组。
    *   `detected_language`: 如果未指定源语言，此字段会显示API检测到的源语言。
    *   `isError`: 布尔值。`false` 表示翻译成功，`true` 表示发生错误。
    *   `errorMessage`: 字符串。如果 `isError` 为 `true`，此字段包含具体的错误信息；如果成功，则为空字符串。

### 2. `get_supported_languages`

*   **描述 (Description):**
    获取百度翻译API支持的所有语言列表。
*   **输入参数 (Input Parameters):**
    无需任何参数。
*   **输出结构 (Output Structure):**
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "zh: 中文\nen: 英语\n... (其他语言)"
        }
      ],
      "isError": false,
      "errorMessage": ""
    }
    ```
    *   `content`: 包含语言列表的文本数组。每行显示一种语言的代码和名称。
    *   `isError`: 布尔值。`false` 表示请求成功，`true` 表示发生错误。
    *   `errorMessage`: 字符串。如果 `isError` 为 `true`，此字段包含具体的错误信息；如果成功，则为空字符串。

## 语言代码参考

以下是部分常用语言代码：
- `zh`: 中文（简体）
- `en`: 英语
- `jp`: 日语
- `kor`: 韩语
- `fra`: 法语
- `spa`: 西班牙语
- `ru`: 俄语
- `de`: 德语
- 更多语言代码请使用 `get_supported_languages` 工具查询。

## 使用示例

翻译英文到中文：
```json
{
  "text": "Hello World! This is 1st paragraph.\nThis is 2nd paragraph.",
  "from_lang": "en", 
  "to_lang": "zh"
}
```

自动检测语言并翻译为英文：
```json
{
  "text": "你好世界！",
  "to_lang": "en"
}
```

## 注意事项

- 该服务基于百度翻译API，请确保网络环境能够正常访问百度API服务。
- API可能有每日调用限额，请合理使用。 