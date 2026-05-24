import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type {
  BillingSnapshot,
  CloudSessionSnapshot,
  DesktopAppProjection,
  HostSnapshot,
  InstalledAppRecord,
  ModelSettings,
  OEMProjection,
  PlatformSettings,
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
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        {
          id: 'openai-compatible',
          displayName: 'OpenAI Compatible',
          protocol: 'openai-compatible',
          capabilityKinds: ['text', 'image'],
          enabled: true,
          apiKeyConfigured: false,
          models: ['gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
        },
        {
          id: 'anthropic-compatible',
          displayName: 'Anthropic Compatible',
          protocol: 'anthropic-compatible',
          capabilityKinds: ['text'],
          enabled: false,
          apiKeyConfigured: false,
          models: ['claude-sonnet-4-5', 'claude-opus-4-1'],
        },
        {
          id: 'local',
          displayName: 'Local Runtime',
          protocol: 'local',
          capabilityKinds: ['text'],
          enabled: false,
          apiKeyConfigured: true,
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
    mkdirSync(this.paths.userStateDir, { recursive: true });
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
}
