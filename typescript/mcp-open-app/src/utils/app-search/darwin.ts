// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import getMacApps from './get-mac-app/index.js';
import * as path from 'path';

const isZhRegex = /[\u4e00-\u9fa5]/;

interface AppInfo {
  _name: string;
  path: string;
  value: string;
  keyWords: string[];
  name: string;
  names: string[];
}

export default async (): Promise<AppInfo[]> => {
  let apps: any = await getMacApps.getApps();
  // console.error('mac apps', apps);
  apps = apps.filter((app: any) => {
    const extname = path.extname(app.path);
    return extname === '.app' || extname === '.prefPane';
  });
  
  apps = apps.map((app: any): AppInfo => {
    const appName: any = app.path.split('/').pop();
    const extname = path.extname(appName);
    const appSubStr = appName.split(extname)[0];
    let fileOptions: AppInfo = {
      ...app,
      value: 'plugin',
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
