import { createOfficeDoc } from './index';
import { join } from 'path';
import { homedir } from 'os';

async function example() {
  try {
    // 示例1：创建Word文档到桌面
    const wordPath = await createOfficeDoc({
      type: 'word'
    });
    console.log('Word文档已创建:', wordPath);

    // 示例2：创建Excel文档到指定目录
    const excelPath = await createOfficeDoc({
      type: 'excel',
      path: join(homedir(), 'Documents'),
      filename: '数据统计.xlsx',
      software: 'wps'
    });
    console.log('Excel文档已创建:', excelPath);

    // 示例3：创建PPT文档（不自动打开）
    const pptPath = await createOfficeDoc({
      type: 'ppt',
      filename: '演示文稿.pptx',
      openImmediately: false,
      overwrite: true
    });
    console.log('PPT文档已创建:', pptPath);

  } catch (error) {
    console.error('创建文档失败:', error);
  }
}

example(); 