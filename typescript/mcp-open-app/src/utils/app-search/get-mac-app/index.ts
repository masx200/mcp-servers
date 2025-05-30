import getApps from './getApps.js';
import app2png from './app2png.js';

export default {
  getApps: () => {
    return new Promise((resolve, reject) => getApps(resolve, reject));
  },
  isInstalled: (appName: string) => {
    return new Promise((resolve, reject) => getApps(resolve, reject, appName));
  },
  app2png,
};
