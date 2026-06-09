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
      /Credential Broker/,
    );
    assert.throws(
      () =>
        store.writeProductAppSettings({
          appId: 'product.app',
          namespace: 'profile',
          value: { provider: { apiKey: 'sk-should-not-persist' } },
        }),
      /Credential Broker/,
    );
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
      /Credential Broker/,
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
