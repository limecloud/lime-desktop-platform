import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { accessSync, constants, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const appId = 'lime.platform.conformance';
const workspaceId = 'default';
const capabilityId = 'lime.agent';
const appServerBin = process.env.APP_SERVER_BIN?.trim();

if (!appServerBin) {
  console.error('缺少 APP_SERVER_BIN。示例：APP_SERVER_BIN=/path/to/app-server npm run smoke:app-server-sidecar:event-stream');
  process.exit(1);
}

accessSync(appServerBin, constants.X_OK);

const tempRoot = join(tmpdir(), `lime-desktop-platform-app-server-event-stream-${randomUUID()}`);
mkdirSync(tempRoot, { recursive: true });

const policyPath = join(tempRoot, 'app-policy.json');
writeFileSync(
  policyPath,
  JSON.stringify(
    {
      capabilities: [
        {
          id: capabilityId,
          title: 'Lime Agent',
          methods: ['agentSession/turn/start'],
          appIds: [appId],
        },
      ],
    },
    null,
    2,
  ),
);

const backendFixturePath = join(tempRoot, 'external-backend-fixture.mjs');
writeFileSync(
  backendFixturePath,
  `
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const runtimeOptions = input.request?.runtimeOptions ?? {};

if (input.kind !== 'turnStart') {
  console.error('unexpected backend kind: ' + input.kind);
  process.exit(2);
}

console.log(JSON.stringify({
  type: 'message.delta',
  payload: {
    backend: 'external-fixture',
    kind: input.kind,
    text: 'external fixture delta',
    providerPreference: runtimeOptions.providerPreference,
    modelPreference: runtimeOptions.modelPreference,
    hostOptionsSeen: Boolean(runtimeOptions.hostOptions?.desktopPlatformRuntimeContext),
  },
}));
console.log(JSON.stringify({
  type: 'turn.completed',
  payload: {
    backend: 'external-fixture',
    status: 'completed',
  },
}));
`,
  'utf8',
);

function assertNoMockBackend(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    assert.equal(arg === '--backend=mock', false, 'event stream smoke must not use mock backend');
    assert.equal(arg === '--backend' && args[index + 1] === 'mock', false, 'event stream smoke must not use mock backend');
  }
}

function assertNoSecretPayload(value) {
  const text = JSON.stringify(value);
  for (const blocked of ['apiKey', 'sk-', 'token', 'secret', 'refreshToken']) {
    assert.equal(text.includes(blocked), false, `JSON-RPC payload must not contain ${blocked}`);
  }
}

class JsonRpcResponseError extends Error {
  constructor(error) {
    super(error.message);
    this.name = 'JsonRpcResponseError';
    this.code = error.code;
    this.data = error.data;
  }
}

const launchArgs = [
  '--stdio',
  '--backend',
  'external',
  '--backend-command',
  process.execPath,
  '--backend-arg',
  backendFixturePath,
  '--backend-timeout-ms',
  '5000',
  '--app-policy',
  policyPath,
];
assertNoMockBackend(launchArgs);

const child = spawn(appServerBin, launchArgs, {
  cwd: process.env.APP_SERVER_CWD?.trim() || undefined,
  env: {
    ...process.env,
    APP_SERVER_BACKEND_MODE: 'external',
  },
  stdio: 'pipe',
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr = `${stderr}${chunk.toString('utf8')}`.slice(-4096);
});

let nextId = 1;
const pending = new Map();
const notifications = [];

const reader = createInterface({ input: child.stdout });
reader.on('line', (line) => {
  if (!line.trim()) {
    return;
  }
  const envelope = JSON.parse(line);
  if (typeof envelope.id === 'number') {
    const request = pending.get(envelope.id);
    if (!request) {
      return;
    }
    pending.delete(envelope.id);
    clearTimeout(request.timeout);
    if (envelope.error) {
      request.reject(new JsonRpcResponseError(envelope.error));
      return;
    }
    request.resolve(envelope.result);
    return;
  }
  notifications.push(envelope);
});

child.once('exit', (code, signal) => {
  for (const request of pending.values()) {
    clearTimeout(request.timeout);
    request.reject(new Error(`App Server sidecar exited before response: code=${code ?? 'null'} signal=${signal ?? 'null'} stderr=${stderr}`));
  }
  pending.clear();
});

function request(method, params) {
  const id = nextId;
  nextId += 1;
  const promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`JSON-RPC request timed out: ${method}; stderr=${stderr}`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
  });
  child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  return promise;
}

