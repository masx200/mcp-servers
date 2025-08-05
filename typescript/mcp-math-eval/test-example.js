#!/usr/bin/env node

/**
 * 数学表达式计算MCP服务器使用示例
 */

console.log("=== 数学表达式计算MCP服务器使用示例 ===\n");

// 模拟的测试表达式
const testExpressions = [
  "(342-342*3/2)^2",
  "计算：sin(pi/4)",
  "sqrt(16) + log(100)",
  "2^10",
  "cos(0) + sin(pi/2)",
  "log(e^3)",
  "abs(-42)",
  "ceil(3.14)",
  "floor(3.99)",
  "round(3.7)",
];

console.log("支持的数学表达式示例：\n");

testExpressions.forEach((expr, index) => {
  console.log(`${index + 1}. ${expr}`);
});

console.log("\n使用方法：");
console.log("1. 启动MCP服务器: npm start");
console.log("2. 在MCP客户端中调用 calculate_math_expression 工具");
console.log("3. 传入expression参数，可以是：");
console.log('   - "计算：(342-342*3/2)^2"');
console.log('   - 或直接输入 "(342-342*3/2)^2"');

console.log("\n支持的数学函数：");
console.log("- 基本运算: +, -, *, /, ^");
console.log("- 三角函数: sin, cos, tan, asin, acos, atan");
console.log("- 对数函数: log, ln, log10");
console.log("- 其他函数: sqrt, abs, ceil, floor, round");
console.log("- 数学常数: pi, e");

console.log("\n=== 示例完成 ===");
