import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type {
  AppStorageDeleteInput,
  AppStorageDeleteResult,
  AppStorageDocument,
  AppStorageListInput,
  AppStorageListResult,
  AppStorageReadInput,
  AppStorageScope,
  AppStorageWriteInput,
  BillingSnapshot,
  CloudSessionSnapshot,
  DesktopAppProjection,
  HostSnapshot,
  InstalledAppRecord,
  ModelProviderAppServerSyncRecord,
  ModelSettings,
  OEMProjection,
  PlatformSettings,
  ProductAppSettingsReadInput,
  ProductAppSettingsRecord,
  ProductAppSettingsScope,
  ProductAppSettingsWriteInput,
  RuntimeEvent,
  UpdateState,
} from '../../shared/types';

export interface PlatformStorePaths {
  workspaceRoot: string;
  workspaceStateDir: string;
  userStateDir: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, value: T): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function validateStoreSegment(kind: 'appId' | 'namespace' | 'documentId', value: string): string {
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(normalized) || normalized.includes('..')) {
    throw new Error(
      `Product App store ${kind} 必须是 1-128 位字母、数字、点、下划线或短横线，并且不能包含连续点。`,
    );
  }
  return normalized;
}

function validateAppStorageNamespace(namespace: string): string {
  const safeNamespace = validateStoreSegment('namespace', namespace);
  if (/secret|credential|token|apikey|api-key|oauth/i.test(safeNamespace)) {
    throw new Error('App storage 不能保存凭证、token、API Key 或 OAuth 数据；这些数据必须走 Credential Broker。');
  }
  return safeNamespace;
}

function validateAppStorageDocumentId(documentId: string): string {
  const safeDocumentId = validateStoreSegment('documentId', documentId);
  if (/secret|credential|token|apikey|api-key|oauth|password|private-key|client-secret/i.test(safeDocumentId)) {
    throw new Error('App storage documentId 不能表达凭证、token、API Key 或 OAuth 数据；这些数据必须走 Credential Broker。');
  }
  return safeDocumentId;
}

function validateProductAppSettingsNamespace(namespace: string): string {
  const safeNamespace = validateStoreSegment('namespace', namespace);
  if (/secret|credential|token|apikey|api-key|oauth/i.test(safeNamespace)) {
    throw new Error('Product App settings 不能保存凭证、token、API Key 或 OAuth 数据；这些数据必须走 Credential Broker。');
  }
  return safeNamespace;
}

function assertNoSensitiveStoreValue(surface: 'Product App settings' | 'App storage', value: unknown, path = 'value'): void {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveStoreValue(surface, item, `${path}[${index}]`));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveSettingsKey(key)) {
      throw new Error(`${surface} ${path}.${key} 不能保存凭证、token、API Key 或 OAuth 数据；这些数据必须走 Credential Broker。`);
    }
    assertNoSensitiveStoreValue(surface, nestedValue, `${path}.${key}`);
  }
}

function isSensitiveSettingsKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) {
    return false;
  }

  return (
    [
      'apikey',
      'accesstoken',
      'refreshtoken',
      'idtoken',
      'authtoken',
      'bearertoken',
      'credential',
      'credentials',
      'oauth',
      'secret',
      'secrets',
      'password',
      'privatekey',
      'clientsecret',
    ].includes(normalized) ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized.endsWith('secret')
  );
}

function assertWorkspaceStorageScope(scope: AppStorageScope | undefined): AppStorageScope {
  if (scope && scope !== 'workspace') {
    throw new Error('当前 App storage 最小实现只支持 workspace scope。');
  }
  return 'workspace';
}

export class PlatformStore {
  private paths: PlatformStorePaths;

  constructor() {
    const userStateDir = join(app.getPath('userData'), 'state');
    mkdirSync(userStateDir, { recursive: true });

    const platformSettings = readJson<PlatformSettings>(
      join(userStateDir, 'platform-settings.json'),
      this.createDefaultPlatformSettings(join(app.getPath('userData'), 'workspace')),
    );

    this.paths = this.createPaths(userStateDir, platformSettings.workspacePath);
    this.ensureDirectories();
  }

  getPaths(): PlatformStorePaths {
    return this.paths;
  }

  getAppArtifactsDir(): string {
    return join(this.paths.workspaceStateDir, 'app-artifacts');
  }

