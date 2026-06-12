export type HostKind = 'electron' | 'tauri';
export type SourceKind = 'cloud' | 'local' | 'oem';
export type ThemeMode = 'light' | 'dark' | 'system';
export type PlatformColorTheme =
  | 'emerald'
  | 'ocean'
  | 'vintage'
  | 'neon'
  | 'lime'
  | 'dusk'
  | 'minimal'
  | 'vibrant'
  | 'nature'
  | 'arts'
  | 'luxury';
export type ReadinessState = 'ready' | 'needs-setup' | 'blocked' | 'disabled';
export type BillingState = 'unknown' | 'active' | 'needs-payment' | 'suspended';
export type OAuthState = 'unauthenticated' | 'authenticated' | 'expired';
export type OEMState = 'unbranded' | 'branded' | 'customized';
export type InstallMode = 'in_lime' | 'standalone' | 'runtime_backed';
export type ControlPlaneCatalogSource = 'samples' | 'limecore';
export type ControlPlaneProjectionSource = 'local-dev' | 'limecore';
export type UpdateTargetKind = 'agentapp-package';

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
  | 'lime.settings'
  | 'lime.download'
  | 'lime.permissions'
  | 'lime.diagnostics'
  | 'lime.storage'
  | 'lime.agent'
  | 'lime.agentExecution';

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
  appearance?: PlatformAppearanceSettings;
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
  appearance?: PlatformAppearanceSettings;
  workspacePath?: string;
  modelSettingsVersion?: string;
  modelSettings?: ModelSettingsSnapshot;
  oauthState?: OAuthState;
  tenantName?: string;
  accountEmail?: string;
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

export interface RuntimeBridgeDiscoveryDescriptor {
  protocol: 'lime.runtimeBridge.discovery';
  version: 1;
  endpoint: string;
  token: string;
  hostKind: HostKind;
  hostVersion: string;
  publishedAt: string;
  expiresAt: string;
}

export interface ReferenceRuntimeDescriptor {
  projectRootEnv?: string;
  relativeProjectRoot?: string;
  mainEntry?: string;
  remoteDebuggingPortEnv?: string;
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
  referenceRuntime?: ReferenceRuntimeDescriptor;
  /**
   * @deprecated Compat alias for early smoke fixtures. New catalog metadata must use referenceRuntime.
   */
  devRuntime?: ReferenceRuntimeDescriptor;
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
  /**
   * 只允许作为 settings.saveModel 的临时输入，由 Desktop Host 转交 App Server provider key 控制面。
   * 宿主持久化 ModelSettings、Host Snapshot、runtimeContext 和 Product App projection 时必须剔除。
   */
  apiKey?: string;
  authType?: 'api-key' | 'oauth' | 'none';
  baseUrl?: string;
  useResponsesApi?: boolean;
  models: string[];
}

export interface ModelSettings {
  version: string;
  updatedAt: string;
  defaultAgentProviderId?: string;
  defaultTextModelId?: string;
  defaultImageModelId?: string;
  defaultVideoModelId?: string;
  providers: ModelProviderConfig[];
}

export interface ModelProviderSnapshot {
  id: string;
  displayName: string;
  protocol: ModelProtocol;
  capabilityKinds: ModelCapabilityKind[];
  enabled: boolean;
  apiKeyConfigured: boolean;
  authType?: ModelProviderConfig['authType'];
  baseUrl?: string;
  useResponsesApi?: boolean;
  models: string[];
}

export interface ModelSettingsSnapshot {
  version: string;
  updatedAt?: string;
  defaultAgentProviderId?: string;
  defaultTextModelId?: string;
  defaultImageModelId?: string;
  defaultVideoModelId?: string;
  /**
   * 面向 Product App 的非敏感 Provider metadata。不得包含 apiKey、token、secret 或 credential payload。
   */
  providers: ModelProviderSnapshot[];
}

export type ModelProviderCredentialStorageKind = 'none' | 'local-encrypted-file' | 'app-server-provider-store';
export type ModelProviderCredentialRuntimeStatus =
  | 'not-required'
  | 'missing'
  | 'rotation-required'
  | 'broker-reference-only'
  | 'app-server-provider-ready'
  | 'resolver-ready';

export type ModelProviderAppServerSyncStatus = 'synced' | 'failed' | 'unsupported';

export interface ModelProviderAppServerSyncRecord {
  desktopProviderId: string;
  status: ModelProviderAppServerSyncStatus;
  appServerProviderId?: string;
  appServerProviderType?: string;
  appServerProviderName?: string;
  apiHost?: string;
  settingsVersion?: string;
  syncedAt?: string;
  credentialSyncedAt?: string;
  lastError?: string;
  plaintextSecrets: false;
}

