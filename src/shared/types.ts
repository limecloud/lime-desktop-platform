export type HostKind = 'electron' | 'tauri';
export type SourceKind = 'cloud' | 'local' | 'oem';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ReadinessState = 'ready' | 'needs-setup' | 'blocked' | 'disabled';
export type BillingState = 'unknown' | 'active' | 'needs-payment' | 'suspended';
export type OAuthState = 'unauthenticated' | 'authenticated' | 'expired';
export type OEMState = 'unbranded' | 'branded' | 'customized';
export type InstallMode = 'in_lime' | 'standalone' | 'runtime_backed';

export type AppEntryKind = 'page' | 'workflow' | 'expert-chat' | 'settings' | 'diagnostics';

export type AppLifecycleState =
  | 'discovered'
  | 'downloading'
  | 'downloaded'
  | 'verifying'
  | 'projecting'
  | 'needs-setup'
  | 'blocked'
  | 'ready'
  | 'launching'
  | 'running'
  | 'updating'
  | 'disabled'
  | 'uninstalling'
  | 'removed';

export type PlatformCapability =
  | 'lime.cloudSession'
  | 'lime.modelSettings'
  | 'lime.branding'
  | 'lime.billing'
  | 'lime.appUpdates'
  | 'lime.download'
  | 'lime.permissions'
  | 'lime.diagnostics';

export interface DesktopAppEntry {
  key: string;
  kind: AppEntryKind;
  label?: string;
  route: string;
}

export interface DesktopAppManifest {
  appId: string;
  displayName: string;
  version: string;
  installMode: InstallMode;
  entries: DesktopAppEntry[];
  requires: {
    sdkVersion: string;
    capabilities: PlatformCapability[];
    hostKinds?: HostKind[];
  };
  branding?: {
    logo?: string;
    theme?: string;
  };
}

export interface DesktopPackageIdentity {
  appId: string;
  version: string;
  packageHash: string;
  manifestHash: string;
  sourceKind: SourceKind;
  installedAt: string;
  updatedAt: string;
}

export interface InstalledAppRecord extends DesktopPackageIdentity {
  enabled: boolean;
  status: AppLifecycleState;
  lastLaunchedAt?: string;
}

export interface HostProfile {
  hostKind: HostKind;
  hostVersion: string;
  capabilities: PlatformCapability[];
  locale: string;
  theme: ThemeMode;
  workspacePath?: string;
}

export interface ReadinessReason {
  code: string;
  message: string;
  fixable: boolean;
}

export interface ReadinessResult {
  state: ReadinessState;
  reasons: ReadinessReason[];
  setupActions: string[];
}

export interface DesktopAppProjection {
  appId: string;
  displayName: string;
  version: string;
  catalogCard: {
    sourceKind: SourceKind;
    description?: string;
    updateAvailable?: boolean;
    status: AppLifecycleState;
  };
  entryCards: Array<{
    key: string;
    label: string;
    route: string;
    enabled: boolean;
  }>;
  capabilityPreview: PlatformCapability[];
  readiness: ReadinessResult;
}

export interface HostSnapshot {
  hostKind: HostKind;
  hostVersion: string;
  appId: string;
  entryKey: string;
  locale: string;
  theme: ThemeMode;
  workspacePath?: string;
  modelSettingsVersion?: string;
  oauthState?: OAuthState;
  billingState?: BillingState;
  oemState?: OEMState;
}

export interface RuntimeBridgeDescriptor {
  protocol: 'lime.runtimeBridge';
  version: 1;
  endpoint: string;
  token: string;
  appId: string;
  entryKey: string;
  expiresAt: string;
}

export type HostBridgeMessageType =
  | 'ready'
  | 'snapshot'
  | 'invoke'
  | 'result'
  | 'error'
  | 'toast'
  | 'navigate'
  | 'event';

export interface HostBridgeMessage<T = unknown> {
  protocol: 'lime.agentApp.bridge';
  version: 1;
  requestId: string;
  appId: string;
  entryKey: string;
  type: HostBridgeMessageType;
  payload: T;
}

