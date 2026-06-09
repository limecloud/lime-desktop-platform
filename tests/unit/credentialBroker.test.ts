import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CredentialBroker } from '../../src/main/services/credentialBroker';
import { applyModelSettingsCredentials, projectModelSettingsCredentialState } from '../../src/main/services/modelSettingsCredentials';
import type { ModelSettings } from '../../src/shared/types';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'desktop-platform-credential-broker-'));
}

function createModelSettings(apiKey = 'sk-test-secret'): ModelSettings {
  return {
    version: '1',
    updatedAt: '2026-06-09T00:00:00.000Z',
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
        apiKey,
        authType: 'api-key',
        models: ['gpt-4.1-mini'],
      },
      {
        id: 'local',
        displayName: 'Local Runtime',
        protocol: 'local',
        capabilityKinds: ['text'],
        enabled: true,
        apiKeyConfigured: false,
        authType: 'none',
        models: ['local-default'],
      },
    ],
  };
}

test('CredentialBroker 加密保存并可解析模型 provider 凭证', () => {
  const root = createTempDir();
  try {
    const broker = new CredentialBroker(root);
    broker.writeModelProviderCredential({
      providerId: 'openai-compatible',
      authType: 'api-key',
      value: 'sk-test-secret',
    });

    assert.equal(broker.hasModelProviderCredential('openai-compatible'), true);
    assert.equal(
      broker.resolveModelProviderCredential({ providerId: 'openai-compatible', authType: 'api-key' }),
      'sk-test-secret',
    );

    const persisted = readFileSync(join(root, 'model-providers', 'openai-compatible.json'), 'utf8');
    assert.equal(persisted.includes('sk-test-secret'), false);
    assert.equal(persisted.includes('apiKey'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CredentialBroker 只暴露非敏感凭证状态和 rotation readiness', () => {
  const root = createTempDir();
  try {
    const broker = new CredentialBroker(root);
    const missing = broker.readModelProviderCredentialState({
      providerId: 'openai-compatible',
      authType: 'api-key',
    });
    assert.equal(missing.configured, false);
    assert.equal(missing.storageKind, 'none');
    assert.equal(missing.runtimeStatus, 'missing');

    broker.writeModelProviderCredential({
      providerId: 'openai-compatible',
      authType: 'api-key',
      value: 'sk-test-secret',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    const state = broker.readModelProviderCredentialState({
      providerId: 'openai-compatible',
      authType: 'api-key',
    });
    assert.equal(state.configured, true);
    assert.equal(state.storageKind, 'local-encrypted-file');
    assert.equal(state.keychainBacked, false);
    assert.equal(state.expiresAt, '2026-01-01T00:00:00.000Z');
    assert.equal(state.rotationRequired, true);
    assert.equal(state.runtimeStatus, 'rotation-required');
    assert.equal(state.plaintextSecrets, false);
    assert.equal(JSON.stringify(state).includes('sk-test-secret'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('applyModelSettingsCredentials 写入 broker 并从普通 ModelSettings 剔除 apiKey', () => {
  const root = createTempDir();
  try {
    const broker = new CredentialBroker(root);
    const sanitized = applyModelSettingsCredentials(createModelSettings(), broker);
    const provider = sanitized.providers.find((item) => item.id === 'openai-compatible');
    const local = sanitized.providers.find((item) => item.id === 'local');

    assert.equal(provider?.apiKey, undefined);
    assert.equal(provider?.apiKeyConfigured, true);
    assert.equal(local?.apiKeyConfigured, true);
    assert.equal(
      broker.resolveModelProviderCredential({ providerId: 'openai-compatible', authType: 'api-key' }),
      'sk-test-secret',
    );

    const projected = projectModelSettingsCredentialState(
      {
        ...sanitized,
        providers: sanitized.providers.map((item) =>
          item.id === 'openai-compatible' ? { ...item, apiKeyConfigured: false } : item,
        ),
      },
      broker,
    );
    assert.equal(projected.providers.find((item) => item.id === 'openai-compatible')?.apiKeyConfigured, true);
    assert.equal(JSON.stringify(projected).includes('sk-test-secret'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('apiKeyConfigured 以 broker 为事实源，不信任普通 JSON 中的陈旧标记', () => {
  const root = createTempDir();
  try {
    const broker = new CredentialBroker(root);
    const sanitized = applyModelSettingsCredentials(createModelSettings(''), broker);
    const provider = sanitized.providers.find((item) => item.id === 'openai-compatible');
    assert.equal(provider?.apiKey, undefined);
    assert.equal(provider?.apiKeyConfigured, false);

    const projected = projectModelSettingsCredentialState(
      {
        ...sanitized,
        providers: sanitized.providers.map((item) =>
          item.id === 'openai-compatible' ? { ...item, apiKeyConfigured: true } : item,
        ),
      },
      broker,
    );
    assert.equal(projected.providers.find((item) => item.id === 'openai-compatible')?.apiKeyConfigured, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
