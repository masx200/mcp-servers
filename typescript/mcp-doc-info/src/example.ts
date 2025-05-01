import { createOfficeDoc } from './index';
import { join } from 'path';
import { homedir } from 'os';
import { getDesktopPath } from './utils';

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
      filename: '年度报告.xlsx',
      software: 'wps'
    });
    console.log('Excel文档已创建:', excelPath);

    // 示例3：创建PPT文档（不自动打开）
    const pptPath = await createOfficeDoc({
      type: 'ppt',
      filename: '年度报告.pptx',
      openImmediately: false,
      overwrite: true
    });
    console.log('PPT文档已创建:', pptPath);

    // 创建 PPT 文档，如果文件已存在则自动添加序号
    const pptPath2 = await createOfficeDoc({
      type: 'ppt',
      filename: '年度报告.pptx',
      path: join(homedir(), '工作汇报'),
      software: 'wps',
      openImmediately: true,
      overwrite: false
    });

    // 创建 Word 文档，如果文件已存在则覆盖
    const wordPath2 = await createOfficeDoc({
      type: 'word',
      filename: '年度报告.docx',
      path: getDesktopPath(),
      software: 'auto',
      openImmediately: true,
      overwrite: true
    });

  } catch (error) {
    console.error('创建文档失败:', error);
  }
}

example(); 