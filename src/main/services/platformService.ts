import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { app } from 'electron';
import { seedCatalog } from './seedCatalog';
import { AgentExecutionService } from './agentExecution';
import { LimecoreControlPlane } from './limecoreControlPlane';
import { PlatformStore } from './platformStore';
import { downloadAndVerifyReleaseArtifact } from './releaseDownloader';
import { RuntimeBridgeServer } from './runtimeBridgeServer';
import type {
  BillingSnapshot,
  CapabilityInvokeInput,
  CapabilityInvokeResult,
  CatalogApp,
  CloudSessionSnapshot,
  DesktopAppManifest,
  DesktopAppProjection,
  DownloadedUpdateArtifact,
  HostBridgeMessage,
  HostProfile,
  HostSnapshot,
  InstalledAppRecord,
  LaunchEntryInput,
  LaunchEntryResult,
  LoginInput,
  ModelSettings,
  PlatformBootstrap,
  PlatformCapability,
  PlatformNavigationIntent,
  PlatformNavigationResult,
  PlatformSettings,
  ReadinessReason,
  ReadinessResult,
  RuntimeEvent,
  UninstallAppInput,
  UninstallAppResult,
  UpdateActionResult,
  UpdateCandidate,
  UpdateState,
} from '../../shared/types';

function nowIso(): string {
  return new Date().toISOString();
}

function hashValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function stateToLifecycleState(state: ReadinessResult['state']): InstalledAppRecord['status'] {
  return state === 'disabled' ? 'disabled' : state;
}

function entryLabel(entry: DesktopAppManifest['entries'][number]): string {
  if (entry.label) {
    return entry.label;
  }

  const labels: Record<string, string> = {
    page: '页面',
    workflow: '工作流',
    'expert-chat': '专家会话',
    settings: '设置',
    diagnostics: '诊断',
  };

  return labels[entry.kind] ?? entry.key;
}

export class PlatformService {
  private readonly store = new PlatformStore();
  private catalog = seedCatalog;
  private readonly controlPlane = new LimecoreControlPlane();
  private readonly agentExecution = new AgentExecutionService();
  private readonly childProcesses = new Map<string, ChildProcess>();
  private readonly runtimeBridge = new RuntimeBridgeServer(
    (input) => this.invokeCapability(input),
    (input) => this.openNavigationIntent(input),
  );
  private lastCatalogSyncAt = 0;
  private lastControlPlaneProjectionSyncAt = 0;

  async getBootstrap(): Promise<PlatformBootstrap> {
    await this.syncCatalog();
    await this.syncControlPlaneProjections();
    const projections = this.listProjections();
    return {
      hostProfile: this.getHostProfile(),
      catalog: this.catalog,
      installedApps: this.listInstalled(),
      projections,
      modelSettings: this.getModelSettings(),
      authSession: this.getAuthSession(),
      billingState: this.getBillingState(),
      oemProjection: this.getOEMProjection(),
      platformSettings: this.getPlatformSettings(),
      updateState: this.createUpdateState(),
      diagnostics: this.getDiagnostics(),
      runtimeEvents: this.store.readRuntimeEvents(),
    };
  }

  async listCatalog(): Promise<CatalogApp[]> {
    await this.syncCatalog();
    return this.catalog;
  }

  listInstalled(): InstalledAppRecord[] {
    return this.store.readInstalledApps();
  }

  async getProjection(appId: string): Promise<DesktopAppProjection> {
    await this.syncCatalog();
    const catalogApp = this.requireCatalogApp(appId);
    return this.createProjection(catalogApp);
  }

  async getReadiness(appId: string): Promise<ReadinessResult> {
    await this.syncCatalog();
    const catalogApp = this.requireCatalogApp(appId);
    return this.calculateReadiness(catalogApp.manifest);
  }

  async installApp(appId: string, options: { packageHash?: string } = {}): Promise<DesktopAppProjection> {
    await this.syncCatalog();
    const catalogApp = this.requireCatalogApp(appId);
    const installedApps = this.listInstalled();
    const existing = installedApps.find((record) => record.appId === appId);
    const timestamp = nowIso();
    const manifestHash = hashValue(catalogApp.manifest);
    const packageHash =
      options.packageHash ??
      hashValue({
        appId,
        version: catalogApp.latestVersion,
        sourceKind: catalogApp.sourceKind,
      });

    const nextRecord: InstalledAppRecord = {
      appId,
      version: catalogApp.latestVersion,
      sourceKind: catalogApp.sourceKind,
      packageHash,
      manifestHash,
      installedAt: existing?.installedAt ?? timestamp,
      updatedAt: timestamp,
      enabled: true,
      status: 'projecting',
      lastLaunchedAt: existing?.lastLaunchedAt,
    };

    const nextInstalled = existing
      ? installedApps.map((record) => (record.appId === appId ? nextRecord : record))
      : [...installedApps, nextRecord];

    this.store.writeInstalledApps(nextInstalled);
    const projection = this.persistProjection(appId);
    this.updateInstalledStatus(appId, stateToLifecycleState(projection.readiness.state));
    this.appendEvent({
      level: 'info',
      appId,
      message: `${catalogApp.manifest.displayName} agentapp package 已写入本地安装记录。`,
      payload: { sourceKind: catalogApp.sourceKind, version: catalogApp.latestVersion },
    });

    return this.getProjection(appId);
  }

