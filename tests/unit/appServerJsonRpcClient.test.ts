import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  AppServerJsonRpcClient,
  AppServerSidecarLifecycle,
  resolveAppServerSidecarLaunchConfig,
} from '../../src/main/services/appServerJsonRpcClient';
import type { AppServerJsonRpcTransport, AppServerSidecarSpawn } from '../../src/main/services/appServerJsonRpcClient';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AgentRuntimeContext, AgentRuntimeRequest } from '../../src/shared/types';

class MemoryTransport implements AppServerJsonRpcTransport {
  readonly written: unknown[] = [];
  private readonly lines = new EventEmitter();

  writeLine(line: string): void {
    this.written.push(JSON.parse(line));
  }

  onLine(listener: (line: string) => void): void {
    this.lines.on('line', listener);
  }

  close(): void {}

  send(value: unknown): void {
    this.lines.emit('line', JSON.stringify(value));
  }
}

async function waitForWriteCount(transport: MemoryTransport, count: number): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (transport.written.length >= count) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`等待 JSON-RPC 写入超时：${transport.written.length}/${count}`);
}

function createRuntimeContext(): AgentRuntimeContext {
  return {
    protocol: 'appserver.runtimeContext',
    version: 1,
    source: 'desktop-platform-model-settings',
    permissionMode: 'safe',
    credentialPolicy: {
      handoff: 'credential-ref-only',
      plaintextSecrets: false,
      resolver: 'desktop-host-credential-broker',
      runtimeStatus: 'not-required',
      productionInjectionReady: true,
    },
    modelProfile: {
      settingsVersion: 'settings-v1',
      provider: {
        id: 'local',
        protocol: 'local',
        authType: 'none',
        capabilityKinds: ['text'],
        credentialConfigured: true,
      },
      modelId: 'local-default',
      capability: 'agent',
    },
  };
}

function createRuntimeRequest(runtimeContext: AgentRuntimeContext): AgentRuntimeRequest {
  return {
    appId: 'lime.platform.conformance',
    entryKey: 'main',
    prompt: '生成一版测试内容',
    runtimeOptions: {
      capabilityId: 'lime.agent',
      permissionMode: 'safe',
    },
    modelPolicy: {
      capability: 'agent',
    },
    toolPolicy: {
      permissionMode: 'safe',
    },
    runtimeContext,
  };
}

