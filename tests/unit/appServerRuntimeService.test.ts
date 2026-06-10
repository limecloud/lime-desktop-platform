import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AppServerRuntimeService,
  createAppServerRuntimeOptionsProjection,
} from '../../src/main/services/appServerRuntimeService';
import type { AppServerJsonRpcClient } from '../../src/main/services/appServerJsonRpcClient';
import type { CapabilityInvokeInput, ModelProviderConfig, ModelProviderCredentialState, ModelSettings } from '../../src/shared/types';

function createModelSettings(overrides: Partial<ModelSettings> = {}): ModelSettings {
  return {
    version: 'test-settings-v1',
    updatedAt: '2026-06-09T00:00:00.000Z',
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
      {
        id: 'openai-compatible',
        displayName: 'OpenAI Compatible',
        protocol: 'openai-compatible',
        capabilityKinds: ['text', 'image'],
        enabled: true,
        apiKeyConfigured: true,
        authType: 'api-key',
        baseUrl: 'https://models.example.test/v1',
        useResponsesApi: true,
        models: ['gpt-4.1-mini', 'gpt-4.1'],
      },
    ],
    ...overrides,
  };
}

function createInvokeInput(input: CapabilityInvokeInput['input'] = {}): CapabilityInvokeInput {
  return {
    appId: 'lime.platform.conformance',
    entryKey: 'main',
    capability: 'lime.agent',
    operation: 'start',
    input,
  };
}

function createBrokerCredentialState(provider: ModelProviderConfig): ModelProviderCredentialState {
  const authType = provider.authType ?? 'api-key';
  if (authType === 'none') {
    return {
      providerId: provider.id,
      authType,
      configured: true,
      storageKind: 'none',
      keychainBacked: false,
      rotationRequired: false,
      runtimeStatus: 'not-required',
      plaintextSecrets: false,
    };
  }

  return {
    providerId: provider.id,
    authType,
    configured: true,
    storageKind: 'local-encrypted-file',
    keychainBacked: false,
    rotationRequired: false,
    runtimeStatus: 'broker-reference-only',
    plaintextSecrets: false,
  };
}