  async updateApp(appId: string): Promise<DesktopAppProjection> {
    await this.syncCatalog(true);
    const installed = this.requireInstalledApp(appId);
    const catalogApp = this.requireCatalogApp(appId);

    if (installed.version === catalogApp.latestVersion) {
      this.appendEvent({
        level: 'info',
        appId,
        message: `${catalogApp.manifest.displayName} agentapp package 已是最新版本。`,
      });
      return this.getProjection(appId);
    }

    return this.installApp(appId);
  }

  async enableApp(appId: string): Promise<DesktopAppProjection> {
    await this.syncCatalog();
    this.setAppEnabled(appId, true);
    this.appendEvent({ level: 'info', appId, message: '应用入口已启用。' });
    return this.persistProjection(appId);
  }

  async disableApp(appId: string): Promise<DesktopAppProjection> {
    await this.syncCatalog();
    this.setAppEnabled(appId, false);
    this.appendEvent({ level: 'warning', appId, message: '应用入口已禁用。' });
    return this.persistProjection(appId);
  }

  async uninstallApp(input: UninstallAppInput): Promise<UninstallAppResult> {
    await this.syncCatalog();
    const installedApps = this.listInstalled();
    const installed = installedApps.find((record) => record.appId === input.appId);
    const catalogApp = this.requireCatalogApp(input.appId);

    if (!installed) {
      const event = this.appendEvent({
        level: 'warning',
        appId: input.appId,
        message: `${catalogApp.manifest.displayName} agentapp package 未安装，无需卸载。`,
      });

      return {
        ok: false,
        appId: input.appId,
        status: 'blocked',
        message: 'agentapp package 尚未安装。',
        projectedApp: this.createProjection(catalogApp),
        runtimeEvents: [event, ...this.store.readRuntimeEvents().filter((item) => item.id !== event.id).slice(-19)],
      };
    }

    this.stopReferenceRuntimeFixture(input.appId);
    this.store.writeInstalledApps(installedApps.filter((record) => record.appId !== input.appId));
    this.store.removeRuntimeSnapshotsForApp(input.appId);
    const projection = this.persistProjection(input.appId);
    const event = this.appendEvent({
      level: 'warning',
      appId: input.appId,
      message: `${catalogApp.manifest.displayName} agentapp package 已从当前工作区卸载。`,
      payload: {
        keepData: input.keepData ?? true,
        removedVersion: installed.version,
      },
    });

    return {
      ok: true,
      appId: input.appId,
      status: 'removed',
      message:
        input.keepData === false
          ? 'agentapp package 已卸载；业务数据清理由后续安全删除流程承接。'
          : 'agentapp package 已卸载，业务数据保留。',
      projectedApp: projection,
      runtimeEvents: [event, ...this.store.readRuntimeEvents().filter((item) => item.id !== event.id).slice(-19)],
    };
  }

