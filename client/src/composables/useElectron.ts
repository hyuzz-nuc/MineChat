/**
 * Electron 兼容层
 * 检测是否在Electron环境，提供窗口控制API
 */
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      platform: string;
      isElectron: boolean;
    };
  }
}

/** 是否在Electron桌面环境中 */
export function isElectron(): boolean {
  return !!window.electronAPI?.isElectron;
}

/** 最小化窗口 */
export function minimizeWindow(): void {
  window.electronAPI?.minimize();
}

/** 最大化/还原窗口 */
export function maximizeWindow(): void {
  window.electronAPI?.maximize();
}

/** 关闭窗口 */
export function closeWindow(): void {
  window.electronAPI?.close();
}

/** 是否已最大化 */
export async function isWindowMaximized(): Promise<boolean> {
  return window.electronAPI?.isMaximized() ?? false;
}