export interface ModelProviderCredentialState {
  providerId: string;
  authType: NonNullable<ModelProviderConfig['authType']>;
  configured: boolean;
  storageKind: ModelProviderCredentialStorageKind;
  keychainBacked: boolean;
  updatedAt?: string;
  expiresAt?: string;
  rotationRequired: boolean;
  runtimeStatus: ModelProviderCredentialRuntimeStatus;
  appServerProviderId?: string;
  appServerProviderType?: string;
  appServerSyncStatus?: ModelProviderAppServerSyncStatus;
  appServerSyncedAt?: string;
  appServerCredentialSyncedAt?: string;
  appServerSyncError?: string;
  plaintextSecrets: false;
}

export interface CloudSessionSnapshot {
  state: OAuthState;
  tenantId?: string;
  tenantName?: string;
  accountEmail?: string;
  expiresAt?: string;
  scopes: string[];
  authMode?: 'oauth' | 'local-dev';
  source?: ControlPlaneProjectionSource;
}

export interface BillingSnapshot {
  state: BillingState;
  planName?: string;
  balanceCents?: number;
  currency?: string;
  renewsAt?: string;
  lastCheckedAt: string;
  source?: ControlPlaneProjectionSource;
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
  source?: ControlPlaneProjectionSource;
}

export interface PlatformAppearanceSettings {
  colorTheme: PlatformColorTheme;
  fontScale: number;
  serifEnabled: boolean;
}

export interface PlatformSettings {
  version: string;
  updatedAt: string;
  locale: string;
  theme: ThemeMode;
  appearance: PlatformAppearanceSettings;
  workspacePath: string;
  proxy: {
    enabled: boolean;
    url: string;
  };
  developerMode: boolean;
  general: {
    notificationsEnabled: boolean;
    reduceMotion: boolean;
    syncLocalAgentHistory: boolean;
    quickWindowShortcutEnabled: boolean;
    commandWhitelistEnabled: boolean;
    permissionMode: 'auto-approve' | 'safe';
    thinkingMode: 'auto' | 'off' | 'low' | 'medium' | 'high' | 'max';
    showToolCalls: boolean;
    expandToolCallsByDefault: boolean;
  };
}

export type ProductAppSettingsScope = 'user' | 'workspace';

export interface ProductAppSettingsRecord<TValue = Record<string, unknown>> {
  appId: string;
  namespace: string;
  scope: ProductAppSettingsScope;
  version: string;
  updatedAt: string;
  value: TValue;
}

export interface ProductAppSettingsReadInput {
  appId: string;
  namespace: string;
  scope?: ProductAppSettingsScope;
}

export interface ProductAppSettingsWriteInput<TValue = Record<string, unknown>> extends ProductAppSettingsReadInput {
  value: TValue;
}

export type AppStorageScope = 'workspace';

export interface AppStorageDocument<TValue = Record<string, unknown>> {
  appId: string;
  namespace: string;
  scope: AppStorageScope;
  documentId: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  value: TValue;
}

export interface AppStorageReadInput {
  appId: string;
  namespace: string;
  documentId: string;
  scope?: AppStorageScope;
}

export interface AppStorageWriteInput<TValue = Record<string, unknown>> extends AppStorageReadInput {
  value: TValue;
}

export interface AppStorageListInput {
  appId: string;
  namespace: string;
  scope?: AppStorageScope;
}

export interface AppStorageDeleteInput extends AppStorageReadInput {}

export interface AppStorageListResult {
  appId: string;
  namespace: string;
  scope: AppStorageScope;
  documents: Array<{
    documentId: string;
    version: string;
    updatedAt: string;
  }>;
}

export interface AppStorageDeleteResult {
  appId: string;
  namespace: string;
  scope: AppStorageScope;
  documentId: string;
  deleted: boolean;
}

export type AppStorageOperation = 'read' | 'write' | 'list' | 'delete';

export interface UpdateState {
  checkedAt?: string;
  availableUpdates: UpdateCandidate[];
  downloadedUpdates?: DownloadedUpdateArtifact[];
  controlPlane?: ControlPlaneStatus;
}

export interface UpdateActionResult {
  ok: boolean;
  state: 'idle' | 'blocked' | 'downloaded' | 'applied';
  message: string;
  updateState: UpdateState;
  event: RuntimeEvent;
}

