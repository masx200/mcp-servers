import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

const filePath = path.resolve(
  'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs'
);

const appData = path.join(os.homedir(), './AppData/Roaming');

const startMenu = path.join(
  appData,
  'Microsoft\\Windows\\Start Menu\\Programs'
);

const fileLists: any = [];
const isZhRegex = /[\u4e00-\u9fa5]/;

const icondir = path.join(os.tmpdir(), 'ProcessIcon');
const exists = fs.existsSync(icondir);
if (!exists) {
  fs.mkdirSync(icondir);
}

interface ShortcutInfo {
  target?: string;
}

// 简化的读取快捷方式函数，使用exec调用PowerShell
const readShortcutLink = (filePath: string): Promise<ShortcutInfo> => {
  return new Promise((resolve) => {
    const powershellScript = `
      $WshShell = New-Object -comObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut('${filePath}')
      Write-Output $Shortcut.TargetPath
    `;
    
    exec(`powershell -Command "${powershellScript}"`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({});
      } else {
        resolve({ target: stdout.trim() });
      }
    });
  });
};

const getico = async (app: any) => {
  try {
    // 尝试使用extract-file-icon包
    const extractFileIcon = await import('extract-file-icon');
    const fileIconFunc = extractFileIcon.default || extractFileIcon;
    const buffer = fileIconFunc(app.desc, 32);
    const iconpath = path.join(icondir, `${app.name}.png`);

    if (!fs.existsSync(iconpath)) {
      fs.writeFileSync(iconpath, buffer, 'base64');
    }
  } catch (e) {
    console.log(e, app.desc);
  }
};

async function fileDisplay(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    fs.readdir(filePath, async function (err, files) {
      if (err) {
        console.warn(err);
        resolve();
        return;
      }
      
      for (const filename of files) {
        const filedir = path.join(filePath, filename);
        try {
          const stats = fs.statSync(filedir);
          const isFile = stats.isFile();
          const isDir = stats.isDirectory();
          
          if (isFile && path.extname(filename) === '.lnk') {
            const appName = filename.split('.')[0];
            const keyWords = [appName];
            
            const appDetail = await readShortcutLink(filedir);
            
            if (!appDetail.target || appDetail.target.toLowerCase().indexOf('unin') >= 0) {
              continue;
            }

            // C:/program/cmd.exe => cmd
            keyWords.push(path.basename(appDetail.target, '.exe'));

            if (isZhRegex.test(appName)) {
              // 中文应用名
            } else {
              const firstLatter = appName
                .split(' ')
                .map((name) => name[0])
                .join('');
              keyWords.push(firstLatter);
            }

            const icon = path.join(
              os.tmpdir(),
              'ProcessIcon',
              `${encodeURIComponent(appName)}.png`
            );

            const appInfo = {
              value: 'plugin',
              desc: appDetail.target,
              type: 'app',
              icon,
              pluginType: 'app',
              action: `start "" "${appDetail.target}"`,
              keyWords: keyWords,
              name: appName,
              names: JSON.parse(JSON.stringify(keyWords)),
            };
            fileLists.push(appInfo);
            await getico(appInfo);
          }
          
          if (isDir) {
            await fileDisplay(filedir); // 递归遍历文件夹
          }
        } catch (statError) {
          console.warn('获取文件stats失败', statError);
        }
      }
      resolve();
    });
  });
}

export default async (): Promise<any[]> => {
  await fileDisplay(filePath);
  await fileDisplay(startMenu);
  return fileLists;
};
