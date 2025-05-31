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
        console.log(`   路径: ${app.path}`);
        console.log(`   关键词: ${app.keywords.join(', ')}`);
        console.log('');
      });
      
      // 测试搜索功能
      console.log('\n测试搜索 "chrome":');
      const searchResults = apps.filter(app => 
        app.name.toLowerCase().includes('chrome') ||
        app.keywords.some(keyword => keyword.toLowerCase().includes('chrome'))
      );
      
      if (searchResults.length > 0) {
        searchResults.forEach((app) => {
          console.log(`- ${app.name} (${app.path})`);
        });
      } else {
        console.log('未找到包含"chrome"的应用');
      }
    }
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

test(); 