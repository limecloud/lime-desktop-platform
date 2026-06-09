import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  return withoutControlPlaneEnv(() => new PlatformService());
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
      new PlatformService({
        getClient: () => client as AppServerJsonRpcClient,
        isConnected: () => Boolean(client.connected),
        isConfigured: () => true,
      }),
  );
}

function enableLocalModel(settings: ModelSettings): ModelSettings {
  return {
    ...settings,
    defaultAgentProviderId: 'local',
    defaultTextModelId: 'local-default',
    providers: settings.providers.map((provider) =>
      provider.id === 'local'
        ? {
            ...provider,
            enabled: true,
            authType: 'none',
            apiKeyConfigured: true,
          }
        : provider,
    ),
  };
}

test('PlatformService 保存 provider 设置时把 API Key 写入 broker，普通设置和诊断不含明文', async () => {
  const root = createTempRoot();
  try {
    const service = await createService(root);
    const current = service.getModelSettings();
    const nextSettings: ModelSettings = {
      ...current,
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: current.providers.map((provider) =>
        provider.id === 'openai-compatible'
          ? {
              ...provider,
              enabled: true,
              apiKeyConfigured: false,
              apiKey: 'sk-unit-secret',
              authType: 'api-key',
            }
          : provider,
      ),
    };

    const saved = await service.saveModelSettings(nextSettings);
    const savedProvider = saved.providers.find((provider) => provider.id === 'openai-compatible');
    assert.equal(savedProvider?.apiKey, undefined);
    assert.equal(savedProvider?.apiKeyConfigured, true);

    const userStateDir = join(root, 'userData', 'state');
    const persistedSettings = readFileSync(join(userStateDir, 'model-settings.json'), 'utf8');
    assert.equal(persistedSettings.includes('sk-unit-secret'), false);
    assert.equal(persistedSettings.includes('"apiKey"'), false);

    const brokerPath = join(userStateDir, 'credential-broker', 'model-providers', 'openai-compatible.json');
    assert.equal(existsSync(brokerPath), true);
    const persistedCredential = readFileSync(brokerPath, 'utf8');
    assert.equal(persistedCredential.includes('sk-unit-secret'), false);
    assert.equal(persistedCredential.includes('apiKey'), false);

    const syncStatePath = join(userStateDir, 'model-provider-app-server-sync.json');
    assert.equal(existsSync(syncStatePath), true);
    const persistedSyncState = readFileSync(syncStatePath, 'utf8');
    assert.equal(persistedSyncState.includes('sk-unit-secret'), false);
    assert.equal(persistedSyncState.includes('"apiKey"'), false);
    assert.equal(persistedSyncState.includes('"status": "failed"'), true);
    assert.equal(persistedSyncState.includes('App Server JSON-RPC sidecar 未配置。'), true);

    const projected = service.getModelSettings().providers.find((provider) => provider.id === 'openai-compatible');
    assert.equal(projected?.apiKey, undefined);
    assert.equal(projected?.apiKeyConfigured, true);
    const diagnosticsText = JSON.stringify(service.getDiagnostics());
    assert.equal(diagnosticsText.includes('sk-unit-secret'), false);
    assert.equal(diagnosticsText.includes('App Server JSON-RPC sidecar 未配置。'), true);
  } finally {
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
      providers: current.providers.map((provider) =>
        provider.id === 'openai-compatible'
          ? {
              ...provider,
              enabled: true,
              apiKeyConfigured: false,
              apiKey: 'sk-provider-sync-secret',
              authType: 'api-key',
              baseUrl: 'https://models.example.test/v1',
              useResponsesApi: true,
            }
          : provider,
      ),
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
      /Credential Broker/,
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
