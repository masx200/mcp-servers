# MCP 服务：手机号码归属地查询 (mcp-phone-location)

**版本 (Version):** 0.1.0

## 描述 (Description)

`mcp-phone-location`
服务提供根据手机号码查询其归属地信息的功能，包括省份、城市和运营商。

## 可用工具 (Available Tools)

该服务提供以下工具：

### 1. `query_phone_location`

- **描述 (Description):** 根据手机号码查询其归属地信息（省份、城市、运营商）。
- **输入参数 (Input Parameters):**
  - `phone_number` (string, 必需): 需要查询的11位手机号码。
- **输出结构 (Output Structure):** 返回一个对象，其中包含查询结果。
  ```json
  {
    "content": [
      {
        "type": "phoneLocationInfo",
        "province": "河北",
        "city": "保定",
        "carrier": "移动"
      }
    ],
    "isError": false,
    "errorMessage": ""
  }
  ```
  - `content`: 数组。如果查询成功，包含一个 `phoneLocationInfo`
    对象；如果查询失败或号码无效，则可能为空数组或包含错误提示对象（具体视实现而定）。
    - `type` (string): 固定为 `"phoneLocationInfo"` (成功时)。
    - `province` (string): 号码归属的省份 (例如："河北")。
    - `city` (string): 号码归属的城市 (例如："保定")。
    - `carrier` (string): 号码所属的运营商 (例如："移动", "联通", "电信")。
  - `isError`: 布尔值。`false` 表示请求成功且获取到有效数据，`true`
    表示请求过程中发生错误、号码无效或未查询到信息。
  - `errorMessage`: 字符串。如果 `isError` 为
    `true`，此字段可能包含具体的错误信息；如果请求成功，则为空字符串。

## 注意事项 (Notes)

- 接口返回的数据中，省份、城市、运营商信息会经过 Unicode 解码处理。
- 请确保提供的手机号码格式正确。
