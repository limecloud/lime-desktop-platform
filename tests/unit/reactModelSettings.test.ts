import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildModelSettingsFromDrafts,
  createDefaultModelProviderProjection,
  getModelSettingsProjectionFromHostSnapshot,
  normalizeModelProviders,
} from '../../packages/react/src/index';
import type {
  BuildModelSettingsFromDraftsInput,
  PlatformModelSettingsProjection,
  PlatformModelProviderProjection,
  ProviderDraftState,
} from '../../packages/react/src/index';

test('normalizeModelProviders 不向空投影注入固定 Provider', () => {
  assert.deepEqual(normalizeModelProviders([]), []);
});

test('createDefaultModelProviderProjection 不再生成固定 Provider', () => {
  assert.deepEqual(createDefaultModelProviderProjection('legacy-version'), []);
});

test('getModelSettingsProjectionFromHostSnapshot 读取非敏感 Host Snapshot provider metadata', () => {
  const projection = getModelSettingsProjectionFromHostSnapshot({
    hostKind: 'electron',
    hostVersion: '0.1.5-test',
    appId: 'product.app',
    entryKey: 'main',
    locale: 'zh-CN',
    theme: 'system',
    modelSettingsVersion: 'legacy-version',
    modelSettings: {
      version: 'provider-store-v2',
      updatedAt: '2026-06-10T00:00:00.000Z',
      defaultAgentProviderId: 'openai-compatible',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
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
          models: ['gpt-4.1-mini'],
        },
      ],
    },
  });

  assert.equal(projection.version, 'provider-store-v2');
  assert.equal(projection.defaultAgentProviderId, 'openai-compatible');
  assert.equal(projection.defaultTextModelId, 'gpt-4.1-mini');
  assert.deepEqual(projection.providers.map((provider) => provider.id), ['openai-compatible']);
  assert.equal(projection.providers[0]?.apiKeyConfigured, true);
  assert.equal(JSON.stringify(projection).includes('"apiKey"'), false);
  assert.equal(JSON.stringify(projection).includes('secret'), false);
});

test('normalizeModelProviders 只规范宿主传入的 Provider', () => {
  const providers = normalizeModelProviders([
    {
      id: 'product-provider',
      displayName: '业务 Provider',
      protocol: 'openai-compatible',
      capabilityKinds: ['text'],
      models: [],
    },
  ]);

  assert.deepEqual(providers.map((provider) => provider.id), ['product-provider']);
  assert.equal(providers[0]?.authType, 'api-key');
  assert.equal(providers[0]?.enabled, false);
  assert.equal(providers[0]?.apiKeyConfigured, false);
  assert.deepEqual(providers[0]?.models, []);
});

test('buildModelSettingsFromDrafts 不向空模型列表注入默认模型', () => {
  const providers: PlatformModelProviderProjection[] = [
    {
      id: 'custom-provider-1',
      displayName: '自定义 Provider',
      protocol: 'openai-compatible',
      capabilityKinds: ['text'],
      enabled: true,
      apiKeyConfigured: false,
      authType: 'api-key',
      models: [],
    },
  ];
  const drafts: Record<string, ProviderDraftState> = {
    'custom-provider-1': {
      apiKey: '',
      apiKeyConfigured: false,
      authType: 'api-key',
      baseUrl: 'https://models.example.test/v1',
      displayName: '自定义 Provider',
      enabled: true,
      modelInput: '',
      models: [],
      protocol: 'openai-compatible',
      useResponsesApi: true,
    },
  };

  const settings = buildModelSettingsFromDrafts({
    current: { providers },
    providers,
    drafts,
    selectedProviderId: 'custom-provider-1',
  });

  assert.deepEqual(settings.providers[0]?.models, []);
  assert.equal(settings.defaultTextModelId, undefined);
});

test('buildModelSettingsFromDrafts 把模型设置页新输入的 API Key 作为短程 saveModel 入参', () => {
  const current: PlatformModelSettingsProjection = {
    version: '3',
    updatedAt: '2026-06-09T00:00:00.000Z',
    defaultAgentProviderId: 'openai-compatible',
    defaultTextModelId: 'gpt-4.1-mini',
    providers: [],
  };
  const providers: PlatformModelProviderProjection[] = [
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
  ];
  const drafts: Record<string, ProviderDraftState> = {
    'openai-compatible': {
      apiKey: '  sk-ui-secret  ',
      apiKeyConfigured: false,
      authType: 'api-key',
      baseUrl: ' https://models.example.test/v1 ',
      displayName: ' OpenAI Compatible ',
      enabled: true,
      modelInput: '',
      models: ['gpt-4.1-mini'],
      protocol: 'openai-compatible',
      useResponsesApi: true,
    },
  };
  const input: BuildModelSettingsFromDraftsInput = {
    current,
    providers,
    drafts,
    selectedProviderId: 'openai-compatible',
  };

  const settings = buildModelSettingsFromDrafts(input);
  const provider = settings.providers[0];
  assert.equal(provider?.apiKey, 'sk-ui-secret');
  assert.equal(provider?.apiKeyConfigured, true);
  assert.equal(provider?.baseUrl, 'https://models.example.test/v1');
  assert.equal(settings.defaultAgentProviderId, 'openai-compatible');
  assert.equal(settings.defaultTextModelId, 'gpt-4.1-mini');
});

test('buildModelSettingsFromDrafts 对 none auth 不携带 API Key', () => {
  const providers: PlatformModelProviderProjection[] = [
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
  ];
  const drafts: Record<string, ProviderDraftState> = {
    local: {
      apiKey: 'should-not-send',
      apiKeyConfigured: true,
      authType: 'none',
      baseUrl: '',
      displayName: 'Local Runtime',
      enabled: true,
      modelInput: '',
      models: ['local-default'],
      protocol: 'local',
      useResponsesApi: false,
    },
  };

  const settings = buildModelSettingsFromDrafts({
    current: { providers },
    providers,
    drafts,
    selectedProviderId: 'local',
  });

  assert.equal(settings.providers[0]?.apiKey, undefined);
  assert.equal(settings.providers[0]?.apiKeyConfigured, true);
});