  getCredentialBrokerDir(): string {
    return join(this.paths.userStateDir, 'credential-broker');
  }

  readInstalledApps(): InstalledAppRecord[] {
    return readJson<InstalledAppRecord[]>(join(this.paths.workspaceStateDir, 'installed-apps.json'), []);
  }

  writeInstalledApps(records: InstalledAppRecord[]): void {
    writeJson(join(this.paths.workspaceStateDir, 'installed-apps.json'), records);
  }

  readProjections(): DesktopAppProjection[] {
    return readJson<DesktopAppProjection[]>(join(this.paths.workspaceStateDir, 'app-projections.json'), []);
  }

  writeProjections(projections: DesktopAppProjection[]): void {
    writeJson(join(this.paths.workspaceStateDir, 'app-projections.json'), projections);
  }

  readRuntimeSnapshots(): Record<string, HostSnapshot> {
    return readJson<Record<string, HostSnapshot>>(join(this.paths.workspaceStateDir, 'runtime-snapshots.json'), {});
  }

  writeRuntimeSnapshots(snapshots: Record<string, HostSnapshot>): void {
    writeJson(join(this.paths.workspaceStateDir, 'runtime-snapshots.json'), snapshots);
  }

  removeRuntimeSnapshotsForApp(appId: string): void {
    const snapshots = this.readRuntimeSnapshots();
    const nextSnapshots = Object.fromEntries(
      Object.entries(snapshots).filter(([key, snapshot]) => snapshot.appId !== appId && !key.startsWith(`${appId}:`)),
    );
    this.writeRuntimeSnapshots(nextSnapshots);
  }

  readRuntimeEvents(): RuntimeEvent[] {
    return readJson<RuntimeEvent[]>(join(this.paths.workspaceStateDir, 'runtime-events.json'), []);
  }

  writeRuntimeEvents(events: RuntimeEvent[]): void {
    writeJson(join(this.paths.workspaceStateDir, 'runtime-events.json'), events.slice(-200));
  }

  readModelSettings(): ModelSettings {
    return readJson<ModelSettings>(join(this.paths.userStateDir, 'model-settings.json'), this.createDefaultModelSettings());
  }

  writeModelSettings(settings: ModelSettings): void {
    writeJson(join(this.paths.userStateDir, 'model-settings.json'), settings);
  }

  readModelProviderAppServerSyncRecords(): Record<string, ModelProviderAppServerSyncRecord> {
    return readJson<Record<string, ModelProviderAppServerSyncRecord>>(
      join(this.paths.userStateDir, 'model-provider-app-server-sync.json'),
      {},
    );
  }

  writeModelProviderAppServerSyncRecords(records: Record<string, ModelProviderAppServerSyncRecord>): void {
    writeJson(join(this.paths.userStateDir, 'model-provider-app-server-sync.json'), records);
  }

  readAuthSession(): CloudSessionSnapshot {
    return readJson<CloudSessionSnapshot>(join(this.paths.userStateDir, 'auth-session.json'), {
      state: 'unauthenticated',
      scopes: [],
    });
  }

  writeAuthSession(session: CloudSessionSnapshot): void {
    writeJson(join(this.paths.userStateDir, 'auth-session.json'), session);
  }

  readBillingState(): BillingSnapshot {
    return readJson<BillingSnapshot>(join(this.paths.userStateDir, 'billing-state.json'), {
      state: 'unknown',
      currency: 'CNY',
      lastCheckedAt: nowIso(),
    });
  }

  writeBillingState(snapshot: BillingSnapshot): void {
    writeJson(join(this.paths.userStateDir, 'billing-state.json'), snapshot);
  }

  readOEMProjection(): OEMProjection {
    return readJson<OEMProjection>(join(this.paths.userStateDir, 'oem-projection.json'), {
      state: 'branded',
      brandName: 'Lime Cloud',
      productName: 'Lime Desktop Platform',
      channel: 'internal',
      theme: 'system',
      primaryColor: '#2563eb',
      logoText: 'Lime',
      updatedAt: nowIso(),
    });
  }

  writeOEMProjection(projection: OEMProjection): void {
    writeJson(join(this.paths.userStateDir, 'oem-projection.json'), projection);
  }

