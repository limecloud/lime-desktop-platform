import { ipcMain } from 'electron';
import { LIME_DESKTOP_IPC } from '../shared/types';
import type {
  CapabilityInvokeInput,
  LaunchEntryInput,
  LoginInput,
  ModelSettings,
  PlatformSettings,
} from '../shared/types';
import { PlatformService } from './services/platformService';

export function registerIpcHandlers(platformService: PlatformService): void {
  ipcMain.handle(LIME_DESKTOP_IPC.platformBootstrap, () => platformService.getBootstrap());

  ipcMain.handle(LIME_DESKTOP_IPC.appsListCatalog, () => platformService.listCatalog());
  ipcMain.handle(LIME_DESKTOP_IPC.appsListInstalled, () => platformService.listInstalled());
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetProjection, (_event, appId: string) => platformService.getProjection(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetReadiness, (_event, appId: string) => platformService.getReadiness(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsInstall, (_event, appId: string) => platformService.installApp(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsUpdate, (_event, appId: string) => platformService.updateApp(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsEnable, (_event, appId: string) => platformService.enableApp(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsDisable, (_event, appId: string) => platformService.disableApp(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.appsLaunchEntry, (_event, input: LaunchEntryInput) =>
    platformService.launchEntry(input),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsInvokeCapability, (_event, input: CapabilityInvokeInput) =>
    platformService.invokeCapability(input),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.appsGetRuntimeSnapshot, (_event, input: LaunchEntryInput) =>
    platformService.getRuntimeSnapshot(input),
  );

  ipcMain.handle(LIME_DESKTOP_IPC.settingsGetModel, () => platformService.getModelSettings());
  ipcMain.handle(LIME_DESKTOP_IPC.settingsSaveModel, (_event, settings: ModelSettings) =>
    platformService.saveModelSettings(settings),
  );
  ipcMain.handle(LIME_DESKTOP_IPC.settingsGetPlatform, () => platformService.getPlatformSettings());
  ipcMain.handle(LIME_DESKTOP_IPC.settingsSavePlatform, (_event, settings: PlatformSettings) =>
    platformService.savePlatformSettings(settings),
  );

  ipcMain.handle(LIME_DESKTOP_IPC.authGetSession, () => platformService.getAuthSession());
  ipcMain.handle(LIME_DESKTOP_IPC.authLogin, (_event, input: LoginInput) => platformService.login(input));
  ipcMain.handle(LIME_DESKTOP_IPC.authLogout, () => platformService.logout());

  ipcMain.handle(LIME_DESKTOP_IPC.billingGetState, () => platformService.getBillingState());
  ipcMain.handle(LIME_DESKTOP_IPC.billingRefresh, () => platformService.refreshBilling());
  ipcMain.handle(LIME_DESKTOP_IPC.oemGetProjection, () => platformService.getOEMProjection());
  ipcMain.handle(LIME_DESKTOP_IPC.updatesCheck, () => platformService.checkUpdates());
  ipcMain.handle(LIME_DESKTOP_IPC.updatesDownload, (_event, appId: string) => platformService.downloadUpdate(appId));
  ipcMain.handle(LIME_DESKTOP_IPC.updatesApply, (_event, appId: string) => platformService.applyUpdate(appId));
}
