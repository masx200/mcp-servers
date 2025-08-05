const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const packageName = process.argv[2];

if (!packageName) {
  console.error("错误：请输入需要发布的包名。");
  console.log("用法: node scripts/publish-package.js <package-name>");
  process.exit(1);
}

const packagePath = path.resolve(__dirname, "..", packageName);

if (!fs.existsSync(packagePath) || !fs.statSync(packagePath).isDirectory()) {
  console.error(`错误：包目录 ${packagePath} 不存在。`);
  process.exit(1);
}

const packageJsonPath = path.join(packagePath, "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error(`错误：在 ${packagePath} 中未找到 package.json。`);
  process.exit(1);
}

console.log(`正在发布包: ${packageName} (路径: ${packagePath})`);

const commands = [
  "npm install",
  "npm run build",
  "npm version patch",
  "npm publish --access public",
];

try {
  for (const command of commands) {
    console.log(`\n执行命令: ${command} 在 ${packagePath}`);
    execSync(command, { cwd: packagePath, stdio: "inherit" });
  }
  console.log(`\n🎉 包 ${packageName} 发布成功!`);
} catch (error) {
  console.error(`\n❌ 发布包 ${packageName} 失败:`, error.message);
  process.exit(1);
}
