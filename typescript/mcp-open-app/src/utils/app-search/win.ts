import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";

const filePath = path.resolve(
  "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs",
);

const appData = path.join(os.homedir(), "./AppData/Roaming");

const startMenu = path.join(
  appData,
  "Microsoft\\Windows\\Start Menu\\Programs",
);

// 桌面快捷方式路径
const desktopDirUser = path.join(os.homedir(), "Desktop");
const desktopDirPublic = "C:\\Users\\Public\\Desktop";

const fileLists: any = [];
const isZhRegex = /[\u4e00-\u9fa5]/;
const seenTargets = new Set<string>();

interface ShortcutInfo {
  target?: string;
}

// 读取 .lnk 目标路径
const readShortcutLink = (filePath: string): Promise<ShortcutInfo> => {
  return new Promise(async (resolve) => {
    // 1. 动态尝试加载 windows-shortcuts（避免 ESM require 问题）
    try {
      const ws: any = await import("windows-shortcuts");
      ws.query(filePath, (err: any, info: any) => {
        if (err || !info || !info.target) {
          // 继续尝试 PowerShell
          loadByPowerShell();
        } else {
          return resolve({ target: info.target });
        }
      });
    } catch {
      // 库不可用，走 PowerShell
      loadByPowerShell();
    }

    function loadByPowerShell() {
      // 回退 PowerShell（兼容性略差）
      const psCmd = `$sc=(New-Object -COM WScript.Shell).CreateShortcut(\"${
        filePath.replace(/`/g, "``")
      }\");Write-Output $sc.TargetPath;`;
      exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, {
        windowsHide: true,
      }, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({});
        } else {
          resolve({ target: stdout.trim() });
        }
      });
    }
  });
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

          if (
            isFile &&
            (path.extname(filename) === ".lnk" ||
              path.extname(filename) === ".url")
          ) {
            const appName = filename.split(".")[0];
            const keyWords = [appName];
            let targetPath = "";
            if (path.extname(filename) === ".lnk") {
              const appDetail = await readShortcutLink(filedir);
              targetPath = appDetail.target || "";
            } else {
              // .url 文件采用 INI 格式，解析 URL 字段
              try {
                const iniContent = fs.readFileSync(filedir, "utf8");
                const match = iniContent.match(/^URL=(.*)$/m);
                if (match && match[1]) {
                  targetPath = match[1].trim();
                }
              } catch (e) {
                // 忽略读取错误
              }
            }

            if (!targetPath || targetPath.toLowerCase().includes("unin")) {
              continue;
            }

            let iconSourcePath = "";
            if (path.extname(filename) === ".lnk") {
              // C:/program/cmd.exe => cmd
              keyWords.push(path.basename(targetPath, ".exe"));
              iconSourcePath = targetPath;
            } else {
              // 尝试 IconFile 字段
              try {
                const iconMatch = fs.readFileSync(filedir, "utf8").match(
                  /^IconFile=(.*)$/m,
                );
                if (iconMatch && iconMatch[1]) {
                  iconSourcePath = iconMatch[1].trim();
                }
              } catch {}
            }

            if (isZhRegex.test(appName)) {
              // 中文应用名
            } else {
              const firstLatter = appName
                .split(" ")
                .map((name) => name[0])
                .join("");
              keyWords.push(firstLatter);
            }

            if (seenTargets.has(targetPath)) continue;
            seenTargets.add(targetPath);

            const appInfo = {
              value: "plugin",
              path: targetPath,
              keyWords: keyWords,
              name: appName,
              names: JSON.parse(JSON.stringify(keyWords)),
              icon: "",
            };
            fileLists.push(appInfo);

            // 提取图标（同步，避免依赖 Electron）
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const fileIcon = require("extract-file-icon");
              const source = iconSourcePath && fs.existsSync(iconSourcePath)
                ? iconSourcePath
                : targetPath;
              const buffer = fileIcon(source, 64);
              const icondir = path.join(os.tmpdir(), "ProcessIcon");
              if (!fs.existsSync(icondir)) fs.mkdirSync(icondir);
              const iconpath = path.join(
                icondir,
                `${encodeURIComponent(appName)}.png`,
              );
              if (!fs.existsSync(iconpath)) fs.writeFileSync(iconpath, buffer);
              appInfo.icon = "image://" + iconpath;
            } catch {}
          }

          if (isDir) {
            await fileDisplay(filedir); // 递归遍历文件夹
          }
        } catch (statError) {
          console.warn("获取文件stats失败", statError);
        }
      }
      resolve();
    });
  });
}

export default async (): Promise<any[]> => {
  // 清空旧数据
  fileLists.length = 0;
  seenTargets.clear();

  await fileDisplay(filePath);
  await fileDisplay(startMenu);
  await fileDisplay(desktopDirUser);
  await fileDisplay(desktopDirPublic);
  return fileLists;
};
