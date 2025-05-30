// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import getMacApps from './get-mac-app/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const icondir = path.join(os.tmpdir(), 'ProcessIcon');

const exists = fs.existsSync(icondir);
if (!exists) {
  fs.mkdirSync(icondir);
}

const isZhRegex = /[\u4e00-\u9fa5]/;

async function getAppIcon(appPath: string, name: string): Promise<boolean> {
  try {
    const iconpath = path.join(icondir, `${name}.png`);
    const iconnone = path.join(icondir, `${name}.none`);
    const exists = fs.existsSync(iconpath);
    const existsnone = fs.existsSync(iconnone);
    if (exists) return true;
    if (existsnone) return false;

    await getMacApps.app2png(appPath, iconpath);
    return true;
  } catch (e) {
    return false;
  }
}

interface AppInfo {
  _name: string;
  path: string;
  icon?: string;
  value: string;
  desc: string;
  pluginType: string;
  action: string;
  keyWords: string[];
  name: string;
  names: string[];
}

export default async (): Promise<AppInfo[]> => {
  let apps: any = await getMacApps.getApps();

  apps = apps.filter((app: any) => {
    const extname = path.extname(app.path);
    return extname === '.app' || extname === '.prefPane';
  });
  
  for (const app of apps) {
    if (await getAppIcon(app.path, app._name)) {
      app.icon =
        'file://' +
        path.join(
          os.tmpdir(),
          'ProcessIcon',
          `${encodeURIComponent(app._name)}.png`
        );
    }
  }
  
  apps = apps.filter((app: any) => !!app.icon);

  apps = apps.map((app: any): AppInfo => {
    const appName: any = app.path.split('/').pop();
    const extname = path.extname(appName);
    const appSubStr = appName.split(extname)[0];
    let fileOptions: AppInfo = {
      ...app,
      value: 'plugin',
      desc: app.path,
      pluginType: 'app',
      action: `open "${app.path}"`,
      keyWords: [appSubStr],
      name: app._name,
      names: [appSubStr],
    };

    if (app._name && isZhRegex.test(app._name)) {
      // 中文
      fileOptions.keyWords.push(app._name);
    }

    fileOptions = {
      ...fileOptions,
      names: JSON.parse(JSON.stringify(fileOptions.keyWords)),
    };
    return fileOptions;
  });

  return apps;
};
