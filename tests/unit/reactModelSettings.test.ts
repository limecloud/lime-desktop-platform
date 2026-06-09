import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModelSettingsFromDrafts } from '../../packages/react/src/index';
import type {
  BuildModelSettingsFromDraftsInput,
  PlatformModelSettingsProjection,
  PlatformModelProviderProjection,
  ProviderDraftState,
} from '../../packages/react/src/index';

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