  async launchEntry(input: LaunchEntryInput): Promise<LaunchEntryResult> {
    const projection = await this.getProjection(input.appId);
    const readiness = projection.readiness;
    const entry = projection.entryCards.find((item) => item.key === input.entryKey);

    if (!entry) {
      throw new Error(`入口不存在：${input.entryKey}`);
    }

    if (readiness.state !== 'ready' || !entry.enabled) {
      const event = this.appendEvent({
        level: readiness.state === 'blocked' ? 'error' : 'warning',
        appId: input.appId,
        entryKey: input.entryKey,
        message: `启动被拦截：${readiness.state}`,
        payload: readiness,
      });

      return {
        launched: false,
        appId: input.appId,
        entryKey: input.entryKey,
        readiness,
        runtimeEvents: [event, ...this.store.readRuntimeEvents().filter((item) => item.id !== event.id).slice(-19)],
      };
    }

    const snapshot = this.createHostSnapshot(input);
    const snapshots = this.store.readRuntimeSnapshots();
    snapshots[this.snapshotKey(input)] = snapshot;
    this.store.writeRuntimeSnapshots(snapshots);
    const bridgeMessage: HostBridgeMessage<HostSnapshot> = {
      protocol: 'lime.agentApp.bridge',
      version: 1,
      requestId: randomUUID(),
      appId: input.appId,
      entryKey: input.entryKey,
      type: 'snapshot',
      payload: snapshot,
    };

    const runtimeStart = await this.launchReferenceRuntimeFixture(input, snapshot);
    if (!runtimeStart.ok) {
      const blockedReadiness: ReadinessResult = {
        state: runtimeStart.fixable ? 'needs-setup' : 'blocked',
        reasons: [
          {
            code: runtimeStart.code,
            message: runtimeStart.message,
            fixable: runtimeStart.fixable,
          },
        ],
        setupActions: runtimeStart.fixable ? ['先构建 reference runtime fixture，并检查 catalog referenceRuntime 配置。'] : [],
      };
      const event = this.appendEvent({
        level: runtimeStart.fixable ? 'warning' : 'error',
        appId: input.appId,
        entryKey: input.entryKey,
        message: `reference runtime fixture 启动未完成：${runtimeStart.message}`,
        payload: blockedReadiness,
      });

      return {
        launched: false,
        appId: input.appId,
        entryKey: input.entryKey,
        readiness: blockedReadiness,
        snapshot,
        bridgeMessage,
        runtimeEvents: [event, ...this.store.readRuntimeEvents().filter((item) => item.id !== event.id).slice(-19)],
      };
    }

    this.markLaunched(input.appId);
    const event = this.appendEvent({
      level: 'info',
      appId: input.appId,
      entryKey: input.entryKey,
      message: runtimeStart.message,
      payload: {
        bridgeMessage,
        runtime: runtimeStart.payload,
      },
    });

    return {
      launched: true,
      appId: input.appId,
      entryKey: input.entryKey,
      readiness,
      snapshot,
      bridgeMessage,
      runtimeEvents: [event, ...this.store.readRuntimeEvents().filter((item) => item.id !== event.id).slice(-19)],
    };
  }

  invokeCapability(input: CapabilityInvokeInput): CapabilityInvokeResult {
    const requestId = randomUUID();
    const output = this.resolveCapabilityOutput(input);
    const ok = output !== undefined;
    const agentExecutionBlocked =
      input.capability === 'lime.agentExecution' &&
      typeof output === 'object' &&
      output !== null &&
      'ok' in output &&
      (output as { ok?: unknown }).ok === false;
    const event = this.appendEvent({
      level: ok && !agentExecutionBlocked ? 'info' : 'error',
      appId: input.appId,
      entryKey: input.entryKey,
      message:
        ok && !agentExecutionBlocked
          ? `能力调用成功：${input.capability}`
          : `能力调用被阻断：${input.capability}`,
      payload: { operation: input.operation, input: input.input },
    });

    if (!ok) {
      return {
        ok: false,
        requestId,
        error: {
          code: 'capability-not-supported',
          message: `宿主不支持能力：${input.capability}`,
        },
        event,
      };
    }

    if (agentExecutionBlocked) {
      return {
        ok: false,
        requestId,
        output,
        error: {
          code: 'agent-execution-blocked',
          message:
            typeof output === 'object' && output !== null && 'message' in output && typeof output.message === 'string'
              ? output.message
              : 'Agent Execution Runtime 当前不可用。',
        },
        event,
      };
    }

    return {
      ok: true,
      requestId,
      output,
      event,
    };
  }

  openNavigationIntent(input: PlatformNavigationIntent): PlatformNavigationResult {
    const event = this.appendEvent({
      level: 'info',
      appId: input.appId,
      entryKey: input.entryKey,
      message: `业务 App 请求打开平台入口：${input.target}`,
      payload: {
        target: input.target,
        reason: input.reason,
      },
    });

    return {
      ok: true,
      target: input.target,
      message: '平台已接收导航意图，当前开发态以事件记录代替真实窗口聚焦。',
      event,
    };
  }

  getRuntimeSnapshot(input: LaunchEntryInput): HostSnapshot | undefined {
    return this.store.readRuntimeSnapshots()[this.snapshotKey(input)];
  }

  shutdownReferenceRuntimeFixtures(): void {
    for (const [appId, childProcess] of this.childProcesses.entries()) {
      if (childProcess.exitCode === null && childProcess.signalCode === null) {
        childProcess.kill();
        this.appendEvent({ level: 'info', appId, message: '测试运行结束，已关闭 reference runtime fixture 子进程。' });
      }
      this.childProcesses.delete(appId);
    }
    this.runtimeBridge.close();
  }

  getModelSettings(): ModelSettings {
    return this.store.readModelSettings();
  }

  saveModelSettings(settings: ModelSettings): ModelSettings {
    const nextSettings: ModelSettings = {
      ...settings,
      version: String(Number(settings.version || '0') + 1),
      updatedAt: nowIso(),
    };
    this.store.writeModelSettings(nextSettings);
    this.refreshAllProjections();
    this.appendEvent({ level: 'info', message: '模型设置已保存并重新计算 projection。' });
    return nextSettings;
  }

  getPlatformSettings(): PlatformSettings {
    return this.store.readPlatformSettings();
  }

