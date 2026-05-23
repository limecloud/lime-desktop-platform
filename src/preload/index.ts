import { contextBridge, ipcRenderer } from 'electron';
import { LIME_DESKTOP_IPC } from '../shared/types';
import type {
  CapabilityInvokeInput,
  LaunchEntryInput,
  LimeDesktopApi,
  LoginInput,
  ModelSettings,
  PlatformSettings,
} from '../shared/types';

const api: LimeDesktopApi = {
  platform: {
    getBootstrap: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.platformBootstrap),
  },
  apps: {
    listCatalog: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsListCatalog),
    listInstalled: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsListInstalled),
    getProjection: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsGetProjection, appId),
    getReadiness: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsGetReadiness, appId),
    install: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsInstall, appId),
    update: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsUpdate, appId),
    enable: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsEnable, appId),
    disable: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsDisable, appId),
    launchEntry: (input: LaunchEntryInput) => ipcRenderer.invoke(LIME_DESKTOP_IPC.appsLaunchEntry, input),
    invokeCapability: (input: CapabilityInvokeInput) =>
      ipcRenderer.invoke(LIME_DESKTOP_IPC.appsInvokeCapability, input),
    getRuntimeSnapshot: (input: LaunchEntryInput) =>
      ipcRenderer.invoke(LIME_DESKTOP_IPC.appsGetRuntimeSnapshot, input),
  },
  settings: {
    getModel: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.settingsGetModel),
    saveModel: (settings: ModelSettings) => ipcRenderer.invoke(LIME_DESKTOP_IPC.settingsSaveModel, settings),
    getPlatform: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.settingsGetPlatform),
    savePlatform: (settings: PlatformSettings) => ipcRenderer.invoke(LIME_DESKTOP_IPC.settingsSavePlatform, settings),
  },
  auth: {
    getSession: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.authGetSession),
    login: (input: LoginInput) => ipcRenderer.invoke(LIME_DESKTOP_IPC.authLogin, input),
    logout: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.authLogout),
  },
  billing: {
    getState: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.billingGetState),
    refresh: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.billingRefresh),
  },
  oem: {
    getProjection: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.oemGetProjection),
  },
  updates: {
    check: () => ipcRenderer.invoke(LIME_DESKTOP_IPC.updatesCheck),
    download: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.updatesDownload, appId),
    apply: (appId: string) => ipcRenderer.invoke(LIME_DESKTOP_IPC.updatesApply, appId),
  },
};

contextBridge.exposeInMainWorld('limeDesktop', api);
