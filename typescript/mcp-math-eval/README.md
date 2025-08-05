# 数学表达式计算 MCP 服务器

基于 mathjs 的数学表达式计算 MCP 服务器，支持各种数学运算、数值积分和符号微分。

## 功能特性

- 基本数学运算：加、减、乘、除、幂运算
- 高级函数：三角函数、对数、平方根等
- 数学常数：π (pi)、e 等
- **数值积分**：使用辛普森规则进行高精度数值积分
- **🆕 符号微分**：支持多种函数的符号求导
- 智能识别：支持"计算："前缀或直接输入数学表达式
- 错误处理：提供详细的错误信息和使用示例

## 安装

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

## 环境变量配置

支持通过环境变量配置服务器参数：

- `HTTP_API_TOKEN`:
  可选的API令牌，用于HTTP身份验证。如果设置，客户端请求需要在Authorization头中包含`Bearer <token>`
- `HTTP_API_PORT`: HTTP服务器端口，默认为3000

示例：

```bash
# 设置API令牌和端口
export HTTP_API_TOKEN=your-secret-token
export HTTP_API_PORT=8080
node ./dist/streamable-http.js
```

## 使用示例

### 支持的表达式格式

1. **基本运算**
   - `2 + 3 * 4` → 14
   - `(342-342*3/2)^2` → 92313

2. **三角函数**
   - `sin(pi/4)` → 0.7071067811865476
   - `cos(0)` → 1

3. **对数和幂运算**
   - `log(100)` → 2
   - `sqrt(16)` → 4
   - `2^10` → 1024

4. **复杂表达式**
   - `(sin(pi/6) + cos(pi/3)) * 2` → 2
   - `log(e^3)` → 3

5. **数值积分**
   - `integrate("2*x", "x", 0, 5)` → 25
   - `integrate("sin(x)", "x", 0, pi)` → 2
   - `integrate("x^2", "x", 0, 2)` → 2.667
   - `integrate("1/(1+x^2)", "x", 0, 1)` → 0.785 (π/4)

6. **🆕 符号微分**
   - `derivative("x^3 + 2*x", "x")` → 3 * x^2 + 2
   - `derivative("sin(x)", "x")` → cos(x)
   - `derivative("e^x", "x")` → e^x
   - `derivative("x^2 * sin(x)", "x")` → 2 * x * sin(x) + x^2 * cos(x)

## MCP 工具说明

### `calculate_math_expression`

计算数学表达式并返回结果，包括数值积分和符号微分。

**参数：**

- `expression` (string): 要计算的数学表达式

**使用方式：**

- 普通计算：`"(342-342*3/2)^2"`
- 积分计算：`"integrate(\"2*x\", \"x\", 0, 5)"`
- 导数计算：`"derivative(\"x^3 + 2*x\", \"x\")"`
- 带前缀：`"计算：derivative(\"sin(x)\", \"x\")"`

## 导数功能详解

### 导数语法

```
derivative("被求导函数", "求导变量")
```

### 导数示例

- **多项式求导**：`derivative("x^3 + 2*x", "x")`
  - 计算 d/dx(x³ + 2x) = 3x² + 2
- **三角函数求导**：`derivative("sin(x)", "x")`
  - 计算 d/dx(sin(x)) = cos(x)
- **指数函数求导**：`derivative("e^x", "x")`
  - 计算 d/dx(eˣ) = eˣ
- **乘积法则**：`derivative("x^2 * sin(x)", "x")`
  - 计算 d/dx(x²·sin(x)) = 2x·sin(x) + x²·cos(x)

### 支持的导数函数

- **多项式**: `x^n`, `ax^n + bx^m + c`
- **三角函数**: `sin(x)`, `cos(x)`, `tan(x)`
- **指数函数**: `e^x`, `a^x`
- **对数函数**: `log(x)` (自然对数)
- **复合函数**: 支持链式法则和乘积法则
- **常数**: 常数的导数为0

## 积分功能详解

### 积分语法

```
integrate("被积函数", "积分变量", 下限, 上限)
```

### 积分示例

- **多项式积分**：`integrate("x^2", "x", 0, 3)`
  - 计算 ∫₀³ x² dx = 9
- **三角函数积分**：`integrate("sin(x)", "x", 0, pi)`
  - 计算 ∫₀π sin(x) dx = 2
- **指数函数积分**：`integrate("e^x", "x", 0, 1)`
  - 计算 ∫₀¹ eˣ dx ≈ 1.718
- **复合函数积分**：`integrate("x*sin(x)", "x", 0, pi)`
  - 计算 ∫₀π x·sin(x) dx ≈ 3.14

### 积分精度

- 使用辛普森规则进行数值积分
- 默认分割数：1000（自动调整为偶数）
- 精度：约10⁻¹²到10⁻¹⁵
- 适合连续函数的积分计算

## 支持的数学函数

- **基本运算**: `+`, `-`, `*`, `/`, `^`
- **三角函数**: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`
- **对数函数**: `log` (自然对数), `log10`
- **其他函数**: `sqrt`, `abs`, `ceil`, `floor`, `round`
- **常数**: `pi`, `e`
- **积分**: `integrate("函数", "变量", 下限, 上限)`
- **🆕 导数**: `derivative("函数", "变量")`

## 开发

```bash
# 开发模式运行
npm run dev

# 构建
npm run build

# 启动
npm start

# 测试积分功能
npx tsx test-integration.js

# 测试导数功能
npx tsx test-derivative.js
```

## Streamable HTTP协议支持

本服务器支持MCP Streamable HTTP协议，提供现代化的HTTP传输方式：

### 协议特点

- **无状态连接**：基于HTTP请求，无需持久连接
- **会话管理**：支持会话ID重用和优雅关闭
- **身份验证**：可选的Bearer Token认证
- **SSE支持**：支持服务器推送事件(Server-Sent Events)

### 端点配置

- **MCP端点**：`http://localhost:3000/mcp`
- **HTTP方法**：支持POST、GET、DELETE
- **认证头**：`Authorization: Bearer <token>`（如果设置了HTTP_API_TOKEN）

### 使用示例

#### MCP客户端配置

**标准配置（stdio模式）**：

```json
{
  "mcpServers": {
    "math-eval": {
      "command": "node",
      "args": ["path/to/mcp-math-eval/dist/index.js"]
    }
  }
}
```

**HTTP模式配置（支持streamable-http）**：

```json
{
  "mcpServers": {
    "math-eval": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-token"
      }
    }
  }
}
```

## 性能测试结果

### 积分测试结果

| 积分表达式    | 数值结果 | 理论值 | 误差   | 精度等级  |
| ------------- | -------- | ------ | ------ | --------- |
| ∫₀⁵ 2x dx     | 25.000   | 25     | ~10⁻¹⁵ | ✅ 高精度 |
| ∫₀² x² dx     | 2.667    | 8/3    | ~10⁻¹⁵ | ✅ 高精度 |
| ∫₀π sin(x) dx | 2.000    | 2      | ~10⁻¹² | ✅ 高精度 |
| ∫₀¹⁰ 1 dx     | 10.000   | 10     | 0      | ✅ 高精度 |

### 导数测试结果

| 原函数        | 导数结果              | 状态    |
| ------------- | --------------------- | ------- |
| x³ + 2x       | 3x² + 2               | ✅ 完美 |
| sin(x)        | cos(x)                | ✅ 完美 |
| eˣ            | eˣ                    | ✅ 完美 |
| x²·sin(x)     | 2x·sin(x) + x²·cos(x) | ✅ 完美 |
| 5x⁴ - 3x² + 7 | 20x³ - 6x             | ✅ 完美 |