test('start 生成 host-mediated runtimeContext 并随 request/result/event 同步返回', async () => {
  const service = new AppServerRuntimeService();
  const result = await service.start(createInvokeInput({ toolPolicy: { permissionMode: 'safe' } }), {
    modelSettings: createModelSettings(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'blocked');
  assert.equal(result.bridge, 'app-server-json-rpc');
  assert.equal(result.runtimeContext.protocol, 'appserver.runtimeContext');
  assert.equal(result.runtimeContext.source, 'desktop-platform-model-settings');
  assert.equal(result.runtimeContext.permissionMode, 'safe');
  assert.equal(result.runtimeContext.credentialPolicy.handoff, 'credential-ref-only');
  assert.equal(result.runtimeContext.credentialPolicy.plaintextSecrets, false);
  assert.equal(result.runtimeContext.credentialPolicy.resolver, 'app-server-provider-store');
  assert.equal(result.runtimeContext.credentialPolicy.runtimeStatus, 'not-required');
  assert.equal(result.runtimeContext.credentialPolicy.productionInjectionReady, true);
  assert.equal(result.runtimeContext.modelProfile?.settingsVersion, 'test-settings-v1');
  assert.equal(result.runtimeContext.modelProfile?.provider.id, 'local');
  assert.equal(result.runtimeContext.modelProfile?.provider.authType, 'none');
  assert.equal(result.runtimeContext.modelProfile?.provider.credentialConfigured, true);
  assert.equal(result.runtimeContext.modelProfile?.provider.credentialRef, undefined);
  assert.equal(result.runtimeContext.modelProfile?.modelId, 'local-default');
  assert.equal(result.request.runtimeContext, result.runtimeContext);

  const eventPayload = result.events[0]?.payload as { runtimeContext?: unknown };
  assert.equal(eventPayload.runtimeContext, result.runtimeContext);
});

test('preferredModelId 可切换到非默认 provider，并只传 credentialRef 不传明文凭证', async () => {
  const service = new AppServerRuntimeService(undefined, createBrokerCredentialState);
  const result = await service.start(
    createInvokeInput({
      modelPolicy: { capability: 'agent', preferredModelId: 'gpt-4.1-mini' },
      runtimeOptions: { permissionMode: 'ask' },
    }),
    { modelSettings: createModelSettings() },
  );

  const modelProfile = result.runtimeContext.modelProfile;
  assert.equal(modelProfile?.provider.id, 'openai-compatible');
  assert.equal(modelProfile?.provider.protocol, 'openai-compatible');
  assert.equal(modelProfile?.provider.baseUrl, 'https://models.example.test/v1');
  assert.equal(modelProfile?.provider.useResponsesApi, true);
  assert.equal(modelProfile?.provider.credentialConfigured, true);
  assert.deepEqual(modelProfile?.provider.credentialRef, {
    kind: 'model-provider',
    providerId: 'openai-compatible',
    authType: 'api-key',
    resolver: 'desktop-host-credential-broker',
    configured: true,
    storageKind: 'local-encrypted-file',
    keychainBacked: false,
    rotationRequired: false,
    runtimeStatus: 'broker-reference-only',
    productionInjectionReady: false,
  });
  assert.equal(result.runtimeContext.credentialPolicy.runtimeStatus, 'broker-reference-only');
  assert.equal(result.runtimeContext.credentialPolicy.productionInjectionReady, false);
  assert.equal(modelProfile?.modelId, 'gpt-4.1-mini');
  assert.equal(modelProfile?.requestedModelId, 'gpt-4.1-mini');
  assert.equal(result.runtimeContext.credentialPolicy.resolver, 'desktop-host-credential-broker');

  const serializedRuntimeContext = JSON.stringify(result.runtimeContext);
  assert.equal(serializedRuntimeContext.includes('apiKey'), false);
  assert.equal(serializedRuntimeContext.includes('token'), false);
  assert.equal(serializedRuntimeContext.includes('secret'), false);
});

test('缺少可用模型时保留 fail-closed，并暴露可修复的模型设置原因', async () => {
  const service = new AppServerRuntimeService();
  const result = await service.start(createInvokeInput(), {
    modelSettings: createModelSettings({
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        {
          id: 'openai-compatible',
          displayName: 'OpenAI Compatible',
          protocol: 'openai-compatible',
          capabilityKinds: ['text'],
          enabled: true,
          apiKeyConfigured: false,
          authType: 'api-key',
          models: ['gpt-4.1-mini'],
        },
      ],
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'blocked');
  assert.equal(result.runtimeContext.modelProfile, undefined);
  assert.equal(result.readiness.setupActions.includes('open-model-settings'), true);
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'agent-model-required' && reason.fixable),
    true,
  );
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'app-server-client-not-configured' && !reason.fixable),
    true,
  );
});