  readPlatformSettings(): PlatformSettings {
    return readJson<PlatformSettings>(
      join(this.paths.userStateDir, 'platform-settings.json'),
      this.createDefaultPlatformSettings(this.paths.workspaceRoot),
    );
  }

  writePlatformSettings(settings: PlatformSettings): void {
    writeJson(join(this.paths.userStateDir, 'platform-settings.json'), settings);

    if (settings.workspacePath !== this.paths.workspaceRoot) {
      this.paths = this.createPaths(this.paths.userStateDir, settings.workspacePath);
      this.ensureDirectories();
    }
  }

  readProductAppSettings(input: ProductAppSettingsReadInput): ProductAppSettingsRecord {
    const scope = input.scope ?? 'workspace';
    return readJson<ProductAppSettingsRecord>(
      this.getProductAppSettingsPath(input.appId, input.namespace, scope),
      this.createDefaultProductAppSettings(input.appId, input.namespace, scope),
    );
  }

  writeProductAppSettings(input: ProductAppSettingsWriteInput): ProductAppSettingsRecord {
    const scope = input.scope ?? 'workspace';
    assertNoSensitiveStoreValue('Product App settings', input.value);
    const current = this.readProductAppSettings({ ...input, scope });
    const nextRecord: ProductAppSettingsRecord = {
      appId: input.appId,
      namespace: input.namespace,
      scope,
      version: String(Number(current.version || '0') + 1),
      updatedAt: nowIso(),
      value: input.value,
    };
    writeJson(this.getProductAppSettingsPath(input.appId, input.namespace, scope), nextRecord);
    return nextRecord;
  }

  readAppStorageDocument(input: AppStorageReadInput): AppStorageDocument {
    const scope = assertWorkspaceStorageScope(input.scope);
    const filePath = this.getAppStorageDocumentPath(input.appId, input.namespace, input.documentId, scope);
    return readJson<AppStorageDocument>(
      filePath,
      this.createDefaultAppStorageDocument(input.appId, input.namespace, input.documentId, scope),
    );
  }

  writeAppStorageDocument(input: AppStorageWriteInput): AppStorageDocument {
    const scope = assertWorkspaceStorageScope(input.scope);
    assertNoSensitiveStoreValue('App storage', input.value);
    const current = this.readAppStorageDocument({ ...input, scope });
    const timestamp = nowIso();
    const nextDocument: AppStorageDocument = {
      appId: input.appId,
      namespace: input.namespace,
      scope,
      documentId: input.documentId,
      version: String(Number(current.version || '0') + 1),
      createdAt: current.version === '0' ? timestamp : current.createdAt,
      updatedAt: timestamp,
      value: input.value,
    };
    writeJson(this.getAppStorageDocumentPath(input.appId, input.namespace, input.documentId, scope), nextDocument);
    return nextDocument;
  }

