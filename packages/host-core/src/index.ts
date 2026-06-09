import type {
  AppStorageDeleteInput,
  AppStorageDeleteResult,
  AppStorageDocument,
  AppStorageListInput,
  AppStorageListResult,
  AppStorageReadInput,
  AppStorageWriteInput,
  BillingSnapshot,
  CapabilityInvokeInput,
  CapabilityInvokeResult,
  CatalogApp,
  CloudSessionSnapshot,
  DesktopAppProjection,
  HostProfile,
  HostSnapshot,
  InstalledAppRecord,
  LaunchEntryInput,
  LaunchEntryResult,
  LoginInput,
  ModelSettings,
  OEMProjection,
  PlatformBootstrap,
  PlatformChangeEvent,
  PlatformChangeReason,
  PlatformNavigationIntent,
  PlatformNavigationResult,
  PlatformSettings,
  ProductAppSettingsReadInput,
  ProductAppSettingsRecord,
  ProductAppSettingsWriteInput,
  ReadinessResult,
  RuntimeEvent,
  UninstallAppInput,
  UninstallAppResult,
  UpdateActionResult,
  UpdateState,
} from '@limecloud/desktop-platform-contracts';

export type HostSnapshotSource = 'host-bridge' | 'runtime-projection' | 'dev-projection';

export interface ProductAppHostProjection {
  appId: string;
  entryKey: string;
  snapshot: HostSnapshot;
  source: HostSnapshotSource;
  runtimeEvents: RuntimeEvent[];
}

export interface PlatformHostCoreChangeContext {
  appId?: string;
  entryKey?: string;
}

export interface PlatformHostCoreChangeInput extends PlatformHostCoreChangeContext {
  reason: PlatformChangeReason;
  bootstrap: PlatformBootstrap;
  timestamp?: string;
}

export type PlatformHostCoreChangeListener = (event: PlatformChangeEvent) => void;

export interface PlatformHostCoreSubscription {
  unsubscribe: () => void;
}

export interface PlatformHostCore {
  getBootstrap(): Promise<PlatformBootstrap>;
  listCatalog(): Promise<CatalogApp[]>;
  listInstalled(): InstalledAppRecord[];
  getProjection(appId: string): Promise<DesktopAppProjection>;
  getReadiness(appId: string): Promise<ReadinessResult>;
  installApp(appId: string, options?: { packageHash?: string }): Promise<DesktopAppProjection>;
  updateApp(appId: string): Promise<DesktopAppProjection>;
  enableApp(appId: string): Promise<DesktopAppProjection>;
  disableApp(appId: string): Promise<DesktopAppProjection>;
  uninstallApp(input: UninstallAppInput): Promise<UninstallAppResult>;
  launchEntry(input: LaunchEntryInput): Promise<LaunchEntryResult>;
  invokeCapability(input: CapabilityInvokeInput): CapabilityInvokeResult | Promise<CapabilityInvokeResult>;
  getRuntimeSnapshot(input: LaunchEntryInput): HostSnapshot | undefined;
  getModelSettings(): ModelSettings;
  saveModelSettings(settings: ModelSettings): Promise<ModelSettings> | ModelSettings;
  getPlatformSettings(): PlatformSettings;
  savePlatformSettings(settings: PlatformSettings): PlatformSettings;
  readProductAppSettings(input: ProductAppSettingsReadInput): ProductAppSettingsRecord;
  writeProductAppSettings(input: ProductAppSettingsWriteInput): ProductAppSettingsRecord;
  readAppStorage(input: AppStorageReadInput): AppStorageDocument;
  writeAppStorage(input: AppStorageWriteInput): AppStorageDocument;
  listAppStorage(input: AppStorageListInput): AppStorageListResult;
  deleteAppStorage(input: AppStorageDeleteInput): AppStorageDeleteResult;
  getAuthSession(): CloudSessionSnapshot;
  login(input: LoginInput): Promise<CloudSessionSnapshot> | CloudSessionSnapshot;
  logout(): CloudSessionSnapshot;
  getBillingState(): BillingSnapshot;
  refreshBilling(): Promise<BillingSnapshot> | BillingSnapshot;
  getOEMProjection(): OEMProjection;
  checkUpdates(): Promise<UpdateState> | UpdateState;
  downloadUpdate(appId: string): Promise<UpdateActionResult>;
  applyUpdate(appId: string): Promise<UpdateActionResult>;
  subscribe?(listener: PlatformHostCoreChangeListener): PlatformHostCoreSubscription;
}

export interface PlatformHostCoreAdapter {
  hostKind: HostProfile['hostKind'];
  createHost(options: PlatformHostCoreAdapterOptions): PlatformHostCore | Promise<PlatformHostCore>;
}

export interface PlatformHostCoreAdapterOptions {
  appId: string;
  entryKey?: string;
  workspacePath?: string;
  locale?: string;
  theme?: HostProfile['theme'];
  hostVersion: string;
}

export function createReadiness(
  state: ReadinessResult['state'],
  code: string,
  message: string,
  options: { fixable?: boolean; setupActions?: string[] } = {},
): ReadinessResult {
  return {
    state,
    reasons: [
      {
        code,
        message,
        fixable: options.fixable ?? state === 'needs-setup',
      },
    ],
    setupActions: options.setupActions ?? [],
  };
}

export function createBlockedReadiness(
  code: string,
  message: string,
  setupActions: string[] = [],
): ReadinessResult {
  return createReadiness('blocked', code, message, { fixable: false, setupActions });
}

export function createNeedsSetupReadiness(
  code: string,
  message: string,
  setupActions: string[] = [],
): ReadinessResult {
  return createReadiness('needs-setup', code, message, { fixable: true, setupActions });
}

export function createPlatformChangeEvent(input: PlatformHostCoreChangeInput): PlatformChangeEvent {
  return {
    reason: input.reason,
    appId: input.appId,
    entryKey: input.entryKey,
    timestamp: input.timestamp ?? new Date().toISOString(),
    bootstrap: input.bootstrap,
  };
}

export function isProjectedHostSource(source: HostSnapshotSource): boolean {
  return source === 'host-bridge' || source === 'runtime-projection';
}
