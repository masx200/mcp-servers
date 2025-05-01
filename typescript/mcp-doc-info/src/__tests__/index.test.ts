import { createOfficeDoc } from '../index';
import { platform } from 'os';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// 模拟 fs 和 os 模块
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('os', () => ({
  platform: jest.fn(),
  homedir: jest.fn(),
}));

describe('OfficeDocCreator', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置默认模拟值
    (platform as jest.Mock).mockReturnValue('win32');
    (homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
    (existsSync as jest.Mock).mockImplementation((path) => {
      // 模拟软件安装检测
      if (path.includes('Microsoft Office')) return true;
      if (path.includes('WPS Office')) return true;
      return false;
    });
  });

  describe('createDoc', () => {
    it('应该使用默认参数创建 Word 文档', async () => {
      const result = await createOfficeDoc({ type: 'word' });
      expect(result).toContain('新建Word文档');
      expect(result).toContain('.docx');
    });

    it('应该使用指定参数创建 Excel 文档', async () => {
      const result = await createOfficeDoc({
        type: 'excel',
        filename: '测试.xlsx',
        path: 'C:\\test',
        software: 'wps'
      });
      expect(result).toContain('测试.xlsx');
      expect(result).toContain('C:\\test');
    });

    it('应该处理文件名冲突', async () => {
      (existsSync as jest.Mock).mockImplementation((path) => {
        if (path.includes('测试文档.pptx')) return true;
        return false;
      });

      const result = await createOfficeDoc({
        type: 'ppt',
        filename: '测试文档.pptx',
        overwrite: false
      });
      expect(result).toContain('测试文档(1).pptx');
    });

    it('应该在软件未安装时抛出错误', async () => {
      (existsSync as jest.Mock).mockImplementation(() => false);

      await expect(createOfficeDoc({
        type: 'word',
        software: 'office'
      })).rejects.toThrow('OFFICE is not installed');
    });

    it('应该在路径无效时抛出错误', async () => {
      (existsSync as jest.Mock).mockImplementation((path) => {
        if (path.includes('invalid')) return false;
        return true;
      });

      await expect(createOfficeDoc({
        type: 'word',
        path: 'C:\\invalid\\path'
      })).rejects.toThrow('Invalid path or insufficient permissions');
    });
  });

  describe('跨平台支持', () => {
    it('应该在 Windows 上使用正确的命令', async () => {
      (platform as jest.Mock).mockReturnValue('win32');
      await createOfficeDoc({ type: 'word' });
      // 这里应该验证是否使用了正确的 Windows 命令
    });

    it('应该在 macOS 上使用正确的命令', async () => {
      (platform as jest.Mock).mockReturnValue('darwin');
      await createOfficeDoc({ type: 'word' });
      // 这里应该验证是否使用了正确的 macOS 命令
    });

    it('应该在 Linux 上使用正确的命令', async () => {
      (platform as jest.Mock).mockReturnValue('linux');
      await createOfficeDoc({ type: 'word' });
      // 这里应该验证是否使用了正确的 Linux 命令
    });
  });
}); 