  savePlatformSettings(settings: PlatformSettings): PlatformSettings {
    const nextSettings: PlatformSettings = {
      ...settings,
      version: String(Number(settings.version || '0') + 1),
      updatedAt: nowIso(),
    };
    this.store.writePlatformSettings(nextSettings);
    this.refreshAllProjections();
    this.appendEvent({ level: 'info', message: '平台设置已保存。' });
    return nextSettings;
  }

  getAuthSession(): CloudSessionSnapshot {
    const session = this.store.readAuthSession();
    return {
      ...session,
      source: session.source ?? 'local-dev',
    };
  }

  async login(input: LoginInput): Promise<CloudSessionSnapshot> {
    const session = await this.controlPlane.login(input, () => this.createLocalDevSession(input));
    this.store.writeAuthSession(session);
    this.refreshAllProjections();
    this.appendEvent({
      level: 'info',
      message:
        session.source === 'limecore'
          ? 'limecore OAuth 会话投影已建立。'
          : '本地开发会话已建立，未写入任何 OAuth token。',
      payload: { source: session.source, state: session.state },
    });
    return session;
  }

  private createLocalDevSession(input: LoginInput): CloudSessionSnapshot {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    return {
      state: 'authenticated',
      tenantId: `tenant-${hashValue(input.tenantName).slice(0, 8)}`,
      tenantName: input.tenantName.trim() || 'Lime 内部租户',
      accountEmail: input.accountEmail.trim() || 'dev@limecloud.local',
      expiresAt,
      scopes: ['catalog:read', 'apps:run', 'settings:read'],
      authMode: 'local-dev',
      source: 'local-dev',
    };
  }

  async logout(): Promise<CloudSessionSnapshot> {
    const session = await this.controlPlane.logout(() => this.createLoggedOutSession('local-dev'));
    this.store.writeAuthSession(session);
    this.refreshAllProjections();
    this.appendEvent({
      level: 'warning',
      message: session.source === 'limecore' ? 'limecore 会话已退出。' : '会话已退出。',
      payload: { source: session.source, state: session.state },
    });
    return session;
  }

  private createLoggedOutSession(source: CloudSessionSnapshot['source'] = 'local-dev'): CloudSessionSnapshot {
    const session: CloudSessionSnapshot = {
      state: 'unauthenticated',
      scopes: [],
      authMode: source === 'limecore' ? 'oauth' : 'local-dev',
      source,
    };
    return session;
  }

  getBillingState(): BillingSnapshot {
    const billing = this.store.readBillingState();
    return {
      ...billing,
      source: billing.source ?? 'local-dev',
    };
  }

  async refreshBilling(): Promise<BillingSnapshot> {
    const current = this.store.readBillingState();
    const localFallback: BillingSnapshot = {
      ...current,
      state: current.state === 'suspended' ? 'suspended' : 'active',
      planName: current.planName ?? '平台开发套餐',
      balanceCents: current.balanceCents ?? 100000,
      currency: current.currency ?? 'CNY',
      lastCheckedAt: nowIso(),
      source: 'local-dev',
    };
    const nextState = await this.controlPlane.fetchBilling(localFallback);
    this.store.writeBillingState(nextState);
    this.refreshAllProjections();
    this.appendEvent({
      level: 'info',
      message: nextState.source === 'limecore' ? 'limecore 充值状态投影已刷新。' : '充值状态投影已刷新。',
      payload: nextState,
    });
    return nextState;
  }

  getOEMProjection() {
    const projection = this.store.readOEMProjection();
    return {
      ...projection,
      source: projection.source ?? 'local-dev',
    };
  }

  async checkUpdates(): Promise<UpdateState> {
    await this.syncCatalog(true);
    const updateState = this.createUpdateState();
    this.store.writeUpdateState(updateState);
    return updateState;
  }

  async downloadUpdate(appId: string): Promise<UpdateActionResult> {
    const updateState = await this.checkUpdates();
    const update = updateState.availableUpdates.find((item) => item.appId === appId);

    if (!update) {
      const event = this.appendEvent({
        level: 'warning',
        appId,
        message: '没有可下载的 agentapp package 更新。',
      });

      return {
        ok: false,
        state: 'idle',
        message: '当前没有可用 agentapp package 更新。',
        updateState,
        event,
      };
    }

    if (!update.artifact) {
      const event = this.appendEvent({
        level: 'warning',
        appId,
        message: 'agentapp package 更新缺少 release artifact，已阻断下载。',
        payload: update,
      });

      return {
        ok: false,
        state: 'blocked',
        message: '目录存在 agentapp package 新版本，但缺少可校验的 release artifact。',
        updateState,
        event,
      };
    }

    try {
      const downloaded = await downloadAndVerifyReleaseArtifact({
        appId,
        version: update.nextVersion,
        artifact: update.artifact,
        destinationRoot: this.store.getAppArtifactsDir(),
      });
      const nextUpdateState = this.storeDownloadedUpdate(downloaded);
      const event = this.appendEvent({
        level: 'info',
        appId,
        message: 'agentapp package 更新包已下载并通过 sha256 校验。',
        payload: downloaded,
      });

      return {
        ok: true,
        state: 'downloaded',
        message: 'agentapp package 更新包已下载并校验完成。',
        updateState: nextUpdateState,
        event,
      };
    } catch (error) {
      const event = this.appendEvent({
        level: 'error',
        appId,
        message: 'agentapp package 更新包下载或校验失败。',
        payload: {
          error: error instanceof Error ? error.message : 'download failed',
          update,
        },
      });

      return {
        ok: false,
        state: 'blocked',
        message: error instanceof Error ? error.message : 'agentapp package 更新包下载或校验失败。',
        updateState,
        event,
      };
    }
  }

