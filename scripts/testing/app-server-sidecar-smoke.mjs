import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { accessSync, chmodSync, constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';

const appId = 'lime.platform.conformance';
const workspaceId = 'default';
const capabilityId = 'lime.agent';
const cliArgs = process.argv.slice(2);
const smokeMode = cliArgs.includes('--package-resources')
  ? 'package-resources'
  : cliArgs.includes('--packaged-resource')
    ? 'packaged-resource'
    : 'env-bin';
const appServerSourceBin = process.env.APP_SERVER_BIN?.trim();

if ((smokeMode === 'env-bin' || smokeMode === 'packaged-resource') && !appServerSourceBin) {
  console.error('缺少 APP_SERVER_BIN。示例：APP_SERVER_BIN=/path/to/app-server npm run smoke:app-server-sidecar');
  process.exit(1);
}

if (appServerSourceBin) {
  accessSync(appServerSourceBin, constants.X_OK);
}

const tempRoot = join(tmpdir(), `lime-desktop-platform-app-server-sidecar-${randomUUID()}`);
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

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function argValue(name) {
  const index = cliArgs.indexOf(name);
  if (index >= 0 && cliArgs[index + 1]) {
    return cliArgs[index + 1];
  }
  const prefix = `${name}=`;
  return cliArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function assertNoMockBackend(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    assert.equal(arg === '--backend=mock', false, 'sidecar smoke must not use mock backend');
    assert.equal(arg === '--backend' && args[index + 1] === 'mock', false, 'sidecar smoke must not use mock backend');
  }
}

function assertUnavailableBackendOnly(args) {
  assertNoMockBackend(args);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--backend') {
      assert.equal(args[index + 1] === 'unavailable', true, 'sidecar smoke must use unavailable backend when --backend is present');
    }
    if (arg.startsWith('--backend=')) {
      assert.equal(arg === '--backend=unavailable', true, 'sidecar smoke must use unavailable backend when --backend is present');
    }
  }
}

function argsWithStdio(args) {
  return args.includes('--stdio') ? args : ['--stdio', ...args];
}

