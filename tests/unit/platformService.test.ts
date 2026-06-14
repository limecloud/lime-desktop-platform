import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureElectronMock, installElectronMock } from './electronMock';
import type { ModelSettings } from '../../src/shared/types';
import type { AppServerJsonRpcClient } from '../../src/main/services/appServerJsonRpcClient';

installElectronMock();

function createTempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'desktop-platform-service-'));
}

function withoutControlPlaneEnv<T>(run: () => T): T {
  const keys = [
    'APP_SERVER_BIN',
    'APP_SERVER_ARGS',
    'APP_SERVER_CWD',
    'APP_SERVER_RESOURCE_DIR',
    'LIMECORE_BASE_URL',
    'LIMECORE_CATALOG_URL',
    'LIMECORE_SESSION_URL',
    'LIMECORE_BILLING_URL',
    'LIMECORE_OEM_URL',
    'LIMECORE_AUTH_TOKEN',
    'LIMECORE_ACCESS_TOKEN',
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }

  try {
    return run();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function createService(root: string) {
  configureElectronMock({
    userData: join(root, 'userData'),
    appPath: process.cwd(),
    version: '0.1.4-test',
  });
  const { PlatformService } = await import('../../src/main/services/platformService');
  return withoutControlPlaneEnv(() => new PlatformService(undefined, { publishRuntimeBridgeDiscovery: false }));
}

async function createServiceWithClient(root: string, client: Partial<AppServerJsonRpcClient>) {
  configureElectronMock({
    userData: join(root, 'userData'),
    appPath: process.cwd(),
    version: '0.1.4-test',
  });
  const { PlatformService } = await import('../../src/main/services/platformService');
  return withoutControlPlaneEnv(
    () =>
      new PlatformService(
        {
          getClient: () => client as AppServerJsonRpcClient,
          isConnected: () => Boolean(client.connected),
          isConfigured: () => true,
        },
        { publishRuntimeBridgeDiscovery: false },
      ),
  );
}

async function createServiceWithSidecarEnv(root: string, env: Partial<NodeJS.ProcessEnv>) {
  configureElectronMock({
    userData: join(root, 'userData'),
    appPath: process.cwd(),
    version: '0.1.4-test',
  });
  const keys = ['APP_SERVER_BIN', 'APP_SERVER_ARGS', 'APP_SERVER_CWD', 'APP_SERVER_RESOURCE_DIR'];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  try {
    const { PlatformService } = await import('../../src/main/services/platformService');
    return new PlatformService(undefined, { publishRuntimeBridgeDiscovery: false });
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createJsonRpcSidecarFixture(root: string): string {
  const fixturePath = join(root, 'app-server-fixture.cjs');
  writeFileSync(
    fixturePath,
    `
const readline = require('node:readline');
const reader = readline.createInterface({ input: process.stdin });
reader.on('line', (line) => {
  if (!line.trim()) return;
  const envelope = JSON.parse(line);
  if (typeof envelope.id !== 'number') return;
  if (envelope.method === 'initialize') {
    console.log(JSON.stringify({
      id: envelope.id,
      result: {
        serverInfo: { name: 'app-server-fixture', version: '0.0.0', protocolVersion: 'appserver.v0' },
        capabilities: { agentSession: true, providerStore: true }
      }
    }));
  }
});
`,
    'utf8',
  );
  const binaryPath = join(root, process.platform === 'win32' ? 'app-server.cmd' : 'app-server');
  const binaryContent =
    process.platform === 'win32'
      ? `@echo off\r\n"${process.execPath}" "${fixturePath}" %*\r\n`
      : `#!/bin/sh\nexec "${process.execPath}" "${fixturePath}" "$@"\n`;
  writeFileSync(binaryPath, binaryContent, 'utf8');
  chmodSync(binaryPath, 0o755);
  return binaryPath;
}

function enableLocalModel(settings: ModelSettings): ModelSettings {
  return {
    ...settings,
    defaultAgentProviderId: 'local',
    defaultTextModelId: 'local-default',
    providers: [
      {
        id: 'local',
        displayName: 'Local Runtime',
        protocol: 'local',
        capabilityKinds: ['text'],
        enabled: true,
        apiKeyConfigured: true,
        authType: 'none',
        models: ['local-default'],
      },
    ],
  };
}

function openAiProvider(overrides: Partial<ModelSettings['providers'][number]> = {}): ModelSettings['providers'][number] {
  return {
    id: 'openai-compatible',
    displayName: 'OpenAI Compatible',
    protocol: 'openai-compatible',
    capabilityKinds: ['text', 'image'],
    enabled: true,
    apiKeyConfigured: false,
    authType: 'api-key',
    useResponsesApi: true,
    models: ['gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
    ...overrides,
  };
}

test('PlatformService 离线保存新 provider API Key 时 fail-closed 且不持久化明文', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    const current = service.getModelSettings();
    const nextSettings: ModelSettings = {
      ...current,
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [openAiProvider({ apiKey: 'sk-unit-secret' })],
    };

    await assert.rejects(
      () => service.saveModelSettings(nextSettings),
      /App Server JSON-RPC sidecar 未配置。|模型 API Key 未写入 App Server provider store/,
    );

    const userStateDir = join(root, 'userData', 'state');
    const persistedSettingsPath = join(userStateDir, 'model-settings.json');
    if (existsSync(persistedSettingsPath)) {
      const persistedSettings = readFileSync(persistedSettingsPath, 'utf8');
      assert.equal(persistedSettings.includes('sk-unit-secret'), false);
      assert.equal(persistedSettings.includes('"apiKey"'), false);
    }

    const brokerPath = join(userStateDir, 'credential-broker', 'model-providers', 'openai-compatible.json');
    assert.equal(existsSync(brokerPath), false);

    const syncStatePath = join(userStateDir, 'model-provider-app-server-sync.json');
    assert.equal(existsSync(syncStatePath), true);
    const persistedSyncState = readFileSync(syncStatePath, 'utf8');
    assert.equal(persistedSyncState.includes('sk-unit-secret'), false);
    assert.equal(persistedSyncState.includes('"apiKey"'), false);
    assert.equal(persistedSyncState.includes('"status": "failed"'), true);
    assert.equal(persistedSyncState.includes('App Server JSON-RPC sidecar 未配置。'), true);

    const projected = service.getModelSettings().providers.find((provider) => provider.id === 'openai-compatible');
    assert.equal(projected, undefined);
    const diagnosticsText = JSON.stringify(service.getDiagnostics());
    assert.equal(diagnosticsText.includes('sk-unit-secret'), false);
    assert.equal(diagnosticsText.includes('App Server JSON-RPC sidecar 未配置。'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 启动期会预热自管理 App Server sidecar 并发送 initialize', async () => {
  const root = createTempRoot();
  let service: Awaited<ReturnType<typeof createServiceWithSidecarEnv>> | undefined;
  try {
    const fixturePath = createJsonRpcSidecarFixture(root);
    service = await createServiceWithSidecarEnv(root, {
      APP_SERVER_BIN: fixturePath,
      APP_SERVER_ARGS: '--backend runtime',
    });

    const status = await service.warmupAppServerSidecar();

    assert.deepEqual(status, { ok: true, connected: true });
    assert.equal(
      service.getDiagnostics().lastEvents.some((event) => event.message === 'Lime App Server sidecar 已随 Electron 启动。'),
      true,
    );
  } finally {
    service?.shutdownReferenceRuntimeFixtures();
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 在共享设置满足后可把中性 fixture 投影为应用中心 ready 入口', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    await service.saveModelSettings(enableLocalModel(service.getModelSettings()));
    await service.login({ tenantName: '测试租户', accountEmail: 'tester@example.test' });
    await service.refreshBilling();

    const projection = await service.installApp('lime.platform.conformance');
    assert.equal(projection.catalogCard.status, 'ready');
    assert.deepEqual(
      projection.entryCards.map((entry) => [entry.key, entry.enabled]),
      [
        ['host-conformance', true],
        ['capability-check', true],
        ['settings-intent', true],
      ],
    );
    assert.equal(service.listInstalled().find((record) => record.appId === 'lime.platform.conformance')?.status, 'ready');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService launchEntry Host Snapshot 投影非敏感模型 metadata', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    await service.saveModelSettings(enableLocalModel(service.getModelSettings()));
    await service.login({ tenantName: '测试租户', accountEmail: 'tester@example.test' });
    await service.refreshBilling();
    await service.installApp('lime.platform.conformance');

    const result = await service.launchEntry({
      appId: 'lime.platform.conformance',
      entryKey: 'host-conformance',
    });

    assert.equal(result.launched, true);
    assert.equal(result.snapshot?.modelSettingsVersion, result.snapshot?.modelSettings?.version);
    assert.equal(result.snapshot?.modelSettings?.defaultAgentProviderId, 'local');
    assert.equal(result.snapshot?.modelSettings?.defaultTextModelId, 'local-default');
    assert.deepEqual(result.snapshot?.modelSettings?.providers.map((provider) => provider.id), ['local']);
    assert.equal(result.snapshot?.modelSettings?.providers[0]?.apiKeyConfigured, true);

    const serializedSnapshot = JSON.stringify(result.snapshot);
    assert.equal(serializedSnapshot.includes('"apiKey"'), false);
    assert.equal(serializedSnapshot.includes('token'), false);
    assert.equal(serializedSnapshot.includes('secret'), false);
    assert.equal(serializedSnapshot.includes('credential'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 通过 lime.settings capability 保存外观设置并归一化非法输入', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    const result = await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.settings',
      operation: 'platform-settings/save',
      input: {
        settings: {
          theme: 'dark',
          appearance: {
            colorTheme: 'ocean',
            fontScale: 1.8,
            serifEnabled: true,
          },
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(service.getPlatformSettings().theme, 'dark');
    assert.deepEqual(service.getPlatformSettings().appearance, {
      colorTheme: 'ocean',
      fontScale: 1.25,
      serifEnabled: true,
    });

    await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.settings',
      operation: 'platform-settings/save',
      input: {
        settings: {
          appearance: {
            colorTheme: 'invalid-theme',
            fontScale: Number.NaN,
            serifEnabled: 'yes',
          },
        },
      },
    });

    assert.deepEqual(service.getPlatformSettings().appearance, {
      colorTheme: 'ocean',
      fontScale: 1.25,
      serifEnabled: true,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 保存模型设置时受控同步 App Server provider/key，runtime invoke 不触发 key provisioning', async () => {
  const root = createTempRoot();
  try {
    const syncCalls: Array<{ providerId: string; apiKey?: string }> = [];
    const startCalls: unknown[] = [];
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      syncModelProvider: async (input) => {
        syncCalls.push({
          providerId: input.provider.id,
          apiKey: input.apiKey,
        });
        return {
          created: true,
          updated: true,
          credentialSynced: Boolean(input.apiKey),
          record: {
            desktopProviderId: input.provider.id,
            status: 'synced',
            appServerProviderId: 'custom-provider-1',
            appServerProviderType: 'openai-response',
            appServerProviderName: input.provider.displayName,
            apiHost: input.provider.baseUrl,
            settingsVersion: input.settingsVersion,
            syncedAt: '2026-06-09T00:00:00.000Z',
            credentialSyncedAt: '2026-06-09T00:00:00.000Z',
            plaintextSecrets: false,
          },
        };
      },
      startAgentRun: async (input) => {
        startCalls.push(input);
        return {
          session: {
            sessionId: 'sess_1',
            threadId: 'thread_1',
            appId: input.request.appId,
            status: 'idle',
          },
          turn: {
            turnId: 'turn_1',
            sessionId: 'sess_1',
            threadId: 'thread_1',
            status: 'accepted',
          },
          events: [],
        };
      },
    };
    const service = await createServiceWithClient(root, client);
    const current = service.getModelSettings();
    const saved = await service.saveModelSettings({
      ...current,
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        openAiProvider({
          apiKey: 'sk-provider-sync-secret',
          baseUrl: 'https://models.example.test/v1',
        }),
      ],
    });

    assert.equal(syncCalls.length, 1);
    assert.deepEqual(syncCalls[0], {
      providerId: 'openai-compatible',
      apiKey: 'sk-provider-sync-secret',
    });
    assert.equal(JSON.stringify(saved).includes('sk-provider-sync-secret'), false);
    const credentialState = service
      .getDiagnostics()
      .appServerRuntime.modelProvider.enabledProviders.find((provider) => provider.id === 'openai-compatible')
      ?.credentialState;
    assert.equal(credentialState?.runtimeStatus, 'app-server-provider-ready');
    assert.equal(credentialState?.appServerProviderId, 'custom-provider-1');

    const result = await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.agent',
      operation: 'start',
      input: {
        prompt: 'runtime provider sync probe',
        modelPolicy: { capability: 'agent', preferredModelId: 'gpt-4.1-mini' },
        toolPolicy: { permissionMode: 'safe' },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(syncCalls.length, 1);
    assert.equal(startCalls.length, 1);
    const serializedStart = JSON.stringify(startCalls[0]);
    assert.equal(serializedStart.includes('custom-provider-1'), true);
    assert.equal(serializedStart.includes('sk-provider-sync-secret'), false);
    assert.equal(serializedStart.includes('"apiKey"'), false);

    await service.saveModelSettings({
      ...saved,
      providers: saved.providers.map((provider) =>
        provider.id === 'openai-compatible'
          ? {
              ...provider,
              displayName: 'OpenAI Compatible Updated',
              apiKey: undefined,
            }
          : provider,
      ),
    });

    assert.equal(syncCalls.length, 2);
    assert.deepEqual(syncCalls[1], {
      providerId: 'openai-compatible',
      apiKey: undefined,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 仅在缺少 App Server credential marker 时从旧 broker 迁移一次 provider key', async () => {
  const root = createTempRoot();
  try {
    const syncCalls: Array<{ providerId: string; apiKey?: string }> = [];
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      syncModelProvider: async (input) => {
        syncCalls.push({
          providerId: input.provider.id,
          apiKey: input.apiKey,
        });
        return {
          created: false,
          updated: true,
          credentialSynced: Boolean(input.apiKey),
          record: {
            desktopProviderId: input.provider.id,
            status: 'synced',
            appServerProviderId: 'custom-provider-legacy',
            appServerProviderType: 'openai-response',
            appServerProviderName: input.provider.displayName,
            apiHost: input.provider.baseUrl,
            settingsVersion: input.settingsVersion,
            syncedAt: '2026-06-09T00:00:00.000Z',
            credentialSyncedAt: input.apiKey ? '2026-06-09T00:00:00.000Z' : input.previousSyncRecord?.credentialSyncedAt,
            plaintextSecrets: false,
          },
        };
      },
    };
    const service = await createServiceWithClient(root, client);
    const { CredentialBroker } = await import('../../src/main/services/credentialBroker');
    const broker = new CredentialBroker(join(root, 'userData', 'state', 'credential-broker'));
    broker.writeModelProviderCredential({
      providerId: 'openai-compatible',
      authType: 'api-key',
      value: 'sk-legacy-broker-secret',
    });
    const current = service.getModelSettings();
    const nextSettings: ModelSettings = {
      ...current,
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        openAiProvider({
          apiKeyConfigured: true,
          baseUrl: 'https://models.example.test/v1',
        }),
      ],
    };

    const migrated = await service.saveModelSettings(nextSettings);
    assert.equal(JSON.stringify(migrated).includes('sk-legacy-broker-secret'), false);
    assert.deepEqual(syncCalls[0], {
      providerId: 'openai-compatible',
      apiKey: 'sk-legacy-broker-secret',
    });
    assert.equal(
      broker.resolveModelProviderCredential({ providerId: 'openai-compatible', authType: 'api-key' }),
      undefined,
    );

    await service.saveModelSettings({
      ...migrated,
      providers: migrated.providers.map((provider) =>
        provider.id === 'openai-compatible'
          ? {
              ...provider,
              displayName: 'OpenAI Compatible Migrated',
            }
          : provider,
      ),
    });

    assert.deepEqual(syncCalls[1], {
      providerId: 'openai-compatible',
      apiKey: undefined,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 读取模型设置时优先刷新 App Server provider projection', async () => {
  const root = createTempRoot();
  try {
    let listCalls = 0;
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      listModelProviders: async () => {
        listCalls += 1;
        return [
          {
            provider: {
              id: 'custom-provider-1',
              displayName: 'App Server OpenAI',
              protocol: 'openai-compatible',
              capabilityKinds: ['text'],
              enabled: true,
              apiKeyConfigured: true,
              authType: 'api-key',
              baseUrl: 'https://models.example.test/v1',
              useResponsesApi: true,
              models: ['gpt-4.1-mini'],
            },
            syncRecord: {
              desktopProviderId: 'custom-provider-1',
              status: 'synced',
              appServerProviderId: 'custom-provider-1',
              appServerProviderType: 'openai-response',
              appServerProviderName: 'App Server OpenAI',
              apiHost: 'https://models.example.test/v1',
              settingsVersion: '1',
              syncedAt: '2026-06-09T00:00:00.000Z',
              credentialSyncedAt: '2026-06-09T00:00:00.000Z',
              plaintextSecrets: false,
            },
          },
        ];
      },
    };
    const service = await createServiceWithClient(root, client);

    const settings = await service.getModelSettingsFresh();
    assert.equal(listCalls, 1);
    const provider = settings.providers.find((item) => item.id === 'custom-provider-1');
    assert.equal(provider?.displayName, 'App Server OpenAI');
    assert.equal(provider?.apiKeyConfigured, true);
    assert.equal(provider?.apiKey, undefined);

    const persistedSettings = readFileSync(join(root, 'userData', 'state', 'model-settings.json'), 'utf8');
    assert.equal(persistedSettings.includes('custom-provider-1'), true);
    assert.equal(JSON.parse(persistedSettings).providers[0]?.apiKeyConfigured, true);
    assert.equal(persistedSettings.includes('"apiKey"'), false);
    const credentialState = service
      .getDiagnostics()
      .appServerRuntime.modelProvider.enabledProviders.find((item) => item.id === 'custom-provider-1')
      ?.credentialState;
    assert.equal(credentialState?.storageKind, 'app-server-provider-store');
    assert.equal(credentialState?.runtimeStatus, 'app-server-provider-ready');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 在 App Server provider store 为空时不回退本地 provider 列表', async () => {
  const root = createTempRoot();
  try {
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      listModelProviders: async () => [],
    };
    const service = await createServiceWithClient(root, client);
    const settings = await service.getModelSettingsFresh();

    assert.deepEqual(settings.providers, []);
    assert.equal(settings.defaultAgentProviderId, undefined);
    assert.equal(settings.defaultTextModelId, undefined);
    assert.equal(service.getDiagnostics().appServerRuntime.readiness.state, 'needs-setup');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 刷新 App Server provider projection 时不为缺失模型的 provider 注入默认模型', async () => {
  const root = createTempRoot();
  try {
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      listModelProviders: async () => [
        {
          provider: {
            id: 'provider-without-models',
            displayName: 'Provider Without Models',
            protocol: 'openai-compatible',
            capabilityKinds: ['text'],
            enabled: true,
            apiKeyConfigured: true,
            authType: 'api-key',
            baseUrl: 'https://models.example.test/v1',
            useResponsesApi: true,
            models: [],
          },
          syncRecord: {
            desktopProviderId: 'provider-without-models',
            status: 'synced',
            appServerProviderId: 'provider-without-models',
            appServerProviderType: 'openai-response',
            appServerProviderName: 'Provider Without Models',
            apiHost: 'https://models.example.test/v1',
            settingsVersion: '1',
            syncedAt: '2026-06-09T00:00:00.000Z',
            credentialSyncedAt: '2026-06-09T00:00:00.000Z',
            plaintextSecrets: false,
          },
        },
      ],
    };
    const service = await createServiceWithClient(root, client);

    const settings = await service.getModelSettingsFresh();
    assert.equal(settings.providers.length, 1);
    assert.deepEqual(settings.providers[0]?.models, []);
    assert.equal(settings.defaultTextModelId, undefined);
    assert.equal(service.getDiagnostics().appServerRuntime.readiness.state, 'needs-setup');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 刷新 provider projection 时会迁移旧 broker key 且不重复迁移', async () => {
  const root = createTempRoot();
  try {
    const syncCalls: Array<{ providerId: string; apiKey?: string }> = [];
    const client: Partial<AppServerJsonRpcClient> = {
      connected: true,
      syncModelProvider: async (input) => {
        syncCalls.push({ providerId: input.provider.id, apiKey: input.apiKey });
        return {
          created: false,
          updated: true,
          credentialSynced: Boolean(input.apiKey),
          record: {
            desktopProviderId: input.provider.id,
            status: 'synced',
            appServerProviderId: 'openai-compatible',
            appServerProviderType: 'openai-response',
            appServerProviderName: input.provider.displayName,
            apiHost: input.provider.baseUrl,
            settingsVersion: input.settingsVersion,
            syncedAt: '2026-06-09T00:00:00.000Z',
            credentialSyncedAt: input.apiKey ? '2026-06-09T00:00:00.000Z' : input.previousSyncRecord?.credentialSyncedAt,
            plaintextSecrets: false,
          },
        };
      },
      listModelProviders: async () => [
        {
          provider: {
            id: 'openai-compatible',
            displayName: 'OpenAI Compatible',
            protocol: 'openai-compatible',
            capabilityKinds: ['text'],
            enabled: true,
            apiKeyConfigured: true,
            authType: 'api-key',
            baseUrl: 'https://models.example.test/v1',
            useResponsesApi: true,
            models: ['gpt-4.1-mini'],
          },
          syncRecord: {
            desktopProviderId: 'openai-compatible',
            status: 'synced',
            appServerProviderId: 'openai-compatible',
            appServerProviderType: 'openai-response',
            appServerProviderName: 'OpenAI Compatible',
            apiHost: 'https://models.example.test/v1',
            settingsVersion: '1',
            syncedAt: '2026-06-09T00:00:00.000Z',
            credentialSyncedAt: undefined,
            plaintextSecrets: false,
          },
        },
      ],
    };
    const offlineService = await createService(root);
    const current = offlineService.getModelSettings();
    await offlineService.saveModelSettings({
      ...current,
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        openAiProvider({
          apiKeyConfigured: true,
          baseUrl: 'https://models.example.test/v1',
        }),
      ],
    });

    const { CredentialBroker } = await import('../../src/main/services/credentialBroker');
    const broker = new CredentialBroker(join(root, 'userData', 'state', 'credential-broker'));
    broker.writeModelProviderCredential({
      providerId: 'openai-compatible',
      authType: 'api-key',
      value: 'sk-legacy-refresh-secret',
    });

    const service = await createServiceWithClient(root, client);
    await service.getModelSettingsFresh();
    await service.getModelSettingsFresh();

    assert.deepEqual(syncCalls, [
      {
        providerId: 'openai-compatible',
        apiKey: 'sk-legacy-refresh-secret',
      },
    ]);
    assert.equal(
      broker.resolveModelProviderCredential({ providerId: 'openai-compatible', authType: 'api-key' }),
      undefined,
    );
    const syncState = readFileSync(join(root, 'userData', 'state', 'model-provider-app-server-sync.json'), 'utf8');
    assert.equal(syncState.includes('sk-legacy-refresh-secret'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 通过 lime.storage capability 读写业务文档，并在 runtime event 中脱敏 value', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    const result = await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.storage',
      operation: 'write',
      input: {
        namespace: 'drafts',
        documentId: 'draft-001',
        value: {
          title: '业务敏感草稿',
          body: '只应保存在 app-storage document 中',
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal((result.output as { value: { title: string } }).value.title, '业务敏感草稿');
    const eventText = JSON.stringify(result.event);
    assert.equal(eventText.includes('业务敏感草稿'), false);
    assert.equal(eventText.includes('只应保存在 app-storage document 中'), false);
    assert.equal(eventText.includes('"valueRedacted":true'), true);

    const listResult = await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.storage',
      operation: 'list',
      input: { namespace: 'drafts' },
    });
    assert.deepEqual(
      ((listResult.output as { documents: Array<{ documentId: string }> }).documents).map((item) => item.documentId),
      ['draft-001'],
    );

    await assert.rejects(
      () =>
        service.invokeCapability({
          appId: 'product.app',
          entryKey: 'main',
          capability: 'lime.storage',
          operation: 'write',
          input: {
            namespace: 'token-vault',
            documentId: 'provider',
            value: { token: 'should-not-persist' },
          },
        }),
      /平台凭证边界/,
    );
    await assert.rejects(
      () =>
        service.invokeCapability({
          appId: 'product.app',
          entryKey: 'main',
          capability: 'lime.storage',
          operation: 'write',
          input: {
            namespace: 'drafts',
            documentId: 'draft-secret',
            value: { auth: { refreshToken: 'refresh-should-not-persist' } },
          },
        }),
      /App storage value\.auth\.refreshToken/,
    );
    await assert.rejects(
      () =>
        service.invokeCapability({
          appId: 'product.app',
          entryKey: 'main',
          capability: 'lime.storage',
          operation: 'write',
          input: {
            namespace: 'drafts',
            documentId: 'api-key',
            value: { label: 'should-not-persist' },
          },
        }),
      /App storage documentId/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformService 的 lime.agentExecution compat alias 仍委托 App Server JSON-RPC current bridge', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    await service.saveModelSettings(enableLocalModel(service.getModelSettings()));

    const result = await service.invokeCapability({
      appId: 'product.app',
      entryKey: 'main',
      capability: 'lime.agentExecution',
      operation: 'start',
      input: {
        prompt: 'compat runtime probe',
        toolPolicy: { permissionMode: 'safe' },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.error?.code, 'agent-runtime-blocked');
    const output = result.output as { bridge?: string; bridgeProfile?: { kind?: string }; runtimeContext?: { protocol?: string } };
    assert.equal(output.bridge, 'app-server-json-rpc');
    assert.equal(output.bridgeProfile?.kind, 'app-server-json-rpc');
    assert.equal(output.runtimeContext?.protocol, 'appserver.runtimeContext');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