export interface UpdateCandidate {
  targetKind: UpdateTargetKind;
  appId: string;
  currentVersion: string;
  nextVersion: string;
  sourceKind: SourceKind;
  artifact?: ReleaseArtifact;
}

export interface DownloadedUpdateArtifact {
  targetKind: UpdateTargetKind;
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
  sessionUrl?: string;
  billingUrl?: string;
  oemUrl?: string;
  lastSyncedAt?: string;
  lastError?: string;
  sessionLastSyncedAt?: string;
  sessionLastError?: string;
  billingLastSyncedAt?: string;
  billingLastError?: string;
  oemLastSyncedAt?: string;
  oemLastError?: string;
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

export type AgentRuntimeBridgeKind = 'app-server-json-rpc';
export type AgentRuntimeBridgeTransport = 'host-mediated';
export type AgentRuntimeState = 'ready' | 'needs-setup' | 'blocked' | 'started' | 'completed' | 'failed' | 'canceled';
export type AppServerJsonRpcMethod =
  | 'initialize'
  | 'initialized'
  | 'agentSession/start'
  | 'agentSession/read'
  | 'agentSession/turn/start'
  | 'agentSession/turn/cancel'
  | 'agentSession/action/respond'
  | 'capability/list'
  | 'artifact/read'
  | 'evidence/export'
  | 'agentSession/event'
  | 'modelProvider/list'
  | 'modelProvider/read'
  | 'modelProvider/create'
  | 'modelProvider/update'
  | 'modelProviderKey/create';

export type AgentRuntimeEventType =
  | 'started'
  | 'artifact.snapshot'
  | 'message.delta'
  | 'tool.call'
  | 'tool.result'
  | 'action.required'
  | 'needs-setup'
  | 'blocked'
  | 'turn.completed'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface AgentRuntimeBridgeProfile {
  kind: AgentRuntimeBridgeKind;
  transport: AgentRuntimeBridgeTransport;
  hostBoundary: 'desktop-host-ipc';
  runtimeOwner: 'runtime-core';
  protocolVersion: 'appserver.v0';
  methods: {
    initialize: 'initialize';
    initialized: 'initialized';
    startSession: 'agentSession/start';
    readSession: 'agentSession/read';
    startTurn: 'agentSession/turn/start';
    cancelTurn: 'agentSession/turn/cancel';
    respondAction: 'agentSession/action/respond';
    listCapabilities: 'capability/list';
    readArtifact: 'artifact/read';
    exportEvidence: 'evidence/export';
    events: 'agentSession/event';
  };
  events: {
    notification: 'agentSession/event';
    allowUiSynthesis: false;
  };
}

export type AgentRuntimeContextSource = 'desktop-platform-model-settings';

export interface AgentRuntimeCredentialRef {
  kind: 'model-provider';
  providerId: string;
  authType: NonNullable<ModelProviderConfig['authType']>;
  /**
   * current live resolver 是 App Server provider store。
   * desktop-host-credential-broker 仅用于旧 key 迁移或未完成 App Server provisioning 的 fail-closed 诊断。
   */
  resolver: 'desktop-host-credential-broker' | 'app-server-provider-store';
  configured: boolean;
  storageKind: ModelProviderCredentialStorageKind;
  keychainBacked: boolean;
  updatedAt?: string;
  expiresAt?: string;
  rotationRequired: boolean;
  runtimeStatus: ModelProviderCredentialRuntimeStatus;
  productionInjectionReady: boolean;
}

export interface AgentRuntimeProviderProfile {
  id: string;
  appServerProviderId?: string;
  protocol: ModelProtocol;
  authType: NonNullable<ModelProviderConfig['authType']>;
  baseUrl?: string;
  useResponsesApi?: boolean;
  capabilityKinds: ModelCapabilityKind[];
  credentialConfigured: boolean;
  credentialRef?: AgentRuntimeCredentialRef;
}

export interface AgentRuntimeModelProfile {
  settingsVersion: string;
  provider: AgentRuntimeProviderProfile;
  modelId: string;
  requestedModelId?: string;
  capability: 'text' | 'agent' | 'vision';
}

export interface AgentRuntimeContext {
  protocol: 'appserver.runtimeContext';
  version: 1;
  source: AgentRuntimeContextSource;
  modelProfile?: AgentRuntimeModelProfile;
  permissionMode: 'safe' | 'ask' | 'allow-all';
  credentialPolicy: {
    handoff: 'credential-ref-only';
    plaintextSecrets: false;
    /**
     * current live resolver 是 App Server provider store。
     * desktop-host-credential-broker 仅用于旧 key 迁移或未完成 App Server provisioning 的 fail-closed 诊断。
     */
    resolver: 'desktop-host-credential-broker' | 'app-server-provider-store';
    runtimeStatus: ModelProviderCredentialRuntimeStatus;
    productionInjectionReady: boolean;
  };
}

export interface AppServerRuntimeHostOptions {
  desktopPlatformRuntimeContext: AgentRuntimeContext;
}

export interface AppServerRuntimeOptionsMetadata {
  workflowId?: string;
  productCapabilityId?: string;
  requestedModelId?: string;
  permissionMode?: 'safe' | 'ask' | 'allow-all';
}

export interface AppServerRuntimeOptionsProjection {
  capabilityId?: string;
  stream: true;
  providerPreference?: string;
  modelPreference?: string;
  metadata?: AppServerRuntimeOptionsMetadata;
  hostOptions: AppServerRuntimeHostOptions;
}

export interface AgentRuntimeAttachment {
  kind: 'text' | 'image' | 'file';
  ref: string;
  mimeType?: string;
}

export interface AgentRuntimeRequest {
  appId: string;
  entryKey: string;
  agentAppId?: string;
  taskId?: string;
  prompt: string;
  attachments?: AgentRuntimeAttachment[];
  runtimeOptions?: {
    capabilityId?: string;
    workflowId?: string;
    modelId?: string;
    permissionMode?: 'safe' | 'ask' | 'allow-all';
  };
  modelPolicy?: {
    preferredModelId?: string;
    capability: 'text' | 'agent' | 'vision';
  };
  runtimeContext?: AgentRuntimeContext;
  toolPolicy?: {
    allowedToolIds?: string[];
    permissionMode?: 'safe' | 'ask' | 'allow-all';
  };
}

export interface AgentRuntimeEvent {
  sessionId: string;
  threadId?: string;
  turnId?: string;
  sequence: number;
  type: AgentRuntimeEventType;
  method?: AppServerJsonRpcMethod;
  payload: unknown;
  evidence?: Array<{
    label: string;
    ref: string;
  }>;
}

export interface AppServerAgentSession {
  sessionId: string;
  threadId: string;
  appId: string;
  workspaceId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppServerAgentTurn {
  turnId: string;
  sessionId: string;
  threadId: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentRuntimeResult {
  ok: boolean;
  state: AgentRuntimeState;
  sessionId: string;
  threadId?: string;
  turnId?: string;
  bridge: AgentRuntimeBridgeKind;
  message: string;
  readiness: ReadinessResult;
  request: AgentRuntimeRequest;
  runtimeContext: AgentRuntimeContext;
  bridgeProfile: AgentRuntimeBridgeProfile;
  events: AgentRuntimeEvent[];
  appServer?: {
    session?: AppServerAgentSession;
    turn?: AppServerAgentTurn;
  };
}

export type AppServerRuntimeClientState = 'connected' | 'not-configured' | 'disconnected';

export interface AppServerRuntimeDiagnostics {
  state: AgentRuntimeState;
  currentCapability: 'lime.agent';
  compatCapabilities: ['lime.agentExecution'];
  bridgeProfile: AgentRuntimeBridgeProfile;
  readiness: ReadinessResult;
  runtimeContext: AgentRuntimeContext;
  modelProvider: {
    defaultProviderId?: string;
    defaultTextModelId?: string;
    enabledProviders: Array<{
      id: string;
      displayName: string;
      protocol: ModelProtocol;
      authType?: ModelProviderConfig['authType'];
      apiKeyConfigured: boolean;
      credentialState: ModelProviderCredentialState;
      appServerProviderId?: string;
      appServerSyncStatus?: ModelProviderAppServerSyncStatus;
      useResponsesApi?: boolean;
      models: string[];
    }>;
  };
  client: {
    connected: boolean;
    state: AppServerRuntimeClientState;
    transport: 'stdio';
    hostBoundary: 'desktop-host-ipc';
  };
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
  controlPlane: ControlPlaneStatus;
  appServerRuntime: AppServerRuntimeDiagnostics;
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
  settingsReadProductApp: 'settings:readProductApp',
  settingsWriteProductApp: 'settings:writeProductApp',
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
    readProductAppSettings: (input: ProductAppSettingsReadInput) => Promise<ProductAppSettingsRecord>;
    writeProductAppSettings: (input: ProductAppSettingsWriteInput) => Promise<ProductAppSettingsRecord>;
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
