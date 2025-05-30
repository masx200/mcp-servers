import { spawn } from 'child_process';

export default function getApps(resolve: (value: any) => void, reject: (reason?: any) => void, filterByAppName: string | false = false) {
  let resultBuffer = Buffer.alloc(0);

  const profileInstalledApps = spawn('/usr/sbin/system_profiler', [
    '-xml',
    '-detailLevel',
    'mini',
    'SPApplicationsDataType',
  ]);

  profileInstalledApps.stdout.on('data', (chunckBuffer: Buffer) => {
    resultBuffer = Buffer.concat([resultBuffer, chunckBuffer]);
  });

  profileInstalledApps.on('exit', (exitCode) => {
    if (exitCode !== 0) {
      reject([]);
      return;
    }

    try {
      import('plist').then(plistModule => {
        const plist = plistModule.default || plistModule;
        const parsedData = plist.parse(resultBuffer.toString()) as any[];
        const installedApps = parsedData[0];
        
        if (!filterByAppName) return resolve(installedApps._items);
        return resolve(
          installedApps._items.filter((apps: any) => apps._name === filterByAppName)
            .length !== 0
        );
      }).catch(reject);
    } catch (err) {
      reject(err);
    }
  });

  profileInstalledApps.on('error', (err) => {
    reject(err);
  });
}
