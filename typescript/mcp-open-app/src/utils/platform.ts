import * as os from "os";

export const isMac = os.platform() === "darwin";
export const isWin = os.platform() === "win32";
export const isLinux = os.platform() === "linux";

export function getPlatform() {
  if (isMac) return "darwin";
  if (isWin) return "win32";
  if (isLinux) return "linux";
  return os.platform();
}
