
```
自动发布到npm仓库 
npm run publish -- <package-name> 
如：npm run publish -- mcp-ip-query

会依次执行对应项目内的以下命令：
  'npm install',//下载依赖
  'npm run build',//打包
  'npm version patch',//修改小版本号
  'npm publish --access public'//发布到npm仓库

```