  async applyUpdate(appId: string): Promise<UpdateActionResult> {
    const updateState = await this.checkUpdates();
    const update = updateState.availableUpdates.find((item) => item.appId === appId);
    if (!update) {
      const event = this.appendEvent({
        level: 'warning',
        appId,
        message: '没有可应用的 agentapp package 更新。',
      });

      return {
        ok: false,
        state: 'idle',
        message: '当前没有可用 agentapp package 更新。',
        updateState,
        event,
      };
    }

    if (update.artifact && !this.findDownloadedUpdate(updateState, update)) {
      const event = this.appendEvent({
        level: 'warning',
        appId,
        message: 'agentapp package 更新包尚未下载或校验未通过。',
        payload: update,
      });

      return {
        ok: false,
        state: 'blocked',
        message: '请先下载并校验 agentapp package 更新包。',
        updateState,
        event,
      };
    }

    const projection = await this.installApp(appId, { packageHash: update.artifact?.sha256 });
    const nextUpdateState = await this.checkUpdates();
    const event = this.appendEvent({
      level: 'info',
      appId,
      message: update.artifact
        ? 'agentapp package 更新已从已校验 release artifact 应用。'
        : '开发态 agentapp package 更新已应用到本地安装记录。',
      payload: { readiness: projection.readiness },
    });

    return {
      ok: true,
      state: 'applied',
      message: update.artifact ? '已切换到已校验的 agentapp package release 版本。' : '已切换到目录中的最新 package 版本。',
      updateState: nextUpdateState,
      event,
    };
  }

  getDiagnostics() {
    const projections = this.store.readProjections();
    const runtimeEvents = this.store.readRuntimeEvents();
    return {
      storage: this.store.getPaths(),
      counts: {
        catalogApps: this.catalog.length,
        installedApps: this.listInstalled().length,
        projections: projections.length,
        runtimeEvents: runtimeEvents.length,
      },
      hostProfile: this.getHostProfile(),
      controlPlane: this.controlPlane.getStatus(),
      lastEvents: runtimeEvents.slice(-20).reverse(),
    };
  }

  private async syncCatalog(force = false): Promise<void> {
    const syncIntervalMs = 30_000;
    if (!force && Date.now() - this.lastCatalogSyncAt < syncIntervalMs) {
      return;
    }

    this.catalog = await this.controlPlane.fetchCatalog(seedCatalog);
    this.lastCatalogSyncAt = Date.now();
  }

  private async syncControlPlaneProjections(force = false): Promise<void> {
    const syncIntervalMs = 30_000;
    if (!force && Date.now() - this.lastControlPlaneProjectionSyncAt < syncIntervalMs) {
      return;
    }

    const [session, billing, oem] = await Promise.all([
      this.controlPlane.fetchSession(this.getAuthSession()),
      this.controlPlane.fetchBilling(this.getBillingState()),
      this.controlPlane.fetchOEM(this.getOEMProjection()),
    ]);
    this.store.writeAuthSession(session);
    this.store.writeBillingState(billing);
    this.store.writeOEMProjection(oem);
    this.lastControlPlaneProjectionSyncAt = Date.now();
  }

  private createUpdateState(): UpdateState {
    const existingState = this.store.readUpdateState();
    const installedApps = this.listInstalled();
    const availableUpdates: UpdateCandidate[] = installedApps.flatMap((installed) => {
      const catalogApp = this.catalog.find((item) => item.manifest.appId === installed.appId);
      if (!catalogApp || catalogApp.latestVersion === installed.version) {
        return [];
      }

      return [
        {
          targetKind: 'agentapp-package',
          appId: installed.appId,
          currentVersion: installed.version,
          nextVersion: catalogApp.latestVersion,
          sourceKind: catalogApp.sourceKind,
          artifact: catalogApp.releaseArtifact,
        },
      ];
    });

    return {
      checkedAt: nowIso(),
      availableUpdates,
      downloadedUpdates: existingState.downloadedUpdates ?? [],
      controlPlane: this.controlPlane.getStatus(),
    };
  }

