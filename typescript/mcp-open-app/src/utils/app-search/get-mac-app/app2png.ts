import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

const getIconFile = (appFileInput: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const plistPath = path.join(appFileInput, 'Contents', 'Info.plist');
    
    // 使用dynamic import来导入simple-plist
    import('simple-plist').then(plistModule => {
      const plist = plistModule.default || plistModule;
      plist.readFile(plistPath, (err: any, data: any) => {
        if (err || !data?.CFBundleIconFile) {
          return resolve(
            '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns'
          );
        }
        const iconFile = path.join(
          appFileInput,
          'Contents',
          'Resources',
          data.CFBundleIconFile
        );
        const iconFiles = [iconFile, iconFile + '.icns', iconFile + '.tiff'];
        const existedIcon = iconFiles.find((iconFile) => {
          return fs.existsSync(iconFile);
        });
        resolve(
          existedIcon ||
            '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns'
        );
      });
    }).catch(reject);
  });
};

const tiffToPng = (iconFile: string, pngFileOutput: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(
      `sips -s format png '${iconFile}' --out '${pngFileOutput}' --resampleHeightWidth 64 64`,
      (error) => {
        error ? reject(error) : resolve();
      }
    );
  });
};

const app2png = (appFileInput: string, pngFileOutput: string): Promise<void> => {
  return getIconFile(appFileInput).then((iconFile) => {
    return tiffToPng(iconFile, pngFileOutput);
  });
};

export default app2png;