function createPackagedResourceLaunch(sourceBin) {
  const resourcesRoot = join(tempRoot, 'packaged-resources');
  const resourceDir = join(resourcesRoot, 'app-server');
  const binaryName = process.platform === 'win32' ? 'app-server.exe' : 'app-server';
  const binaryPath = join(resourceDir, 'bin', binaryName);
  mkdirSync(join(resourceDir, 'bin'), { recursive: true });
  copyFileSync(sourceBin, binaryPath);
  chmodSync(binaryPath, 0o755);

  const binarySha256 = sha256File(binaryPath);
  const target = `${process.platform}-${process.arch}`;
  const manifestPath = join(resourceDir, 'manifest.json');
  const manifest = {
    schemaVersion: 1,
    binaries: {
      [target]: {
        path: `bin/${binaryName}`,
        sha256: binarySha256,
        args: ['--backend', 'unavailable'],
      },
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    source: 'packaged-resource',
    command: binaryPath,
    args: manifest.binaries[target].args,
    resourcesRoot,
    appServerResourceDir: resourceDir,
    manifestPath,
    binarySha256,
    target,
  };
}

function createExistingPackagedResourceLaunch() {
  const resolved = resolveExistingAppServerResourceDir();
  const manifestPath = join(resolved.appServerResourceDir, 'manifest.json');
  accessSync(manifestPath, constants.R_OK);

  const manifest = readJsonRecord(manifestPath);
  const target = `${process.platform}-${process.arch}`;
  const binary = resolveManifestBinary(manifest, target);
  assert.ok(binary, `manifest must contain a valid binary for ${target}, default, or binary`);

  const binaryPath = resolveResourceRelativePath(resolved.appServerResourceDir, binary.path);
  assert.ok(binaryPath, 'manifest binary path must be relative and stay inside app-server resource dir');
  accessSync(binaryPath, constants.X_OK);

  if (binary.sha256) {
    assert.equal(sha256File(binaryPath), binary.sha256, 'packaged app-server binary sha256 mismatch');
  }

  return {
    source: 'packaged-resource',
    command: binaryPath,
    args: binary.args,
    resourcesRoot: resolved.resourcesRoot,
    appServerResourceDir: resolved.appServerResourceDir,
    manifestPath,
    binarySha256: binary.sha256,
    target,
    inputKind: resolved.inputKind,
  };
}

function resolveExistingAppServerResourceDir() {
  const explicitResourceDir = argValue('--app-server-resource-dir') ?? process.env.APP_SERVER_RESOURCE_DIR?.trim();
  if (explicitResourceDir) {
    return {
      inputKind: 'app-server-resource-dir',
      resourcesRoot: undefined,
      appServerResourceDir: resolve(explicitResourceDir),
    };
  }

  const resourcesRoot = argValue('--resources-dir') ?? process.env.ELECTRON_RESOURCES_DIR?.trim();
  if (resourcesRoot) {
    return {
      inputKind: 'electron-resources-dir',
      resourcesRoot: resolve(resourcesRoot),
      appServerResourceDir: join(resolve(resourcesRoot), 'app-server'),
    };
  }

  const packageDir = argValue('--package-dir') ?? process.env.ELECTRON_PACKAGE_DIR?.trim();
  if (packageDir) {
    const electronResourcesRoot = resolveElectronResourcesDir(packageDir);
    return {
      inputKind: 'electron-package-dir',
      resourcesRoot: electronResourcesRoot,
      appServerResourceDir: join(electronResourcesRoot, 'app-server'),
    };
  }

  throw new Error(
    '缺少 packaged resources 输入。请设置 APP_SERVER_RESOURCE_DIR、ELECTRON_RESOURCES_DIR、ELECTRON_PACKAGE_DIR，或传入 --app-server-resource-dir / --resources-dir / --package-dir。',
  );
}

function resolveElectronResourcesDir(packageDir) {
  const resolvedPackageDir = resolve(packageDir);
  const candidates = [
    join(resolvedPackageDir, 'Contents', 'Resources'),
    join(resolvedPackageDir, 'resources'),
  ];
  const match = candidates.find((candidate) => existsSync(join(candidate, 'app-server', 'manifest.json')));
  if (!match) {
    throw new Error(`未在 Electron package dir 中找到 app-server/manifest.json：${resolvedPackageDir}`);
  }
  return match;
}

function readJsonRecord(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  assert.equal(parsed && typeof parsed === 'object' && !Array.isArray(parsed), true, 'manifest must be a JSON object');
  return parsed;
}

function resolveManifestBinary(manifest, target) {
  if (manifest.schemaVersion !== 1) {
    return undefined;
  }

  const binaries = manifest.binaries && typeof manifest.binaries === 'object' ? manifest.binaries : {};
  const candidate = binaries[target] ?? binaries.default ?? manifest.binary;
  const binary = typeof candidate === 'string' ? { path: candidate } : candidate;
  if (!binary || typeof binary !== 'object' || typeof binary.path !== 'string' || !binary.path.trim()) {
    return undefined;
  }

  const args = Array.isArray(binary.args) ? binary.args.filter((arg) => typeof arg === 'string') : [];
  assertUnavailableBackendOnly(args);

  return {
    path: binary.path,
    sha256: typeof binary.sha256 === 'string' && binary.sha256.trim() ? binary.sha256.trim().toLowerCase() : undefined,
    args,
  };
}

function resolveResourceRelativePath(root, candidate) {
  const rawCandidate = candidate.trim();
  if (/^[A-Za-z]:[\\/]/.test(rawCandidate)) {
    return undefined;
  }

  const normalizedCandidate = normalize(rawCandidate.replace(/[\\/]+/g, sep));
  if (!normalizedCandidate || isAbsolute(normalizedCandidate) || normalizedCandidate.startsWith('..')) {
    return undefined;
  }

  const absolutePath = join(root, normalizedCandidate);
  const relativeToRoot = relative(root, absolutePath);
  if (!relativeToRoot || relativeToRoot.startsWith('..') || isAbsolute(relativeToRoot)) {
    return undefined;
  }
  return absolutePath;
}

const sidecarLaunch =
  smokeMode === 'package-resources'
    ? createExistingPackagedResourceLaunch()
    : smokeMode === 'packaged-resource'
      ? createPackagedResourceLaunch(appServerSourceBin)
      : {
        source: 'env-bin',
        command: appServerSourceBin,
        args: ['--backend', 'unavailable'],
        resourcesRoot: undefined,
        appServerResourceDir: undefined,
        manifestPath: undefined,
        binarySha256: undefined,
      };
assertUnavailableBackendOnly(sidecarLaunch.args);
accessSync(sidecarLaunch.command, constants.X_OK);

class JsonRpcResponseError extends Error {
  constructor(error) {
    super(error.message);
    this.name = 'JsonRpcResponseError';
    this.code = error.code;
    this.data = error.data;
  }
}

const launchArgs = [...argsWithStdio(sidecarLaunch.args), '--app-policy', policyPath];
assertUnavailableBackendOnly(launchArgs);

const child = spawn(sidecarLaunch.command, launchArgs, {
  cwd: process.env.APP_SERVER_CWD?.trim() || undefined,
  env: {
    ...process.env,
    APP_SERVER_BACKEND_MODE: 'unavailable',
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
  const envelope = { id, method, params };
  const promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`JSON-RPC request timed out: ${method}; stderr=${stderr}`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
  });
  child.stdin.write(`${JSON.stringify(envelope)}\n`);
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
      resolver: 'desktop-host-credential-broker',
      runtimeStatus: 'broker-reference-only',
      productionInjectionReady: false,
    },
    modelProfile: {
      settingsVersion: 'sidecar-smoke',
      provider: {
        id: 'openai-compatible',
        protocol: 'openai-compatible',
        authType: 'api-key',
        baseUrl: 'https://api.example.invalid/v1',
        capabilityKinds: ['text'],
        credentialConfigured: true,
        credentialRef: {
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
        },
      },
      modelId: 'gpt-4.1-mini',
      capability: 'agent',
    },
  };
}