test('AppServerJsonRpcClient 按 initialize / initialized / start / turn 顺序发送 runtime hostOptions', async () => {
  const transport = new MemoryTransport();
  const client = new AppServerJsonRpcClient(transport);
  const runtimeContext = createRuntimeContext();
  const runPromise = client.startAgentRun({
    request: createRuntimeRequest(runtimeContext),
    runtimeContext,
    workspaceId: '/workspace',
    locale: 'zh-CN',
  });

  const initialize = transport.written[0] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(initialize.method, 'initialize');
  assert.deepEqual((initialize.params.clientInfo as { name: string }).name, 'lime-desktop-platform');

  transport.send({
    id: initialize.id,
    result: {
      serverInfo: { name: 'app-server', version: '0.1.0', protocolVersion: 'appserver.v0' },
      capabilities: { agentSession: true },
    },
  });
  await waitForWriteCount(transport, 3);

  const initialized = transport.written[1] as { method: string };
  const startSession = transport.written[2] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(initialized.method, 'initialized');
  assert.equal(startSession.method, 'agentSession/start');
  assert.equal(Object.hasOwn(startSession.params, 'runtimeContext'), false);
  assert.equal(startSession.params.workspaceId, '/workspace');
  assert.equal(startSession.params.locale, 'zh-CN');

  transport.send({
    id: startSession.id,
    result: {
      session: {
        sessionId: 'sess_1',
        threadId: 'thread_1',
        appId: 'lime.platform.conformance',
        status: 'idle',
      },
    },
  });
  await waitForWriteCount(transport, 4);

  const startTurn = transport.written[3] as { id: number; method: string; params: Record<string, unknown> };
  const runtimeOptions = startTurn.params.runtimeOptions as {
    hostOptions: { desktopPlatformRuntimeContext: AgentRuntimeContext };
    metadata?: Record<string, unknown>;
    providerPreference?: string;
    modelPreference?: string;
    stream?: boolean;
  };
  assert.equal(startTurn.method, 'agentSession/turn/start');
  assert.equal(startTurn.params.sessionId, 'sess_1');
  assert.equal((startTurn.params.input as { text: string }).text, '生成一版测试内容');
  assert.equal(Object.hasOwn(startTurn.params, 'modelPolicy'), false);
  assert.equal(Object.hasOwn(startTurn.params, 'toolPolicy'), false);
  assert.equal(runtimeOptions.stream, true);
  assert.equal(runtimeOptions.providerPreference, 'local');
  assert.equal(runtimeOptions.modelPreference, 'local-default');
  assert.equal(Object.hasOwn(runtimeOptions, 'runtimeContext'), false);
  assert.deepEqual(runtimeOptions.metadata, { permissionMode: 'safe' });
  assert.deepEqual(runtimeOptions.hostOptions.desktopPlatformRuntimeContext, runtimeContext);
  assert.equal(JSON.stringify(runtimeOptions).includes('apiKey'), false);
  assert.equal(JSON.stringify(runtimeOptions).includes('token'), false);
  assert.equal(JSON.stringify(runtimeOptions).includes('secret'), false);

  transport.send({
    method: 'agentSession/event',
    params: {
      event: {
        eventId: 'evt_1',
        sequence: 1,
        sessionId: 'sess_1',
        threadId: 'thread_1',
        turnId: 'turn_1',
        type: 'message.delta',
        timestamp: '2026-06-09T00:00:00.000Z',
        payload: {
          text: 'delta',
          apiKey: 'sk-leak',
          apiKeyConfigured: true,
          credentialRef: { providerId: 'openai-compatible' },
          nested: { refreshToken: 'refresh-leak' },
        },
      },
    },
  });
  transport.send({
    method: 'agentSession/event',
    params: {
      event: {
        eventId: 'evt_2',
        sequence: 2,
        sessionId: 'sess_1',
        threadId: 'thread_1',
        turnId: 'turn_1',
        type: 'turn.completed',
        timestamp: '2026-06-09T00:00:01.000Z',
        payload: {
          status: 'completed',
          token: 'token-leak',
        },
      },
    },
  });
  transport.send({
    id: startTurn.id,
    result: {
      turn: {
        turnId: 'turn_1',
        sessionId: 'sess_1',
        threadId: 'thread_1',
        status: 'accepted',
      },
    },
  });

  const run = await runPromise;
  assert.equal(run.session.sessionId, 'sess_1');
  assert.equal(run.turn.turnId, 'turn_1');
  assert.equal(run.events.length, 2);
  assert.equal(run.events[0]?.type, 'message.delta');
  assert.deepEqual(run.events[0]?.payload, {
    text: 'delta',
    apiKey: '[redacted]',
    apiKeyConfigured: true,
    credentialRef: { providerId: 'openai-compatible' },
    nested: { refreshToken: '[redacted]' },
  });
  assert.equal(run.events[1]?.type, 'completed');
  assert.deepEqual(run.events[1]?.payload, {
    status: 'completed',
    token: '[redacted]',
  });
});