  private storeDownloadedUpdate(downloadedUpdate: DownloadedUpdateArtifact): UpdateState {
    const updateState = this.createUpdateState();
    const downloadedUpdates = [
      ...(updateState.downloadedUpdates ?? []).filter(
        (item) => !(item.appId === downloadedUpdate.appId && item.version === downloadedUpdate.version),
      ),
      downloadedUpdate,
    ];
    const nextUpdateState = {
      ...updateState,
      downloadedUpdates,
    };
    this.store.writeUpdateState(nextUpdateState);
    return nextUpdateState;
  }

  private findDownloadedUpdate(updateState: UpdateState, update: UpdateCandidate) {
    return updateState.downloadedUpdates?.find(
      (item) =>
        item.appId === update.appId &&
        item.version === update.nextVersion &&
        item.verified &&
        (!update.artifact || item.sha256 === update.artifact.sha256),
    );
  }

  private listProjections(): DesktopAppProjection[] {
    const projections = this.catalog.map((item) => this.createProjection(item));
    this.store.writeProjections(projections);
    return projections;
  }

  private refreshAllProjections(): void {
    this.listProjections();
    const installedApps = this.listInstalled().map((record) => {
      const projection = this.createProjection(this.requireCatalogApp(record.appId));
      return {
        ...record,
        status: stateToLifecycleState(projection.readiness.state),
      };
    });
    this.store.writeInstalledApps(installedApps);
  }

  private createProjection(catalogApp: CatalogApp): DesktopAppProjection {
    const installed = this.listInstalled().find((record) => record.appId === catalogApp.manifest.appId);
    const readiness = this.calculateReadiness(catalogApp.manifest);
    const sourceKind = installed?.sourceKind ?? catalogApp.sourceKind;

    return {
      appId: catalogApp.manifest.appId,
      displayName: catalogApp.manifest.displayName,
      version: installed?.version ?? catalogApp.manifest.version,
      catalogCard: {
        sourceKind,
        description: catalogApp.description,
        updateAvailable: Boolean(installed && installed.version !== catalogApp.latestVersion),
        status: installed ? stateToLifecycleState(readiness.state) : 'discovered',
      },
      entryCards: catalogApp.manifest.entries.map((entry) => ({
        key: entry.key,
        label: entryLabel(entry),
        route: entry.route,
        enabled: Boolean(installed?.enabled && readiness.state === 'ready'),
      })),
      capabilityPreview: catalogApp.manifest.requires.capabilities,
      readiness,
    };
  }

  private calculateReadiness(manifest: DesktopAppManifest): ReadinessResult {
    const installed = this.listInstalled().find((record) => record.appId === manifest.appId);
    const reasons: ReadinessReason[] = [];
    const setupActions: string[] = [];

    if (!installed) {
      reasons.push({ code: 'app-not-installed', message: '应用尚未安装到当前工作区。', fixable: true });
      setupActions.push('install-app');
    }

    if (installed && !installed.enabled) {
      return {
        state: 'disabled',
        reasons: [{ code: 'app-disabled', message: '应用入口已被禁用。', fixable: true }],
        setupActions: ['enable-app'],
      };
    }

    const hostProfile = this.getHostProfile();
    if (manifest.requires.hostKinds?.length && !manifest.requires.hostKinds.includes(hostProfile.hostKind)) {
      reasons.push({ code: 'host-not-supported', message: '当前宿主类型不在 manifest 支持范围内。', fixable: false });
    }

    const missingCapabilities = manifest.requires.capabilities.filter(
      (capability) => !hostProfile.capabilities.includes(capability),
    );
    for (const capability of missingCapabilities) {
      reasons.push({ code: 'capability-missing', message: `缺少宿主能力：${capability}`, fixable: false });
    }

    if (manifest.requires.capabilities.includes('lime.cloudSession') && this.getAuthSession().state !== 'authenticated') {
      reasons.push({ code: 'auth-required', message: '需要有效的租户会话。', fixable: true });
      setupActions.push('open-auth-settings');
    }

    if (manifest.requires.capabilities.includes('lime.modelSettings') && !this.hasUsableTextModel()) {
      reasons.push({ code: 'model-settings-required', message: '需要至少一个可用的文本模型配置。', fixable: true });
      setupActions.push('open-model-settings');
    }

    if (manifest.requires.capabilities.includes('lime.branding') && this.getOEMProjection().state === 'unbranded') {
      reasons.push({ code: 'branding-required', message: '需要有效的 OEM 品牌投影。', fixable: true });
      setupActions.push('open-oem-settings');
    }

    if (manifest.requires.capabilities.includes('lime.billing') && this.getBillingState().state !== 'active') {
      reasons.push({ code: 'billing-required', message: '需要有效的充值或订阅状态。', fixable: true });
      setupActions.push('open-billing-settings');
    }

    const blockingReason = reasons.find((reason) => !reason.fixable);
    if (blockingReason) {
      return { state: 'blocked', reasons, setupActions };
    }

    if (reasons.length > 0) {
      return { state: 'needs-setup', reasons, setupActions };
    }

    return { state: 'ready', reasons: [], setupActions: [] };
  }

