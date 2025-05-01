import { createOfficeDoc } from './utils';
import { join } from 'path';
import { homedir } from 'os';
import { platform } from 'os';
import { generateFileName, getDesktopPath, ensureDir } from './utils';

async function main() {
  try {
    console.log('开始创建文档...');
    console.log('当前操作系统:', platform());
    
    // 创建 PPT 文档
    console.log('\n创建 PPT 文档...');
    const pptDir = join(homedir(), '工作汇报');
    await ensureDir(pptDir);
    
    const pptResult = await createOfficeDoc({
      type: 'ppt',
      filename: '年度报告.pptx',
      path: pptDir,
      software: 'wps',  // 直接指定使用 WPS
      openImmediately: true,
      overwrite: false  // 不覆盖已存在文件，自动添加序号
    });
    
    if (pptResult.success) {
      console.log('PPT 文档已创建:', pptResult.path);
      if (pptResult.warnings?.length) {
        console.warn('警告:', pptResult.warnings.join('\n'));
      }
    } else {
      console.error('创建 PPT 文档失败:', pptResult.error);
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('程序执行失败:', error.message);
      console.error('错误详情:', error.stack);
    } else {
      console.error('程序执行失败:', error);
    }
    process.exit(1);
  }
}

// 执行主函数
main(); 