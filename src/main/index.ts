import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { registerIpcHandlers } from './ipc';
import { PlatformService } from './services/platformService';

function createWindow(): void {
  app.setName('Lime Desktop Platform');
  const hideForSmoke = process.env.LIME_DESKTOP_SMOKE === '1' && process.env.LIME_DESKTOP_TEST_SILENT !== '0';

  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    show: !hideForSmoke,
    title: 'Lime Desktop Platform',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!hideForSmoke) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  const platformService = new PlatformService();
  registerIpcHandlers(platformService);

  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        event.preventDefault();
      }
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