  private hasUsableTextModel(): boolean {
    const settings = this.getModelSettings();
    return settings.providers.some(
      (provider) =>
        provider.enabled &&
        provider.apiKeyConfigured &&
        provider.capabilityKinds.includes('text') &&
        provider.models.includes(settings.defaultTextModelId ?? ''),
    );
  }

  private getHostProfile(): HostProfile {
    const platformSettings = this.getPlatformSettings();
    return {
      hostKind: 'electron',
      hostVersion: app.getVersion(),
      capabilities: [
        'lime.cloudSession',
        'lime.modelSettings',
        'lime.branding',
        'lime.billing',
        'lime.appUpdates',
        'lime.download',
        'lime.permissions',
        'lime.diagnostics',
        'lime.agentExecution',
      ],
      locale: platformSettings.locale,
      theme: platformSettings.theme,
      workspacePath: platformSettings.workspacePath,
    };
  }

  private createHostSnapshot(input: LaunchEntryInput): HostSnapshot {
    const hostProfile = this.getHostProfile();
    const authSession = this.getAuthSession();
    return {
      hostKind: hostProfile.hostKind,
      hostVersion: hostProfile.hostVersion,
      appId: input.appId,
      entryKey: input.entryKey,
      locale: hostProfile.locale,
      theme: hostProfile.theme,
      workspacePath: hostProfile.workspacePath,
      modelSettingsVersion: this.getModelSettings().version,
      oauthState: authSession.state,
      tenantName: authSession.tenantName,
      accountEmail: authSession.accountEmail,
      billingState: this.getBillingState().state,
      oemState: this.getOEMProjection().state,
    };
  }

  private async launchReferenceRuntimeFixture(
    input: LaunchEntryInput,
    snapshot: HostSnapshot,
  ): Promise<{ ok: true; message: string; payload?: unknown } | { ok: false; code: string; message: string; fixable: boolean }> {
    const runtimeApp = this.resolveReferenceRuntimeFixture(input.appId);
    if (!runtimeApp) {
      return {
        ok: true,
        message: 'Host Snapshot 已生成，入口进入运行态。',
        payload: { mode: 'in-lime-projection' },
      };
    }

    if (!existsSync(runtimeApp.mainEntry)) {
      return {
        ok: false,
        code: 'runtime-build-missing',
        message: `未找到 reference runtime fixture 构建产物：${runtimeApp.mainEntry}`,
        fixable: true,
      };
    }

    const existing = this.childProcesses.get(input.appId);
    if (existing && existing.exitCode === null && existing.signalCode === null) {
      return {
        ok: true,
        message: 'reference runtime fixture 已在运行，Host Snapshot 已刷新。',
        payload: { mode: 'external-electron', pid: existing.pid, projectRoot: runtimeApp.projectRoot },
      };
    }

    const bridgeDescriptor = await this.runtimeBridge.createDescriptor({
      appId: input.appId,
      entryKey: input.entryKey,
      snapshot,
    });
    const childArgs = [runtimeApp.projectRoot];
    const remoteDebuggingPortEnv = runtimeApp.remoteDebuggingPortEnv;
    if (remoteDebuggingPortEnv && process.env[remoteDebuggingPortEnv]) {
      childArgs.push(`--remote-debugging-port=${process.env[remoteDebuggingPortEnv]}`);
    }
    if (process.env.CI === 'true' && process.platform === 'linux') {
      childArgs.push('--no-sandbox');
    }

    const detached = process.env.LIME_DESKTOP_SMOKE !== '1';
    const childProcess = spawn(process.execPath, childArgs, {
      cwd: runtimeApp.projectRoot,
      detached,
      stdio: 'ignore',
      env: {
        ...process.env,
        LIME_HOST_SNAPSHOT: JSON.stringify(snapshot),
        LIME_RUNTIME_BRIDGE: JSON.stringify(bridgeDescriptor),
      },
    });
    if (detached) {
      childProcess.unref();
    }
    this.childProcesses.set(input.appId, childProcess);
    childProcess.once('exit', () => {
      this.childProcesses.delete(input.appId);
    });

    return {
      ok: true,
      message: 'reference runtime fixture 已由 reference shell 启动；该路径仅用于 smoke / conformance。',
      payload: {
        mode: 'external-electron',
        pid: childProcess.pid,
        projectRoot: runtimeApp.projectRoot,
        runtimeBridge: {
          endpoint: bridgeDescriptor.endpoint,
          expiresAt: bridgeDescriptor.expiresAt,
        },
      },
    };
  }

