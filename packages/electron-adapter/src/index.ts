import { join } from 'node:path';
import { PlatformService } from '../../../src/main/services/platformService';
import type {
  CapabilityInvokeInput,
  CapabilityInvokeResult,
  AgentRuntimeEvent,
  HostSnapshot,
  PlatformNavigationIntent,
  PlatformNavigationResult,
  PlatformSettings,
} from '../../../src/shared/types';

export interface EmbeddedElectronPlatformHostOptions {
  appId: string;
  entryKey?: string;
  resourcesDir?: string;
  appServerDataDir?: string;
  appServerPolicyPath?: string;
  appServerBackendMode?: 'runtime' | 'external' | 'unavailable';
  publishRuntimeBridgeDiscovery?: boolean;
}

export interface EmbeddedElectronPlatformHostStatus {
  available: boolean;
  source: 'embedded';
  snapshot?: HostSnapshot;
  appServerSidecar?: {
    ok: boolean;
    connected: boolean;
    error?: string;
  };
  error?: string;
}

export class EmbeddedElectronPlatformHost {
  private readonly entryKey: string;
  private readonly platformService: PlatformService;
  private snapshot?: HostSnapshot;
  private appServerSidecar?: EmbeddedElectronPlatformHostStatus['appServerSidecar'];
  private lastError?: string;

  constructor(private readonly options: EmbeddedElectronPlatformHostOptions) {
    this.entryKey = options.entryKey ?? 'default';
    const restoreEnv = applyEmbeddedAppServerEnv(options);
    try {
      this.platformService = new PlatformService(undefined, {
        publishRuntimeBridgeDiscovery: options.publishRuntimeBridgeDiscovery ?? false,
      });
    } finally {
      restoreEnv();
    }
  }

  async ensureConnected(): Promise<boolean> {
    try {
      this.appServerSidecar = await this.platformService.warmupAppServerSidecar();
      this.snapshot = await this.readSnapshot();
      this.lastError = undefined;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : '初始化 embedded Lime Desktop Platform host 失败。';
      return false;
    }
  }

  status(): EmbeddedElectronPlatformHostStatus {
    return {
      available: true,
      source: 'embedded',
      snapshot: this.snapshot,
      appServerSidecar: this.appServerSidecar,
      error: this.lastError,
    };
  }

  async readSnapshot(): Promise<HostSnapshot> {
    const bootstrap = await this.platformService.getBootstrap();
    const snapshot: HostSnapshot = {
      hostKind: bootstrap.hostProfile.hostKind,
      hostVersion: bootstrap.hostProfile.hostVersion,
      appId: this.options.appId,
      entryKey: this.entryKey,
      locale: bootstrap.platformSettings.locale,
      theme: bootstrap.platformSettings.theme,
      appearance: bootstrap.platformSettings.appearance,
      workspacePath: bootstrap.platformSettings.workspacePath,
      modelSettingsVersion: bootstrap.modelSettings.version,
      oauthState: bootstrap.authSession.state,
      tenantName: bootstrap.authSession.tenantName,
      accountEmail: bootstrap.authSession.accountEmail,
      billingState: bootstrap.billingState.state,
      oemState: bootstrap.oemProjection.state,
    };
    this.snapshot = snapshot;
    return snapshot;
  }

  invokeCapability(input: Omit<CapabilityInvokeInput, 'appId' | 'entryKey'>): Promise<CapabilityInvokeResult> {
    return this.platformService.invokeCapability({
      appId: this.options.appId,
      entryKey: this.entryKey,
      capability: input.capability,
      operation: input.operation,
      input: input.input,
    });
  }

  readAgentRuntimeEvents(input: {
    sessionId?: string;
    turnId?: string;
    afterSequence?: number;
  }): AgentRuntimeEvent[] {
    return this.platformService.readAgentRuntimeEvents({
      appId: this.options.appId,
      entryKey: this.entryKey,
      sessionId: input.sessionId,
      turnId: input.turnId,
      afterSequence: input.afterSequence,
    });
  }

  openNavigationIntent(input: PlatformNavigationIntent): PlatformNavigationResult {
    return this.platformService.openNavigationIntent(input);
  }

  getPlatformSettings(): PlatformSettings {
    return this.platformService.getPlatformSettings();
  }

  savePlatformSettings(settings: PlatformSettings): PlatformSettings {
    const result = this.platformService.savePlatformSettings(settings);
    this.snapshot = undefined;
    return result;
  }

  shutdown(): void {
    this.platformService.shutdownReferenceRuntimeFixtures();
  }
}

export function createEmbeddedElectronPlatformHost(
  options: EmbeddedElectronPlatformHostOptions,
): EmbeddedElectronPlatformHost {
  return new EmbeddedElectronPlatformHost(options);
}

function applyEmbeddedAppServerEnv(options: EmbeddedElectronPlatformHostOptions): () => void {
  const previous = {
    APP_SERVER_RESOURCE_DIR: process.env.APP_SERVER_RESOURCE_DIR,
    APP_SERVER_BIN: process.env.APP_SERVER_BIN,
    APP_SERVER_ARGS: process.env.APP_SERVER_ARGS,
  };
  const resourcesDir = options.resourcesDir?.trim();
  if (!resourcesDir) return () => undefined;

  const appServerDir = join(resourcesDir, 'app-server');
  if (!process.env.APP_SERVER_RESOURCE_DIR) {
    process.env.APP_SERVER_RESOURCE_DIR = appServerDir;
  }
  if (!process.env.APP_SERVER_BIN) {
    const binaryName = process.platform === 'win32' ? 'app-server.exe' : 'app-server';
    process.env.APP_SERVER_BIN = join(appServerDir, 'current', binaryName);
  }
  if (!process.env.APP_SERVER_ARGS) {
    const policyPath = options.appServerPolicyPath ?? join(appServerDir, 'content-studio.policy.example.json');
    const args = [
      '--backend',
      options.appServerBackendMode ?? 'runtime',
      '--app-policy',
      policyPath,
    ];
    const dataDir = options.appServerDataDir?.trim();
    if (dataDir) {
      args.push(`--data-dir=${dataDir}`);
    }
    process.env.APP_SERVER_ARGS = args.join('\n');
  }
  return () => {
    restoreEnvValue('APP_SERVER_RESOURCE_DIR', previous.APP_SERVER_RESOURCE_DIR);
    restoreEnvValue('APP_SERVER_BIN', previous.APP_SERVER_BIN);
    restoreEnvValue('APP_SERVER_ARGS', previous.APP_SERVER_ARGS);
  };
}

function restoreEnvValue(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