function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ method, params })}\n`);
}

function createRuntimeContext() {
  return {
    protocol: 'appserver.runtimeContext',
    version: 1,
    source: 'desktop-platform-model-settings',
    permissionMode: 'safe',
    credentialPolicy: {
      handoff: 'credential-ref-only',
      plaintextSecrets: false,
      resolver: 'app-server-provider-store',
      runtimeStatus: 'not-required',
      productionInjectionReady: true,
    },
    modelProfile: {
      settingsVersion: 'event-stream-smoke',
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

try {
  const initialize = await request('initialize', {
    clientInfo: {
      name: 'lime-desktop-platform-event-stream-smoke',
      title: 'Lime Desktop Platform Event Stream Smoke',
      version: '0.1.4',
    },
    capabilities: {
      experimentalApi: false,
      optOutNotificationMethods: [],
    },
  });
  assert.equal(initialize.serverInfo?.protocolVersion, 'appserver.v0');
  assert.equal(initialize.capabilities?.agentSession, true);
  notify('initialized', {});

  const capabilityList = await request('capability/list', { appId, workspaceId });
  const capabilities = Array.isArray(capabilityList.capabilities) ? capabilityList.capabilities : [];
  const agentCapability = capabilities.find((capability) => capability.id === capabilityId);
  assert.ok(agentCapability, 'app policy must expose lime.agent');

  const sessionResult = await request('agentSession/start', {
    appId,
    workspaceId,
    locale: 'zh-CN',
  });
  const session = sessionResult.session;
  assert.equal(session.appId, appId);
  assert.equal(session.workspaceId, workspaceId);

  const runtimeContext = createRuntimeContext();
  const turnParams = {
    sessionId: session.sessionId,
    input: {
      text: 'App Server external fixture event stream probe.',
      attachments: [],
    },
    runtimeOptions: {
      capabilityId,
      stream: true,
      providerPreference: runtimeContext.modelProfile.provider.id,
      modelPreference: runtimeContext.modelProfile.modelId,
      hostOptions: {
        desktopPlatformRuntimeContext: runtimeContext,
      },
    },
  };
  assertNoSecretPayload(turnParams);

  const turnResult = await request('agentSession/turn/start', turnParams);
  const turn = turnResult.turn;
  assert.equal(turn.sessionId, session.sessionId);

  const events = notifications
    .filter((notification) => notification.method === 'agentSession/event')
    .map((notification) => notification.params?.event)
    .filter(Boolean);
  const deltaEvent = events.find((event) => event.type === 'message.delta');
  const completedEvent = events.find((event) => event.type === 'turn.completed');

  assert.ok(deltaEvent, 'external backend must stream message.delta as agentSession/event');
  assert.ok(completedEvent, 'external backend must stream turn.completed as agentSession/event');
  assert.equal(deltaEvent.sessionId, session.sessionId);
  assert.equal(deltaEvent.turnId, turn.turnId);
  assert.equal(deltaEvent.payload?.backend, 'external-fixture');
  assert.equal(deltaEvent.payload?.providerPreference, 'local');
  assert.equal(deltaEvent.payload?.modelPreference, 'local-default');
  assert.equal(deltaEvent.payload?.hostOptionsSeen, true);
  assert.equal(completedEvent.sessionId, session.sessionId);
  assert.equal(completedEvent.turnId, turn.turnId);
  assert.equal(completedEvent.payload?.backend, 'external-fixture');
  assertNoSecretPayload(events);

  const readResult = await request('agentSession/read', {
    sessionId: session.sessionId,
    historyLimit: 20,
  });
  assert.equal(readResult.session?.sessionId, session.sessionId);
  assert.equal(readResult.session?.threadId, session.threadId);
  assert.equal(readResult.session?.appId, appId);
  const readTurns = Array.isArray(readResult.turns) ? readResult.turns : [];
  const readTurn = readTurns.find((item) => item.turnId === turn.turnId);
  assert.ok(readTurn, 'agentSession/read must include the turn started by this smoke');
  assert.equal(readTurn.sessionId, session.sessionId);
  assert.equal(readTurn.threadId, session.threadId);
  assertNoSecretPayload(readResult);

  const detail = readResult.detail && typeof readResult.detail === 'object' ? readResult.detail : {};
  const messages = Array.isArray(detail.messages) ? detail.messages : [];
  assert.equal(messages.length > 0, true, 'agentSession/read detail must include a non-empty messages read model');
  assert.equal(
    JSON.stringify(messages).includes('App Server external fixture event stream probe.'),
    true,
    'agentSession/read detail must project the submitted user input',
  );

  console.log(
    `App Server event stream smoke 通过：${JSON.stringify({
      protocolVersion: initialize.serverInfo.protocolVersion,
      appId,
      capabilityId,
      backendMode: 'external',
      backendFixture: 'external-backend-fixture',
      sessionId: session.sessionId,
      turnId: turn.turnId,
      eventTypes: events.map((event) => event.type),
      readTurnCount: readTurns.length,
      readMessageCount: messages.length,
      policyPath,
    })}`,
  );
} finally {
  child.kill();
}