test('AppServerJsonRpcClient 保存路径受控同步 provider/key，并记录 App Server provider id', async () => {
  const transport = new MemoryTransport();
  const client = new AppServerJsonRpcClient(transport);
  const syncPromise = client.syncModelProvider({
    settingsVersion: 'settings-v2',
    provider: {
      id: 'openai-compatible',
      displayName: 'OpenAI Compatible',
      protocol: 'openai-compatible',
      capabilityKinds: ['text'],
      enabled: true,
      apiKeyConfigured: true,
      authType: 'api-key',
      baseUrl: 'https://models.example.test/v1/',
      useResponsesApi: true,
      models: ['gpt-4.1-mini'],
    },
    apiKey: 'sk-sync-secret',
  });

  const initialize = transport.written[0] as { id: number; method: string };
  assert.equal(initialize.method, 'initialize');
  transport.send({ id: initialize.id, result: { serverInfo: { name: 'app-server' }, capabilities: {} } });
  await waitForWriteCount(transport, 3);

  const initialized = transport.written[1] as { method: string };
  const list = transport.written[2] as { id: number; method: string };
  assert.equal(initialized.method, 'initialized');
  assert.equal(list.method, 'modelProvider/list');
  transport.send({ id: list.id, result: { providers: [] } });
  await waitForWriteCount(transport, 4);

  const create = transport.written[3] as { id: number; method: string; params: { provider: Record<string, unknown> } };
  assert.equal(create.method, 'modelProvider/create');
  assert.deepEqual(create.params.provider, {
    type: 'openai-response',
    name: 'OpenAI Compatible',
    api_host: 'https://models.example.test/v1/',
  });
  assert.equal(JSON.stringify(create).includes('sk-sync-secret'), false);
  transport.send({
    id: create.id,
    result: {
      provider: {
        id: 'custom-provider-1',
        name: 'OpenAI Compatible',
        type: 'openai-response',
        api_host: 'https://models.example.test/v1/',
      },
    },
  });
  await waitForWriteCount(transport, 5);

  const update = transport.written[4] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(update.method, 'modelProvider/update');
  assert.equal(update.params.providerId, 'custom-provider-1');
  assert.deepEqual(update.params.patch, {
    type: 'openai-response',
    name: 'OpenAI Compatible',
    api_host: 'https://models.example.test/v1/',
    enabled: true,
    custom_models: ['gpt-4.1-mini'],
  });
  transport.send({
    id: update.id,
    result: {
      provider: {
        id: 'custom-provider-1',
        name: 'OpenAI Compatible',
        type: 'openai-response',
        api_host: 'https://models.example.test/v1/',
      },
    },
  });
  await waitForWriteCount(transport, 6);

  const keyCreate = transport.written[5] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(keyCreate.method, 'modelProviderKey/create');
  assert.deepEqual(keyCreate.params, {
    providerId: 'custom-provider-1',
    apiKey: 'sk-sync-secret',
    alias: 'OpenAI Compatible',
    replaceExisting: true,
  });
  const serializedWrites = JSON.stringify(transport.written);
  assert.equal((serializedWrites.match(/sk-sync-secret/g) ?? []).length, 1);
  transport.send({
    id: keyCreate.id,
    result: {
      key: {
        id: 'key-1',
        provider_id: 'custom-provider-1',
        api_key_masked: 'sk-****',
      },
    },
  });

  const result = await syncPromise;
  assert.equal(result.created, true);
  assert.equal(result.updated, true);
  assert.equal(result.credentialSynced, true);
  assert.equal(result.record.status, 'synced');
  assert.equal(result.record.desktopProviderId, 'openai-compatible');
  assert.equal(result.record.appServerProviderId, 'custom-provider-1');
  assert.equal(result.record.appServerProviderType, 'openai-response');
  assert.equal(result.record.plaintextSecrets, false);
  assert.equal(JSON.stringify(result).includes('sk-sync-secret'), false);
});

