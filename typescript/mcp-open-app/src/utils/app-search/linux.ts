import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const app_paths = [
  "/usr/share/applications",
  "/var/lib/snapd/desktop/applications",
  `${os.homedir()}/.local/share/applications`,
];

function dirAppRead(dir: string, target: string[]): void {
  let files: Array<string> | null = null;
  try {
    if (!fs.existsSync(dir)) return;
    files = fs.readdirSync(dir);
  } catch (e) {
    return;
  }
  if (files.length !== 0) {
    for (const file of files) {
      const app = path.join(dir, file);
      path.extname(app) === ".desktop" && target.push(app);
    }
  }
}

function convertEntryFile2Feature(appPath: string): any {
  let appInfo: any = null;
  try {
    appInfo = fs.readFileSync(appPath, "utf8");
  } catch (e) {
    return null;
  }
  if (!appInfo.includes("[Desktop Entry]")) {
    return null;
  }
  appInfo = appInfo
    .substring(appInfo.indexOf("[Desktop Entry]"))
    .replace("[Desktop Entry]", "")
    .trim();

  /**
   * appInfo eg:
   * Version=1.0
   * Name=FireFox
   * Name[ar]=***
   * Name[ast]=***
   * [Desktop Action new-private-window]
   * Name=***
   */
  const splitIndex = appInfo.indexOf("\n[");

  if (splitIndex > 0) {
    appInfo = appInfo.substring(0, splitIndex).trim();
  }

  const targetAppInfo: any = {};
  const matches = appInfo.match(/^[\w\-[\]]+ ?=.*$/gm);
  if (matches) {
    matches.forEach((e: string) => {
      const index = e.indexOf("=");
      targetAppInfo[e.substring(0, index).trim()] = e.substring(index + 1).trim();
    });
  }

  /**
   * targetAppInfo = {
   * Type: "Application",
   * Version: "1.0",
   * Exec: "xxxx",
   * }
   */

  if (targetAppInfo.Type !== "Application") {
    return null;
  }
  if (!targetAppInfo.Exec) {
    return null;
  }
  if (
    targetAppInfo.NoDisplay === "true" &&
    !targetAppInfo.Exec.startsWith("gnome-control-center")
  ) {
    return null;
  }
  
  let desktop_session = String(process.env.DESKTOP_SESSION || "").toLowerCase();
  if (desktop_session === "ubuntu") {
    desktop_session = "gnome";
    if (
      targetAppInfo.OnlyShowIn &&
      !targetAppInfo.OnlyShowIn.toLowerCase().includes(desktop_session)
    ) {
      return null;
    }
  }
  if (
    targetAppInfo.NotShowIn &&
    targetAppInfo.NotShowIn.toLowerCase().includes(desktop_session)
  ) {
    return null;
  }
  
  // 简化路径获取逻辑，直接使用可执行文件路径
  let execPath = targetAppInfo.Exec.replace(/ %[A-Za-z]/g, "")
    .replace(/"/g, "")
    .trim();
  targetAppInfo.Terminal === "true" &&
    (execPath = "gnome-terminal -x " + execPath);

  const info = {
    value: "plugin",
    path: execPath,
    keyWords: [targetAppInfo.Name],
    name: targetAppInfo.Name,
    names: [targetAppInfo.Name]
  };

  if ("X-Ubuntu-Gettext-Domain" in targetAppInfo) {
    const cmd = targetAppInfo["X-Ubuntu-Gettext-Domain"];
    cmd && cmd !== targetAppInfo.Name && info.keyWords.push(cmd);
  }
  return info;
}

export default async (): Promise<any[]> => {
  const apps: any = [];
  const fileList: string[] = [];
  app_paths.forEach((dir) => {
    dirAppRead(dir, fileList);
  });

  fileList.forEach((e) => {
    const app = convertEntryFile2Feature(e);
    if (app) apps.push(app);
  });
  return apps.filter((app: any) => !!app);
};