function assertNoSecretPayload(value) {
  const text = JSON.stringify(value);
  for (const blocked of ['apiKey', 'sk-', 'token', 'secret', 'refreshToken']) {
    assert.equal(text.includes(blocked), false, `JSON-RPC payload must not contain ${blocked}`);
  }
}

try {
  const initialize = await request('initialize', {
    clientInfo: {
      name: 'lime-desktop-platform-sidecar-smoke',
      title: 'Lime Desktop Platform Sidecar Smoke',
      version: '0.1.4',
    },
    capabilities: {
      experimentalApi: false,
      optOutNotificationMethods: [],
    },
  });
  assert.equal(initialize.serverInfo?.protocolVersion, 'appserver.v0');
  assert.equal(initialize.capabilities?.agentSession, true);
  assert.equal(initialize.capabilities?.capabilityDiscovery, true);
  notify('initialized', {});

  const capabilityList = await request('capability/list', { appId, workspaceId });
  const capabilities = Array.isArray(capabilityList.capabilities) ? capabilityList.capabilities : [];
  const agentCapability = capabilities.find((capability) => capability.id === capabilityId);
  assert.ok(agentCapability, 'app policy must expose lime.agent');
  assert.deepEqual(agentCapability.methods, ['agentSession/turn/start']);

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
      text: 'App Server sidecar smoke readiness probe.',
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

  let turnReachedRuntimeBoundary = false;
  try {
    const turnResult = await request('agentSession/turn/start', turnParams);
    assert.equal(turnResult.turn?.sessionId, session.sessionId);
    turnReachedRuntimeBoundary = true;
  } catch (error) {
    assert.equal(error instanceof JsonRpcResponseError, true);
    assert.equal(String(error.message).includes(`capability denied: ${capabilityId}`), false);
    assert.equal(String(error.message).includes('standalone app-server backend is not configured'), true);
    turnReachedRuntimeBoundary = true;
  }

  assert.equal(turnReachedRuntimeBoundary, true);
  console.log(
    `App Server sidecar smoke 通过：${JSON.stringify({
      protocolVersion: initialize.serverInfo.protocolVersion,
      appId,
      capabilityId,
      backendMode: 'unavailable',
      mode: smokeMode,
      source: sidecarLaunch.source,
      inputKind: sidecarLaunch.inputKind,
      resourcesRoot: sidecarLaunch.resourcesRoot,
      appServerResourceDir: sidecarLaunch.appServerResourceDir,
      manifestPath: sidecarLaunch.manifestPath,
      binarySha256: sidecarLaunch.binarySha256,
      target: sidecarLaunch.target,
      policyPath,
      notificationCount: notifications.length,
    })}`,
  );
} finally {
  child.kill();
}
