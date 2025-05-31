import getApps from './getApps.js';

export default {
  getApps: () => {
    return new Promise((resolve, reject) => getApps(resolve, reject));
  },
  isInstalled: (appName: string) => {
    return new Promise((resolve, reject) => getApps(resolve, reject, appName));
  },
};
