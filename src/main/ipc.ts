import { BrowserWindow, ipcMain } from 'electron';
import { LIME_DESKTOP_IPC } from '../shared/types';
import type {
  CapabilityInvokeInput,
  LaunchEntryInput,
  LoginInput,
  ModelSettings,
  PlatformChangeEvent,
  PlatformChangeReason,
  PlatformSettings,
  UninstallAppInput,
} from '../shared/types';
import { PlatformService } from './services/platformService';

function nowIso(): string {
  return new Date().toISOString();
}

function broadcastPlatformChange(
  platformService: PlatformService,
  reason: PlatformChangeReason,
  context: { appId?: string; entryKey?: string } = {},
): void {
  const event: PlatformChangeEvent = {
    reason,
    appId: context.appId,
    entryKey: context.entryKey,
    timestamp: nowIso(),
    bootstrap: platformService.getBootstrap(),
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(LIME_DESKTOP_IPC.platformChanged, event);
  }
}

async function withPlatformChange<T>(
  platformService: PlatformService,
  reason: PlatformChangeReason,
  context: { appId?: string; entryKey?: string },
  action: () => T | Promise<T>,
): Promise<T> {
  const result = await action();
  broadcastPlatformChange(platformService, reason, context);
  return result;
}

export function registerIpcHandlers(platformService: PlatformService): void {
  ipcMain.handle(LIME_DESKTOP_IPC.platformBootstrap, () => platformService.getBootstrap());

  ipcMain.handle(LIME_DESKTOP_IPC.appsListCatalog, () => platformService.listCatalog());
  ipcMain.handle(LIME_DESKTOP_IPC.appsListInstalled, () => platformService.listInstalled());
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetProjection, (_event, appId: string) => platformService.getProjection(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetReadiness, (_event, appId: string) => platformService.getReadiness(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsInstall, (_event, appId: string) =>
    withPlatformChange(platformService, 'app-installed', { appId }, () => platformService.installApp(appId)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsUpdate, (_event, appId: string) =>
    withPlatformChange(platformService, 'app-updated', { appId }, () => platformService.updateApp(appId)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsEnable, (_event, appId: string) =>
    withPlatformChange(platformService, 'app-enabled', { appId }, () => platformService.enableApp(appId)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsDisable, (_event, appId: string) =>
    withPlatformChange(platformService, 'app-disabled', { appId }, () => platformService.disableApp(appId)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsUninstall, (_event, input: UninstallAppInput) =>
    withPlatformChange(platformService, 'app-uninstalled', { appId: input.appId }, () =>
      platformService.uninstallApp(input),
    ),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsLaunchEntry, (_event, input: LaunchEntryInput) =>
    withPlatformChange(platformService, 'app-launched', input, () => platformService.launchEntry(input)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsInvokeCapability, (_event, input: CapabilityInvokeInput) =>
    withPlatformChange(platformService, 'runtime-event', input, () => platformService.invokeCapability(input)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetRuntimeSnapshot, (_event, input: LaunchEntryInput) =>
    platformService.getRuntimeSnapshot(input),
  );

  ipcMain.handle(LIME_DESKTOP_IPC.settingsGetModel, () => platformService.getModelSettings());
  ipcMain.handle(LIME_DESKTOP_IPC.settingsSaveModel, (_event, settings: ModelSettings) =>
    withPlatformChange(platformService, 'settings-updated', {}, () => platformService.saveModelSettings(settings)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.settingsGetPlatform, () => platformService.getPlatformSettings());
  ipcMain.handle(LIME_DESKTOP_IPC.settingsSavePlatform, (_event, settings: PlatformSettings) =>
    withPlatformChange(platformService, 'settings-updated', {}, () => platformService.savePlatformSettings(settings)),
  );

  ipcMain.handle(LIME_DESKTOP_IPC.authGetSession, () => platformService.getAuthSession());
  ipcMain.handle(LIME_DESKTOP_IPC.authLogin, (_event, input: LoginInput) =>
    withPlatformChange(platformService, 'auth-updated', {}, () => platformService.login(input)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.authLogout, () =>
    withPlatformChange(platformService, 'auth-updated', {}, () => platformService.logout()),
  );

  ipcMain.handle(LIME_DESKTOP_IPC.billingGetState, () => platformService.getBillingState());
  ipcMain.handle(LIME_DESKTOP_IPC.billingRefresh, () =>
    withPlatformChange(platformService, 'billing-updated', {}, () => platformService.refreshBilling()),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.oemGetProjection, () => platformService.getOEMProjection());
  ipcMain.handle(LIME_DESKTOP_IPC.updatesCheck, () =>
    withPlatformChange(platformService, 'updates-checked', {}, () => platformService.checkUpdates()),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.updatesDownload, (_event, appId: string) =>
    withPlatformChange(platformService, 'updates-checked', { appId }, () => platformService.downloadUpdate(appId)),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.updatesApply, (_event, appId: string) =>
    withPlatformChange(platformService, 'app-updated', { appId }, () => platformService.applyUpdate(appId)),
  );
}
