import { homedir, tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';

interface ElectronAppLike {
  getAppPath?: () => string;
  getPath?: (name: string) => string;
  getVersion?: () => string;
}

function readElectronApp(): ElectronAppLike | undefined {
  try {
    const electron = createRequire(join(process.cwd(), 'package.json'))('electron') as { app?: ElectronAppLike };
    return electron.app;
  } catch {
    return undefined;
  }
}

function readString(callback: () => string | undefined): string | undefined {
  try {
    const value = callback()?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function getElectronAppPath(): string {
  return readString(() => readElectronApp()?.getAppPath?.()) ?? process.cwd();
}

export function getElectronAppVersion(): string {
  return readString(() => readElectronApp()?.getVersion?.()) ?? process.env.npm_package_version ?? '0.0.0';
}

export function getElectronPath(name: string): string {
  const electronPath = readString(() => readElectronApp()?.getPath?.(name));
  if (electronPath) return electronPath;

  if (name === 'appData') {
    if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support');
    if (process.platform === 'win32') return process.env.APPDATA ?? tmpdir();
    return process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  }

  if (name === 'userData') {
    return join(tmpdir(), 'lime-desktop-platform-user-data');
  }

  return tmpdir();
}
