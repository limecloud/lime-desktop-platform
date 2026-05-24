export type HostKind = 'electron' | 'tauri';
export type SourceKind = 'cloud' | 'local' | 'oem';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ReadinessState = 'ready' | 'needs-setup' | 'blocked' | 'disabled';
export type BillingState = 'unknown' | 'active' | 'needs-payment' | 'suspended';
export type OAuthState = 'unauthenticated' | 'authenticated' | 'expired';
export type OEMState = 'unbranded' | 'branded' | 'customized';
export type InstallMode = 'in_lime' | 'standalone' | 'runtime_backed';
export type ControlPlaneCatalogSource = 'samples' | 'limecore';
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
  releaseArtifact?: ReleaseArtifact;
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

export interface ReleaseArtifact {
  url: string;
  sha256: string;
  sizeBytes?: number;
  fileName?: string;
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

export interface UpdateCandidate {
  appId: string;
  currentVersion: string;
  nextVersion: string;
  sourceKind: SourceKind;
  artifact?: ReleaseArtifact;
}

export interface DownloadedUpdateArtifact {
  appId: string;
  version: string;
  fileName: string;
  filePath: string;
  sha256: string;
  sizeBytes: number;
  downloadedAt: string;
  verified: boolean;
}

export interface ControlPlaneStatus {
  configured: boolean;
  source: ControlPlaneCatalogSource;
  baseUrl?: string;
  catalogUrl?: string;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface UpdateState {
  checkedAt?: string;
  availableUpdates: UpdateCandidate[];
  downloadedUpdates?: DownloadedUpdateArtifact[];
  controlPlane?: ControlPlaneStatus;
}

export interface LaunchEntryInput {
  appId: string;
  entryKey: string;
}

export interface UninstallAppInput {
  appId: string;
  keepData?: boolean;
}

export interface CapabilityInvokeInput {
  appId: string;
  entryKey: string;
  capability: PlatformCapability;
  operation: string;
  input?: unknown;
}

export type PlatformNavigationTarget =
  | 'app-center'
  | 'auth-settings'
  | 'model-settings'
  | 'branding-settings'
  | 'billing-settings'
  | 'updates'
  | 'diagnostics'
  | 'runtime';

export interface PlatformNavigationIntent {
  target: PlatformNavigationTarget;
  appId?: string;
  entryKey?: string;
  reason?: string;
}

export interface PlatformNavigationResult {
  ok: boolean;
  target: PlatformNavigationTarget;
  message: string;
  event: unknown;
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
  bootstrap: unknown;
}

export interface LimeDesktopHostApi {
  platform: {
    getBootstrap: () => Promise<unknown>;
    onChanged: (listener: (event: PlatformChangeEvent) => void) => () => void;
  };
  apps: {
    getProjection: (appId: string) => Promise<DesktopAppProjection>;
    getReadiness: (appId: string) => Promise<ReadinessResult>;
    launchEntry: (input: LaunchEntryInput) => Promise<unknown>;
    uninstall: (input: UninstallAppInput) => Promise<unknown>;
    invokeCapability: (input: CapabilityInvokeInput) => Promise<unknown>;
    getRuntimeSnapshot: (input: LaunchEntryInput) => Promise<HostSnapshot | undefined>;
  };
}

export const LIME_AGENT_APP_BRIDGE_PROTOCOL = 'lime.agentApp.bridge';
