import assert from 'node:assert/strict';
import test from 'node:test';
import { createSafeCapabilityEventPayload } from '../../src/main/services/capabilityEventPayload';
import type { CapabilityInvokeInput } from '../../src/shared/types';

test('lime.agent runtime event payload 只记录输入摘要，不持久化 prompt 或密钥字段', () => {
  const prompt = '请处理这段内容，里面可能包含用户敏感文本。';
  const payload = createSafeCapabilityEventPayload({
    appId: 'lime.platform.conformance',
    entryKey: 'main',
    capability: 'lime.agent',
    operation: 'start',
    input: {
      prompt,
      apiKey: 'sk-should-not-persist',
      token: 'token-should-not-persist',
      runtimeOptions: {
        capabilityId: 'lime.agent',
        modelId: 'gpt-4.1-mini',
        permissionMode: 'safe',
      },
      modelPolicy: {
        preferredModelId: 'gpt-4.1-mini',
        capability: 'agent',
      },
      toolPolicy: {
        allowedToolIds: ['search', 'write'],
        permissionMode: 'ask',
      },
      attachments: [{ kind: 'text', ref: 'doc-1' }],
    },
  });

  assert.deepEqual(payload, {
    operation: 'start',
      inputSummary: {
        hasPrompt: true,
        promptChars: prompt.length,
      attachmentCount: 1,
      runtimeOptions: {
        capabilityId: 'lime.agent',
        workflowId: undefined,
        modelId: 'gpt-4.1-mini',
        permissionMode: 'safe',
      },
      modelPolicy: {
        preferredModelId: 'gpt-4.1-mini',
        capability: 'agent',
      },
      toolPolicy: {
        allowedToolCount: 2,
        permissionMode: 'ask',
      },
    },
  });
  assert.equal(JSON.stringify(payload).includes('sk-should-not-persist'), false);
  assert.equal(JSON.stringify(payload).includes('token-should-not-persist'), false);
});

test('非 runtime capability event payload 会递归清洗敏感键但保留 apiKeyConfigured 状态', () => {
  const payload = createSafeCapabilityEventPayload({
    appId: 'lime.platform.conformance',
    entryKey: 'settings',
    capability: 'lime.modelSettings',
    operation: 'preview',
    input: {
      provider: {
        id: 'openai-compatible',
        apiKey: 'sk-should-not-persist',
        apiKeyConfigured: true,
        nested: { refreshToken: 'refresh-should-not-persist' },
      },
    },
  } as CapabilityInvokeInput);

  assert.deepEqual(payload, {
    operation: 'preview',
    input: {
      provider: {
        id: 'openai-compatible',
        apiKey: '[redacted]',
        apiKeyConfigured: true,
        nested: { refreshToken: '[redacted]' },
      },
    },
  });
});