export interface CatalogApp {
  manifest: DesktopAppManifest;
  sourceKind: SourceKind;
  description: string;
  categories: string[];
  latestVersion: string;
  updatedAt: string;
  releaseNotes: string[];
  frameworkHighlights?: Array<{
    label: string;
    state: ReadinessState | 'dev-projection';
    detail: string;
  }>;
  devRuntime?: {
    projectRootEnv?: string;
    relativeProjectRoot?: string;
    mainEntry?: string;
    remoteDebuggingPortEnv?: string;
  };
}

export type ModelProtocol = 'openai-compatible' | 'anthropic-compatible' | 'gemini-native' | 'local';
export type ModelCapabilityKind = 'text' | 'image' | 'video';

export interface ModelProviderConfig {
  id: string;
  displayName: string;
  protocol: ModelProtocol;
  capabilityKinds: ModelCapabilityKind[];
  enabled: boolean;
  apiKeyConfigured: boolean;
  baseUrl?: string;
  models: string[];
}

export interface ModelSettings {
  version: string;
  updatedAt: string;
  defaultTextModelId?: string;
  defaultImageModelId?: string;
  defaultVideoModelId?: string;
  providers: ModelProviderConfig[];
}

export interface CloudSessionSnapshot {
  state: OAuthState;
  tenantId?: string;
  tenantName?: string;
  accountEmail?: string;
  expiresAt?: string;
  scopes: string[];
  authMode?: 'oauth' | 'local-dev';
}

export interface BillingSnapshot {
  state: BillingState;
  planName?: string;
  balanceCents?: number;
  currency?: string;
  renewsAt?: string;
  lastCheckedAt: string;
}

export interface OEMProjection {
  state: OEMState;
  brandName: string;
  productName: string;
  channel: string;
  theme: ThemeMode;
  primaryColor: string;
  logoText: string;
  updatedAt: string;
}

export interface PlatformSettings {
  version: string;
  updatedAt: string;
  locale: string;
  theme: ThemeMode;
  workspacePath: string;
  proxy: {
    enabled: boolean;
    url: string;
  };
  developerMode: boolean;
}

export interface UpdateState {
  checkedAt?: string;
  availableUpdates: Array<{
    appId: string;
    currentVersion: string;
    nextVersion: string;
    sourceKind: SourceKind;
  }>;
}

export interface UpdateActionResult {
  ok: boolean;
  state: 'idle' | 'blocked' | 'downloaded' | 'applied';
  message: string;
  updateState: UpdateState;
  event: RuntimeEvent;
}

export interface RuntimeEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  appId?: string;
  entryKey?: string;
  message: string;
  payload?: unknown;
}

export interface DiagnosticSnapshot {
  storage: {
    workspaceRoot: string;
    workspaceStateDir: string;
    userStateDir: string;
  };
  counts: {
    catalogApps: number;
    installedApps: number;
    projections: number;
    runtimeEvents: number;
  };
  hostProfile: HostProfile;
  lastEvents: RuntimeEvent[];
}

export interface PlatformBootstrap {
  hostProfile: HostProfile;
  catalog: CatalogApp[];
  installedApps: InstalledAppRecord[];
  projections: DesktopAppProjection[];
  modelSettings: ModelSettings;
  authSession: CloudSessionSnapshot;
  billingState: BillingSnapshot;
  oemProjection: OEMProjection;
  platformSettings: PlatformSettings;
  updateState: UpdateState;
  diagnostics: DiagnosticSnapshot;
  runtimeEvents: RuntimeEvent[];
}

export type PlatformChangeReason =
  | 'app-installed'
  | 'app-updated'
  | 'app-enabled'
  | 'app-disabled'
  | 'app-uninstalled'
  | 'app-launched'
  | 'settings-updated'
  | 'auth-updated'
  | 'billing-updated'
  | 'updates-checked'
  | 'runtime-event';

export interface PlatformChangeEvent {
  reason: PlatformChangeReason;
  appId?: string;
  entryKey?: string;
  timestamp: string;
  bootstrap: PlatformBootstrap;
}

export interface LaunchEntryInput {
  appId: string;
  entryKey: string;
}

export interface LaunchEntryResult {
  launched: boolean;
  appId: string;
  entryKey: string;
  readiness: ReadinessResult;
  snapshot?: HostSnapshot;
  bridgeMessage?: HostBridgeMessage<HostSnapshot>;
  runtimeEvents: RuntimeEvent[];
}