test('AppServerJsonRpcClient 复用已记录 App Server provider id 时不调用 modelProviderKey/next', async () => {
  const transport = new MemoryTransport();
  const client = new AppServerJsonRpcClient(transport);
  const syncPromise = client.syncModelProvider({
    settingsVersion: 'settings-v3',
    previousSyncRecord: {
      desktopProviderId: 'anthropic-compatible',
      status: 'synced',
      appServerProviderId: 'custom-anthropic-1',
      credentialSyncedAt: '2026-06-09T00:00:00.000Z',
      plaintextSecrets: false,
    },
    provider: {
      id: 'anthropic-compatible',
      displayName: 'Anthropic Compatible',
      protocol: 'anthropic-compatible',
      capabilityKinds: ['text'],
      enabled: true,
      apiKeyConfigured: true,
      authType: 'api-key',
      models: ['claude-sonnet-4-5'],
    },
  });

  const initialize = transport.written[0] as { id: number };
  transport.send({ id: initialize.id, result: { serverInfo: { name: 'app-server' }, capabilities: {} } });
  await waitForWriteCount(transport, 3);

  const read = transport.written[2] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(read.method, 'modelProvider/read');
  assert.deepEqual(read.params, { providerId: 'custom-anthropic-1' });
  transport.send({
    id: read.id,
    result: {
      provider: {
        id: 'custom-anthropic-1',
        name: 'Anthropic Compatible',
        type: 'anthropic-compatible',
        api_host: 'https://api.anthropic.com',
      },
    },
  });
  await waitForWriteCount(transport, 4);

  const update = transport.written[3] as { id: number; method: string; params: Record<string, unknown> };
  assert.equal(update.method, 'modelProvider/update');
  transport.send({
    id: update.id,
    result: {
      provider: {
        id: 'custom-anthropic-1',
        name: 'Anthropic Compatible',
        type: 'anthropic-compatible',
        api_host: 'https://api.anthropic.com',
      },
    },
  });

  const result = await syncPromise;
  assert.equal(result.credentialSynced, false);
  assert.equal(result.record.appServerProviderId, 'custom-anthropic-1');
  assert.equal(result.record.credentialSyncedAt, '2026-06-09T00:00:00.000Z');
  assert.equal(
    transport.written.some((write) => (write as { method?: string }).method === 'modelProviderKey/next'),
    false,
  );
  assert.equal(
    transport.written.some((write) => (write as { method?: string }).method === 'modelProviderKey/create'),
    false,
  );
});

test('resolveAppServerSidecarLaunchConfig 只在 APP_SERVER_BIN 配置时启用 stdio sidecar', () => {
  assert.equal(resolveAppServerSidecarLaunchConfig({}), undefined);

  const config = resolveAppServerSidecarLaunchConfig({
    APP_SERVER_BIN: '/opt/app-server',
    APP_SERVER_ARGS: '--flag \"two words\"',
    APP_SERVER_CWD: '/workspace',
    APP_SERVER_BACKEND_MODE: 'external',
    APP_SERVER_BACKEND_COMMAND: 'backend-command',
  });

  assert.equal(config?.command, '/opt/app-server');
  assert.deepEqual(config?.args, ['--stdio', '--flag', 'two words']);
  assert.equal(config?.cwd, '/workspace');
  assert.equal(config?.source, 'env-bin');
  assert.equal(config?.env.APP_SERVER_BACKEND_MODE, 'external');
  assert.equal(config?.env.APP_SERVER_BACKEND_COMMAND, 'backend-command');
});

test('resolveAppServerSidecarLaunchConfig 从 packaged resources manifest 解析 sidecar 并校验 sha256', () => {
  const resourcesRoot = '/Applications/Lime.app/Contents/Resources';
  const resourceDir = `${resourcesRoot}/app-server`;
  const binaryPath = `${resourceDir}/bin/app-server`;
  const binaryBytes = Buffer.from('packaged app-server binary');
  const sha256 = createHash('sha256').update(binaryBytes).digest('hex');
  const manifestPath = `${resourceDir}/manifest.json`;
  const files = new Map<string, Buffer | string>([
    [
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        binaries: {
          'darwin-arm64': {
            path: 'bin/app-server',
            sha256,
            args: ['--backend', 'unavailable'],
          },
        },
      }),
    ],
    [binaryPath, binaryBytes],
  ]);

  const config = resolveAppServerSidecarLaunchConfig(
    { APP_SERVER_ARGS: '--app-policy policy.json' },
    {
      resourcesPath: resourcesRoot,
      platform: 'darwin',
      arch: 'arm64',
      exists: (path) => files.has(path),
      readFile: (path) => {
        const value = files.get(path);
        if (value === undefined) {
          throw new Error(`missing ${path}`);
        }
        return value;
      },
    },
  );

  assert.equal(config?.command, binaryPath);
  assert.deepEqual(config?.args, ['--stdio', '--backend', 'unavailable', '--app-policy', 'policy.json']);
  assert.equal(config?.source, 'packaged-resource');
  assert.equal(config?.manifestPath, manifestPath);
  assert.equal(config?.binarySha256, sha256);
  assert.equal(config?.env.APP_SERVER_BACKEND_MODE, 'runtime');
});

