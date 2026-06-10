import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureElectronMock, installElectronMock } from './electronMock';

installElectronMock();

function createTempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'desktop-platform-store-'));
}

async function createStore(root: string) {
  configureElectronMock({
    userData: join(root, 'userData'),
    appPath: process.cwd(),
    version: '0.1.4-test',
  });
  const { PlatformStore } = await import('../../src/main/services/platformStore');
  return new PlatformStore();
}

test('PlatformStore 按 appId + namespace + scope 隔离业务 App 独特设置', async () => {
  const root = createTempRoot();
  try {
    const store = await createStore(root);
    assert.equal(existsSync(store.getCredentialBrokerDir()), false);
    const workspaceRecord = store.writeProductAppSettings({
      appId: 'product.app',
      namespace: 'profile',
      scope: 'workspace',
      value: { tone: 'team-default' },
    });
    const userRecord = store.writeProductAppSettings({
      appId: 'product.app',
      namespace: 'profile',
      scope: 'user',
      value: { tone: 'personal' },
    });

    assert.equal(workspaceRecord.version, '1');
    assert.equal(userRecord.version, '1');
    assert.deepEqual(
      store.readProductAppSettings({ appId: 'product.app', namespace: 'profile', scope: 'workspace' }).value,
      { tone: 'team-default' },
    );
    assert.deepEqual(store.readProductAppSettings({ appId: 'product.app', namespace: 'profile', scope: 'user' }).value, {
      tone: 'personal',
    });

    const paths = store.getPaths();
    assert.equal(existsSync(join(paths.workspaceStateDir, 'product-settings', 'product.app', 'profile.json')), true);
    assert.equal(existsSync(join(paths.userStateDir, 'product-settings', 'product.app', 'profile.json')), true);

    assert.throws(
      () =>
        store.writeProductAppSettings({
          appId: '../escape',
          namespace: 'profile',
          value: { blocked: true },
        }),
      /Product App store appId/,
    );
    assert.throws(
      () =>
        store.writeProductAppSettings({
          appId: 'product.app',
          namespace: 'token-vault',
          value: { label: '不能把凭证塞进业务设置 namespace' },
        }),
      /平台凭证边界/,
    );
    assert.throws(
      () =>
        store.writeProductAppSettings({
          appId: 'product.app',
          namespace: 'profile',
          value: { provider: { apiKey: 'sk-should-not-persist' } },
        }),
      /平台凭证边界/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformStore 读取旧平台设置时补齐 appearance 默认值', async () => {
  const root = createTempRoot();
  try {
    configureElectronMock({
      userData: join(root, 'userData'),
      appPath: process.cwd(),
      version: '0.1.4-test',
    });
    const userStateDir = join(root, 'userData', 'state');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(userStateDir, { recursive: true });
    writeFileSync(
      join(userStateDir, 'platform-settings.json'),
      JSON.stringify({
        version: '7',
        updatedAt: '2026-06-09T00:00:00.000Z',
        locale: 'zh-CN',
        theme: 'dark',
        workspacePath: join(root, 'workspace'),
        proxy: { enabled: false, url: '' },
        developerMode: true,
      }),
      'utf8',
    );
    const { PlatformStore } = await import('../../src/main/services/platformStore');
    const store = new PlatformStore();
    const settings = store.readPlatformSettings();

    assert.deepEqual(settings.appearance, {
      colorTheme: 'emerald',
      fontScale: 1,
      serifEnabled: false,
    });
    assert.equal(settings.general.notificationsEnabled, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformStore 新工作区默认不注入固定模型 Provider', async () => {
  const root = createTempRoot();
  try {
    const store = await createStore(root);
    const settings = store.readModelSettings();

    assert.deepEqual(settings.providers, []);
    assert.equal(settings.defaultAgentProviderId, undefined);
    assert.equal(settings.defaultTextModelId, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('PlatformStore 用 workspace document 托管 lime.storage，并阻断凭证类 namespace', async () => {
  const root = createTempRoot();
  try {
    const store = await createStore(root);
    const first = store.writeAppStorageDocument({
      appId: 'product.app',
      namespace: 'drafts',
      documentId: 'draft-001',
      value: { title: '初稿', status: 'draft' },
    });
    const second = store.writeAppStorageDocument({
      appId: 'product.app',
      namespace: 'drafts',
      documentId: 'draft-001',
      value: { title: '定稿', status: 'ready' },
    });

    assert.equal(first.version, '1');
    assert.equal(second.version, '2');
    assert.equal(second.createdAt, first.createdAt);
    assert.deepEqual(store.readAppStorageDocument({ appId: 'product.app', namespace: 'drafts', documentId: 'draft-001' }).value, {
      title: '定稿',
      status: 'ready',
    });
    assert.deepEqual(
      store.listAppStorageDocuments({ appId: 'product.app', namespace: 'drafts' }).documents.map((item) => item.documentId),
      ['draft-001'],
    );

    const documentPath = join(
      store.getPaths().workspaceStateDir,
      'app-storage',
      'workspace',
      'product.app',
      'drafts',
      'draft-001.json',
    );
    assert.equal(JSON.parse(readFileSync(documentPath, 'utf8')).value.status, 'ready');

    assert.throws(
      () =>
        store.writeAppStorageDocument({
          appId: 'product.app',
          namespace: 'api-key',
          documentId: 'provider',
          value: { apiKey: 'sk-should-not-persist' },
        }),
      /平台凭证边界/,
    );
    assert.throws(
      () =>
        store.writeAppStorageDocument({
          appId: 'product.app',
          namespace: 'drafts',
          documentId: 'draft-secret',
          value: { provider: { apiKey: 'sk-should-not-persist' } },
        }),
      /App storage value\.provider\.apiKey/,
    );
    assert.throws(
      () =>
        store.writeAppStorageDocument({
          appId: 'product.app',
          namespace: 'drafts',
          documentId: 'refresh-token',
          value: { label: '不能把凭证语义塞进 documentId' },
        }),
      /App storage documentId/,
    );
    assert.throws(
      () =>
        store.readAppStorageDocument({
          appId: 'product.app',
          namespace: 'drafts',
          documentId: 'draft-001',
          scope: 'user' as never,
        }),
      /workspace scope/,
    );
    assert.equal(store.deleteAppStorageDocument({ appId: 'product.app', namespace: 'drafts', documentId: 'draft-001' }).deleted, true);
    assert.equal(store.deleteAppStorageDocument({ appId: 'product.app', namespace: 'drafts', documentId: 'draft-001' }).deleted, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