export interface UninstallAppInput {
  appId: string;
  keepData?: boolean;
}

export interface UninstallAppResult {
  ok: boolean;
  appId: string;
  status: 'removed' | 'uninstalling' | 'blocked';
  message: string;
  projectedApp?: DesktopAppProjection;
  runtimeEvents: RuntimeEvent[];
}

export interface CapabilityInvokeInput {
  appId: string;
  entryKey: string;
  capability: PlatformCapability;
  operation: string;
  input?: unknown;
}

export interface CapabilityInvokeResult {
  ok: boolean;
  requestId: string;
  output?: unknown;
  error?: {
    code: string;
    message: string;
  };
  event: RuntimeEvent;
}

export const LIME_DESKTOP_IPC = {
  platformBootstrap: 'platform:bootstrap',
  appsListCatalog: 'apps:listCatalog',
  appsListInstalled: 'apps:listInstalled',
  appsGetProjection: 'apps:getProjection',
  appsGetReadiness: 'apps:getReadiness',
  appsInstall: 'apps:install',
  appsUpdate: 'apps:update',
  appsEnable: 'apps:enable',
  appsDisable: 'apps:disable',
  appsUninstall: 'apps:uninstall',
  appsLaunchEntry: 'apps:launchEntry',
  appsInvokeCapability: 'apps:invokeCapability',
  appsGetRuntimeSnapshot: 'apps:getRuntimeSnapshot',
  settingsGetModel: 'settings:getModel',
  settingsSaveModel: 'settings:saveModel',
  settingsGetPlatform: 'settings:getPlatform',
  settingsSavePlatform: 'settings:savePlatform',
  authGetSession: 'auth:getSession',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  billingGetState: 'billing:getState',
  billingRefresh: 'billing:refresh',
  oemGetProjection: 'oem:getProjection',
  updatesCheck: 'updates:check',
  updatesDownload: 'updates:download',
  updatesApply: 'updates:apply',
  platformChanged: 'platform:changed',
} as const;

export type LimeDesktopIpcChannel = (typeof LIME_DESKTOP_IPC)[keyof typeof LIME_DESKTOP_IPC];

export interface LoginInput {
  tenantName: string;
  accountEmail: string;
}

export interface LimeDesktopApi {
  platform: {
    getBootstrap: () => Promise<PlatformBootstrap>;
    onChanged: (listener: (event: PlatformChangeEvent) => void) => () => void;
  };
  apps: {
    listCatalog: () => Promise<CatalogApp[]>;
    listInstalled: () => Promise<InstalledAppRecord[]>;
    getProjection: (appId: string) => Promise<DesktopAppProjection>;
    getReadiness: (appId: string) => Promise<ReadinessResult>;
    install: (appId: string) => Promise<DesktopAppProjection>;
    update: (appId: string) => Promise<DesktopAppProjection>;
    enable: (appId: string) => Promise<DesktopAppProjection>;
    disable: (appId: string) => Promise<DesktopAppProjection>;
    uninstall: (input: UninstallAppInput) => Promise<UninstallAppResult>;
    launchEntry: (input: LaunchEntryInput) => Promise<LaunchEntryResult>;
    invokeCapability: (input: CapabilityInvokeInput) => Promise<CapabilityInvokeResult>;
    getRuntimeSnapshot: (input: LaunchEntryInput) => Promise<HostSnapshot | undefined>;
  };
  settings: {
    getModel: () => Promise<ModelSettings>;
    saveModel: (settings: ModelSettings) => Promise<ModelSettings>;
    getPlatform: () => Promise<PlatformSettings>;
    savePlatform: (settings: PlatformSettings) => Promise<PlatformSettings>;
  };
  auth: {
    getSession: () => Promise<CloudSessionSnapshot>;
    login: (input: LoginInput) => Promise<CloudSessionSnapshot>;
    logout: () => Promise<CloudSessionSnapshot>;
  };
  billing: {
    getState: () => Promise<BillingSnapshot>;
    refresh: () => Promise<BillingSnapshot>;
  };
  oem: {
    getProjection: () => Promise<OEMProjection>;
  };
  updates: {
    check: () => Promise<UpdateState>;
    download: (appId: string) => Promise<UpdateActionResult>;
    apply: (appId: string) => Promise<UpdateActionResult>;
  };
}