  private resolveReferenceRuntimeFixture(
    appId: string,
  ): { projectRoot: string; mainEntry: string; remoteDebuggingPortEnv?: string } | undefined {
    const catalogApp = this.catalog.find((item) => item.manifest.appId === appId);
    const referenceRuntime = catalogApp?.referenceRuntime ?? catalogApp?.devRuntime;
    if (!catalogApp || catalogApp.manifest.installMode !== 'runtime_backed' || !referenceRuntime) {
      return undefined;
    }

    const projectRoot =
      (referenceRuntime.projectRootEnv ? process.env[referenceRuntime.projectRootEnv] : undefined) ??
      (referenceRuntime.relativeProjectRoot ? resolve(app.getAppPath(), referenceRuntime.relativeProjectRoot) : undefined);

    if (!projectRoot) {
      return undefined;
    }

    return {
      projectRoot,
      mainEntry: join(projectRoot, referenceRuntime.mainEntry ?? 'out/main/index.js'),
      remoteDebuggingPortEnv: referenceRuntime.remoteDebuggingPortEnv,
    };
  }

  private stopReferenceRuntimeFixture(appId: string): void {
    const childProcess = this.childProcesses.get(appId);
    if (!childProcess) {
      return;
    }

    if (childProcess.exitCode === null && childProcess.signalCode === null) {
      childProcess.kill();
    }
    this.childProcesses.delete(appId);
    this.runtimeBridge.revokeApp(appId);
  }

  private resolveCapabilityOutput(input: CapabilityInvokeInput): unknown {
    const capability = input.capability;
    if (capability === 'lime.cloudSession') {
      return this.getAuthSession();
    }
    if (capability === 'lime.modelSettings') {
      return this.getModelSettings();
    }
    if (capability === 'lime.branding') {
      return this.getOEMProjection();
    }
    if (capability === 'lime.billing') {
      return this.getBillingState();
    }
    if (capability === 'lime.appUpdates') {
      return this.createUpdateState();
    }
    if (capability === 'lime.diagnostics') {
      return {
        ...this.getDiagnostics(),
        agentExecution: this.agentExecution.describeRuntime(),
      };
    }
    if (capability === 'lime.agentExecution') {
      return this.agentExecution.start(input, {
        modelSettings: this.getModelSettings(),
      });
    }
    return undefined;
  }

  private persistProjection(appId: string): DesktopAppProjection {
    const projection = this.createProjection(this.requireCatalogApp(appId));
    const projections = this.store.readProjections();
    const nextProjections = projections.some((item) => item.appId === appId)
      ? projections.map((item) => (item.appId === appId ? projection : item))
      : [...projections, projection];
    this.store.writeProjections(nextProjections);
    return projection;
  }

  private setAppEnabled(appId: string, enabled: boolean): void {
    const installedApps = this.listInstalled();
    const installed = installedApps.find((record) => record.appId === appId);
    if (!installed) {
      throw new Error(`应用尚未安装：${appId}`);
    }

    this.store.writeInstalledApps(
      installedApps.map((record) =>
        record.appId === appId
          ? {
              ...record,
              enabled,
              updatedAt: nowIso(),
              status: enabled ? 'projecting' : 'disabled',
            }
          : record,
      ),
    );

    const projection = this.createProjection(this.requireCatalogApp(appId));
    this.updateInstalledStatus(appId, stateToLifecycleState(projection.readiness.state));
  }

  private updateInstalledStatus(appId: string, status: InstalledAppRecord['status']): void {
    const installedApps = this.listInstalled();
    this.store.writeInstalledApps(
      installedApps.map((record) =>
        record.appId === appId
          ? {
              ...record,
              status,
              updatedAt: nowIso(),
            }
          : record,
      ),
    );
  }

  private markLaunched(appId: string): void {
    const installedApps = this.listInstalled();
    this.store.writeInstalledApps(
      installedApps.map((record) =>
        record.appId === appId
          ? {
              ...record,
              status: 'running',
              lastLaunchedAt: nowIso(),
            }
          : record,
      ),
    );
  }

  private appendEvent(input: Omit<RuntimeEvent, 'id' | 'timestamp'>): RuntimeEvent {
    const event: RuntimeEvent = {
      id: randomUUID(),
      timestamp: nowIso(),
      ...input,
    };
    const events = [...this.store.readRuntimeEvents(), event];
    this.store.writeRuntimeEvents(events);
    return event;
  }

  private snapshotKey(input: LaunchEntryInput): string {
    return `${input.appId}:${input.entryKey}`;
  }

  private requireCatalogApp(appId: string): CatalogApp {
    const catalogApp = this.catalog.find((item) => item.manifest.appId === appId);
    if (!catalogApp) {
      throw new Error(`应用不存在：${appId}`);
    }
    return catalogApp;
  }

  private requireInstalledApp(appId: string): InstalledAppRecord {
    const installed = this.listInstalled().find((record) => record.appId === appId);
    if (!installed) {
      throw new Error(`应用尚未安装：${appId}`);
    }
    return installed;
  }
}
