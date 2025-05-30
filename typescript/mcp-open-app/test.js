import appSearch from './dist/utils/app-search/index.js';
import { getPlatform } from './dist/utils/platform.js';

async function test() {
  console.log('当前平台:', getPlatform());
  
  try {
    console.log('正在搜索应用...');
    const apps = await appSearch();
    console.log(`找到 ${apps.length} 个应用`);
    
    // 显示前5个应用
    if (apps.length > 0) {
      console.log('\n前5个应用:');
      apps.slice(0, 5).forEach((app, index) => {
        console.log(`${index + 1}. ${app.name}`);
        console.log(`   路径: ${app.path || app.desc}`);
        console.log(`   关键词: ${app.keyWords.join(', ')}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

test(); 