test('provider 已同步但没有模型 ID 时不能判为可用 Agent 模型', async () => {
  const fakeClient = {
    connected: true,
    startAgentRun: async () => {
      throw new Error('缺少模型 ID 时不应进入 App Server turn start');
    },
  } as unknown as AppServerJsonRpcClient;
  const service = new AppServerRuntimeService(
    {
      getClient: () => fakeClient,
      isConnected: () => true,
      isConfigured: () => true,
    },
    (provider) => ({
      providerId: provider.id,
      authType: provider.authType ?? 'api-key',
      configured: true,
      storageKind: 'app-server-provider-store',
      keychainBacked: false,
      rotationRequired: false,
      runtimeStatus: 'app-server-provider-ready',
      appServerProviderId: provider.id,
      appServerSyncStatus: 'synced',
      plaintextSecrets: false,
    }),
  );

  const result = await service.start(createInvokeInput(), {
    modelSettings: createModelSettings({
      defaultAgentProviderId: 'provider-without-models',
      defaultTextModelId: undefined,
      providers: [
        {
          id: 'provider-without-models',
          displayName: 'Provider Without Models',
          protocol: 'openai-compatible',
          capabilityKinds: ['text'],
          enabled: true,
          apiKeyConfigured: true,
          authType: 'api-key',
          baseUrl: 'https://models.example.test/v1',
          models: [],
        },
      ],
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'needs-setup');
  assert.equal(result.runtimeContext.modelProfile, undefined);
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'agent-model-required'),
    true,
  );
});

test('diagnostics 使用同一份非敏感 runtimeContext 投影', () => {
  const diagnostics = new AppServerRuntimeService().describeRuntime(createModelSettings());

  assert.equal(diagnostics.currentCapability, 'lime.agent');
  assert.deepEqual(diagnostics.compatCapabilities, ['lime.agentExecution']);
  assert.equal(diagnostics.bridgeProfile.kind, 'app-server-json-rpc');
  assert.equal(diagnostics.client.connected, false);
  assert.equal(diagnostics.runtimeContext.protocol, 'appserver.runtimeContext');
  assert.equal(diagnostics.runtimeContext.modelProfile?.provider.id, 'local');
  assert.equal(diagnostics.runtimeContext.modelProfile?.modelId, 'local-default');
  assert.equal(diagnostics.runtimeContext.credentialPolicy.runtimeStatus, 'not-required');
  assert.equal(diagnostics.modelProvider.enabledProviders[0]?.credentialState.runtimeStatus, 'not-required');
});

test('runtime options projection 映射为 App Server current provider/model 字段', async () => {
  const service = new AppServerRuntimeService(undefined, createBrokerCredentialState);
  const result = await service.start(
    createInvokeInput({
      modelPolicy: { capability: 'agent', preferredModelId: 'gpt-4.1-mini' },
      runtimeOptions: { capabilityId: 'lime.agent', permissionMode: 'safe', workflowId: 'workflow-1' },
    }),
    { modelSettings: createModelSettings() },
  );

  const projection = createAppServerRuntimeOptionsProjection(result.request, result.runtimeContext);
  assert.equal(projection.stream, true);
  assert.equal(projection.capabilityId, 'lime.agent');
  assert.deepEqual(projection.metadata, {
    workflowId: 'workflow-1',
    requestedModelId: 'gpt-4.1-mini',
    permissionMode: 'safe',
  });
  assert.equal(projection.providerPreference, 'openai-compatible');
  assert.equal(projection.modelPreference, 'gpt-4.1-mini');
  assert.equal(projection.hostOptions.desktopPlatformRuntimeContext, result.runtimeContext);

  const serializedProjection = JSON.stringify(projection);
  assert.equal(serializedProjection.includes('sk-'), false);
  assert.equal(serializedProjection.includes('apiKey'), false);
  assert.equal(serializedProjection.includes('token'), false);
  assert.equal(serializedProjection.includes('secret'), false);
});

test('provider 已同步到 App Server 时 runtime providerPreference 使用 App Server provider id', async () => {
  const service = new AppServerRuntimeService(undefined, (provider) => ({
    providerId: provider.id,
    authType: provider.authType ?? 'api-key',
    configured: true,
    storageKind: provider.id === 'openai-compatible' ? 'app-server-provider-store' : 'none',
    keychainBacked: false,
    rotationRequired: false,
    runtimeStatus: provider.id === 'openai-compatible' ? 'app-server-provider-ready' : 'not-required',
    appServerProviderId: provider.id === 'openai-compatible' ? 'custom-provider-1' : undefined,
    appServerProviderType: provider.id === 'openai-compatible' ? 'openai-response' : undefined,
    appServerSyncStatus: provider.id === 'openai-compatible' ? 'synced' : undefined,
    appServerCredentialSyncedAt: provider.id === 'openai-compatible' ? '2026-06-09T00:00:00.000Z' : undefined,
    plaintextSecrets: false,
  }));
  const result = await service.start(
    createInvokeInput({
      modelPolicy: { capability: 'agent', preferredModelId: 'gpt-4.1-mini' },
    }),
    { modelSettings: createModelSettings() },
  );

  assert.equal(result.runtimeContext.modelProfile?.provider.id, 'openai-compatible');
  assert.equal(result.runtimeContext.modelProfile?.provider.appServerProviderId, 'custom-provider-1');
  assert.equal(result.runtimeContext.modelProfile?.provider.credentialRef?.resolver, 'app-server-provider-store');
  assert.equal(result.runtimeContext.modelProfile?.provider.credentialRef?.storageKind, 'app-server-provider-store');
  assert.equal(result.runtimeContext.credentialPolicy.resolver, 'app-server-provider-store');
  assert.equal(result.runtimeContext.credentialPolicy.runtimeStatus, 'app-server-provider-ready');
  assert.equal(result.runtimeContext.credentialPolicy.productionInjectionReady, true);
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'host-credential-resolver-required'),
    false,
  );

  const projection = createAppServerRuntimeOptionsProjection(result.request, result.runtimeContext);
  assert.equal(projection.providerPreference, 'custom-provider-1');
  assert.equal(projection.modelPreference, 'gpt-4.1-mini');
  assert.equal(JSON.stringify(projection).includes('sk-'), false);
});