test('resolveAppServerSidecarLaunchConfig 阻断 packaged manifest 路径逃逸、sha 不匹配和 mock backend', () => {
  const resourcesRoot = '/Resources';
  const resourceDir = `${resourcesRoot}/app-server`;
  const binaryPath = `${resourceDir}/bin/app-server`;
  const manifestPath = `${resourceDir}/manifest.json`;

  function resolveWithManifest(manifest: unknown, binary = Buffer.from('binary')) {
    const files = new Map<string, Buffer | string>([
      [manifestPath, JSON.stringify(manifest)],
      [binaryPath, binary],
    ]);
    return resolveAppServerSidecarLaunchConfig(
      {},
      {
        resourcesPath: resourcesRoot,
        platform: 'darwin',
        arch: 'arm64',
        exists: (path) => files.has(path),
        readFile: (path) => {
          const value = files.get(path);
          if (value === undefined) {
            throw new Error(`missing ${path}`);
          }
          return value;
        },
      },
    );
  }

  assert.equal(
    resolveWithManifest({
      schemaVersion: 1,
      binaries: { 'darwin-arm64': { path: '../app-server', args: ['--backend', 'unavailable'] } },
    }),
    undefined,
  );
  assert.equal(
    resolveWithManifest({
      schemaVersion: 1,
      binaries: { 'darwin-arm64': { path: 'bin/app-server', sha256: 'bad', args: ['--backend', 'unavailable'] } },
    }),
    undefined,
  );
  assert.equal(
    resolveWithManifest({
      schemaVersion: 1,
      binaries: { 'darwin-arm64': { path: 'bin/app-server', args: ['--backend', 'mock'] } },
    }),
    undefined,
  );
  assert.equal(
    resolveAppServerSidecarLaunchConfig({
      APP_SERVER_BIN: '/opt/app-server',
      APP_SERVER_ARGS: '--backend mock',
    }),
    undefined,
  );
});

test('AppServerSidecarLifecycle 按配置 spawn stdio 子进程并复用 client', () => {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const fakeChild = new EventEmitter() as ChildProcessWithoutNullStreams;
  Object.assign(fakeChild, {
    stdin,
    stdout,
    stderr,
    exitCode: null,
    kill: () => true,
    once: fakeChild.once.bind(fakeChild),
  });
  const calls: unknown[] = [];
  const spawnSidecar: AppServerSidecarSpawn = (command, args, options) => {
    calls.push({ command, args, options });
    return fakeChild;
  };
  const lifecycle = new AppServerSidecarLifecycle(
    {
      command: '/opt/app-server',
      args: ['--stdio'],
      env: { APP_SERVER_BACKEND_MODE: 'runtime' },
      source: 'env-bin',
    },
    spawnSidecar,
  );

  const client = lifecycle.getClient();
  assert.equal(client.connected, true);
  assert.equal(lifecycle.connected, true);
  assert.equal(lifecycle.getClient(), client);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: '/opt/app-server',
    args: ['--stdio'],
    options: {
      cwd: undefined,
      env: { APP_SERVER_BACKEND_MODE: 'runtime' },
      stdio: 'pipe',
    },
  });
});