  listAppStorageDocuments(input: AppStorageListInput): AppStorageListResult {
    const scope = assertWorkspaceStorageScope(input.scope);
    const namespaceDir = this.getAppStorageNamespaceDir(input.appId, input.namespace, scope);
    const documents = existsSync(namespaceDir)
      ? readdirSync(namespaceDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
          .map((entry) => {
            const document = readJson<AppStorageDocument>(
              join(namespaceDir, entry.name),
              this.createDefaultAppStorageDocument(input.appId, input.namespace, entry.name.replace(/\.json$/, ''), scope),
            );
            return {
              documentId: document.documentId,
              version: document.version,
              updatedAt: document.updatedAt,
            };
          })
          .sort((left, right) => left.documentId.localeCompare(right.documentId))
      : [];

    return {
      appId: input.appId,
      namespace: input.namespace,
      scope,
      documents,
    };
  }

  deleteAppStorageDocument(input: AppStorageDeleteInput): AppStorageDeleteResult {
    const scope = assertWorkspaceStorageScope(input.scope);
    const filePath = this.getAppStorageDocumentPath(input.appId, input.namespace, input.documentId, scope);
    const deleted = existsSync(filePath);
    if (deleted) {
      rmSync(filePath, { force: true });
    }
    return {
      appId: input.appId,
      namespace: input.namespace,
      scope,
      documentId: input.documentId,
      deleted,
    };
  }

  readUpdateState(): UpdateState {
    return readJson<UpdateState>(join(this.paths.userStateDir, 'update-state.json'), {
      availableUpdates: [],
    });
  }

  writeUpdateState(state: UpdateState): void {
    writeJson(join(this.paths.userStateDir, 'update-state.json'), state);
  }

  createDefaultModelSettings(): ModelSettings {
    return {
      version: '1',
      updatedAt: nowIso(),
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        {
          id: 'openai-compatible',
          displayName: 'OpenAI Compatible',
          protocol: 'openai-compatible',
          capabilityKinds: ['text', 'image'],
          enabled: true,
          apiKeyConfigured: false,
          authType: 'api-key',
          useResponsesApi: true,
          models: ['gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
        },
        {
          id: 'anthropic-compatible',
          displayName: 'Anthropic Compatible',
          protocol: 'anthropic-compatible',
          capabilityKinds: ['text'],
          enabled: false,
          apiKeyConfigured: false,
          authType: 'api-key',
          models: ['claude-sonnet-4-5', 'claude-opus-4-1'],
        },
        {
          id: 'local',
          displayName: 'Local Runtime',
          protocol: 'local',
          capabilityKinds: ['text'],
          enabled: false,
          apiKeyConfigured: true,
          authType: 'none',
          models: ['local-default'],
        },
      ],
    };
  }

  private createPaths(userStateDir: string, workspaceRoot: string): PlatformStorePaths {
    return {
      workspaceRoot,
      workspaceStateDir: join(workspaceRoot, '.lime-desktop'),
      userStateDir,
    };
  }

  private ensureDirectories(): void {
    mkdirSync(this.paths.workspaceRoot, { recursive: true });
    mkdirSync(this.paths.workspaceStateDir, { recursive: true });
    mkdirSync(join(this.paths.workspaceStateDir, 'app-artifacts'), { recursive: true });
    mkdirSync(join(this.paths.workspaceStateDir, 'app-storage'), { recursive: true });
    mkdirSync(join(this.paths.workspaceStateDir, 'product-settings'), { recursive: true });
    mkdirSync(this.paths.userStateDir, { recursive: true });
    mkdirSync(join(this.paths.userStateDir, 'credential-broker'), { recursive: true });
    mkdirSync(join(this.paths.userStateDir, 'product-settings'), { recursive: true });
  }

  private createDefaultPlatformSettings(workspacePath: string): PlatformSettings {
    return {
      version: '1',
      updatedAt: nowIso(),
      locale: 'zh-CN',
      theme: 'system',
      workspacePath,
      proxy: {
        enabled: false,
        url: '',
      },
      developerMode: true,
    };
  }

  private createDefaultProductAppSettings(
    appId: string,
    namespace: string,
    scope: ProductAppSettingsScope,
  ): ProductAppSettingsRecord {
    return {
      appId,
      namespace,
      scope,
      version: '0',
      updatedAt: nowIso(),
      value: {},
    };
  }

  private getProductAppSettingsPath(appId: string, namespace: string, scope: ProductAppSettingsScope): string {
    const root = scope === 'user' ? this.paths.userStateDir : this.paths.workspaceStateDir;
    const safeAppId = validateStoreSegment('appId', appId);
    const safeNamespace = validateProductAppSettingsNamespace(namespace);
    return join(root, 'product-settings', safeAppId, `${safeNamespace}.json`);
  }

  private createDefaultAppStorageDocument(
    appId: string,
    namespace: string,
    documentId: string,
    scope: AppStorageScope,
  ): AppStorageDocument {
    return {
      appId,
      namespace,
      scope,
      documentId,
      version: '0',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      value: {},
    };
  }

  private getAppStorageNamespaceDir(appId: string, namespace: string, scope: AppStorageScope): string {
    const safeScope = assertWorkspaceStorageScope(scope);
    const safeAppId = validateStoreSegment('appId', appId);
    const safeNamespace = validateAppStorageNamespace(namespace);
    return join(this.paths.workspaceStateDir, 'app-storage', safeScope, safeAppId, safeNamespace);
  }

  private getAppStorageDocumentPath(
    appId: string,
    namespace: string,
    documentId: string,
    scope: AppStorageScope,
  ): string {
    const safeDocumentId = validateAppStorageDocumentId(documentId);
    return join(this.getAppStorageNamespaceDir(appId, namespace, scope), `${safeDocumentId}.json`);
  }
}