test('legacy resolver-ready 不再作为 live provider production ready', async () => {
  const fakeClient = {
    connected: true,
    startAgentRun: async () => {
      throw new Error('legacy resolver-ready 不应进入 App Server turn start');
    },
  } as unknown as AppServerJsonRpcClient;
  const service = new AppServerRuntimeService(
    {
      getClient: () => fakeClient,
      isConnected: () => true,
      isConfigured: () => true,
    },
    (provider) => ({
      providerId: provider.id,
      authType: provider.authType ?? 'api-key',
      configured: true,
      storageKind: provider.authType === 'none' ? 'none' : 'local-encrypted-file',
      keychainBacked: false,
      rotationRequired: false,
      runtimeStatus: provider.authType === 'none' ? 'not-required' : 'resolver-ready',
      plaintextSecrets: false,
    }),
  );
  const result = await service.start(
    createInvokeInput({
      modelPolicy: { capability: 'agent', preferredModelId: 'gpt-4.1-mini' },
    }),
    { modelSettings: createModelSettings(), workspaceId: '/workspace', locale: 'zh-CN' },
  );

  assert.equal(result.ok, false);
  assert.equal(result.state, 'blocked');
  assert.equal(result.runtimeContext.credentialPolicy.resolver, 'desktop-host-credential-broker');
  assert.equal(result.runtimeContext.credentialPolicy.runtimeStatus, 'resolver-ready');
  assert.equal(result.runtimeContext.credentialPolicy.productionInjectionReady, false);
  assert.equal(result.runtimeContext.modelProfile?.provider.credentialRef?.productionInjectionReady, false);
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'host-credential-resolver-required' && !reason.fixable),
    true,
  );
});

test('存在 App Server client 时 start 进入 JSON-RPC started 路径', async () => {
  const fakeClient = {
    connected: true,
    startAgentRun: async () => ({
      session: {
        sessionId: 'sess_1',
        threadId: 'thread_1',
        appId: 'lime.platform.conformance',
        status: 'idle',
      },
      turn: {
        turnId: 'turn_1',
        sessionId: 'sess_1',
        threadId: 'thread_1',
        status: 'accepted',
      },
      events: [],
    }),
  } as unknown as AppServerJsonRpcClient;
  const service = new AppServerRuntimeService({
    getClient: () => fakeClient,
    isConnected: () => true,
    isConfigured: () => true,
  });
  const result = await service.start(createInvokeInput({ toolPolicy: { permissionMode: 'safe' } }), {
    modelSettings: createModelSettings(),
    workspaceId: '/workspace',
    locale: 'zh-CN',
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'started');
  assert.equal(result.readiness.state, 'ready');
  assert.equal(
    result.readiness.reasons.some((reason) => reason.code === 'app-server-client-not-connected'),
    false,
  );
  assert.equal(result.sessionId, 'sess_1');
  assert.equal(result.threadId, 'thread_1');
  assert.equal(result.turnId, 'turn_1');
  assert.equal(result.appServer?.session?.sessionId, 'sess_1');
  assert.equal(result.appServer?.turn?.turnId, 'turn_1');
  assert.equal(result.events[0]?.type, 'started');
  assert.equal(result.events[0]?.method, 'agentSession/turn/start');

  const diagnostics = service.describeRuntime(createModelSettings());
  assert.equal(diagnostics.state, 'ready');
  assert.equal(diagnostics.client.connected, true);
  assert.equal(diagnostics.client.state, 'connected');
});
