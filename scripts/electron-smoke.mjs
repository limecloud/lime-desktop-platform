import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { WebSocket as UndiciWebSocket } from 'undici';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const WebSocketClient = globalThis.WebSocket ?? UndiciWebSocket;
const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const mainEntry = join(projectRoot, 'out/main/index.js');
const remoteDebuggingPort = 9733 + Math.floor(Math.random() * 400);
const userDataDir = mkdtempSync(join(tmpdir(), `lime-desktop-platform-smoke-${randomUUID()}-`));
const headed = process.argv.slice(2).includes('--headed') || process.env.LIME_DESKTOP_TEST_SILENT === '0';
const releaseBytes = Buffer.from(`lime desktop platform smoke release ${randomUUID()}`, 'utf8');
const releaseSha256 = createHash('sha256').update(releaseBytes).digest('hex');
const fixtureSampleName = 'platform-conformance';
const fixtureAppId = 'lime.platform.conformance';
const fixtureEntryKey = 'host-conformance';
const fixtureArtifactPath = '/artifacts/platform-conformance-0.1.1.tgz';
let servedCatalog = [];
let mockSession = {
  state: 'unauthenticated',
  scopes: [],
  authMode: 'oauth',
  source: 'limecore',
};
let mockBilling = {
  state: 'active',
  planName: 'Mock Limecore Pro',
  balanceCents: 888800,
  currency: 'CNY',
  renewsAt: '2026-06-24T00:00:00.000Z',
  lastCheckedAt: '2026-05-24T00:00:00.000Z',
  source: 'limecore',
};
let mockOEM = {
  state: 'customized',
  brandName: 'Mock Limecore Brand',
  productName: 'Mock Lime Desktop',
  channel: 'smoke',
  theme: 'system',
  primaryColor: '#0891b2',
  logoText: 'ML',
  updatedAt: '2026-05-24T00:00:00.000Z',
  source: 'limecore',
};

if (!existsSync(mainEntry)) {
  console.error(`缺少 ${mainEntry}，请先运行 npm run build。`);
  process.exit(1);
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function waitForChildExit(childProcess, timeoutMs = 5000) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolveWait) => {
    const timer = setTimeout(resolveWait, timeoutMs);
    childProcess.once('exit', () => {
      clearTimeout(timer);
      resolveWait();
    });
  });
}

async function removeDirectoryWithRetry(path) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await wait(250);
    }
  }
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readSampleCatalogApp(sampleName) {
  const sampleRoot = join(projectRoot, 'samples', sampleName);
  const manifest = readJsonFile(join(sampleRoot, 'manifest.example.json'));
  const metadata = readJsonFile(join(sampleRoot, 'catalog.example.json'));
  return {
    manifest,
    sourceKind: metadata.sourceKind ?? 'local',
    description: metadata.description ?? `${manifest.displayName} smoke fixture.`,
    categories: metadata.categories ?? ['Agent App'],
    latestVersion: metadata.latestVersion ?? manifest.version,
    updatedAt: metadata.updatedAt ?? '2026-05-23T00:00:00.000Z',
    releaseNotes: metadata.releaseNotes ?? ['smoke fixture'],
    frameworkHighlights: metadata.frameworkHighlights,
    referenceRuntime: metadata.referenceRuntime ?? metadata.devRuntime,
    devRuntime: metadata.devRuntime,
  };
}

function createMockCatalog(baseUrl, options = {}) {
  return [fixtureSampleName].map((sampleName) => {
    const catalogApp = readSampleCatalogApp(sampleName);
    if (!options.fixtureUpdateAvailable) {
      return catalogApp;
    }

    return {
      ...catalogApp,
      latestVersion: '0.1.1',
      updatedAt: new Date().toISOString(),
      releaseNotes: ['Smoke: limecore release artifact 校验链路。'],
      releaseArtifact: {
        url: `${baseUrl}${fixtureArtifactPath}`,
        sha256: releaseSha256,
        sizeBytes: releaseBytes.byteLength,
        fileName: 'platform-conformance-0.1.1.tgz',
      },
    };
  });
}

async function startMockLimecoreServer() {
  const server = createServer((request, response) => {
    if (request.url === '/desktop/v1/catalog') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ catalog: servedCatalog }));
      return;
    }

    if (request.url === '/desktop/v1/session') {
      if (request.method === 'POST') {
        mockSession = {
          state: 'authenticated',
          tenantId: 'tenant-limecore-smoke',
          tenantName: 'Smoke 租户',
          accountEmail: 'smoke@limecloud.local',
          expiresAt: '2026-06-24T00:00:00.000Z',
          scopes: ['catalog:read', 'apps:run', 'settings:read', 'billing:read'],
          authMode: 'oauth',
          source: 'limecore',
        };
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(mockSession));
        return;
      }

      if (request.method === 'DELETE') {
        mockSession = {
          state: 'unauthenticated',
          scopes: [],
          authMode: 'oauth',
          source: 'limecore',
        };
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(mockSession));
        return;
      }

      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(mockSession));
      return;
    }

    if (request.url === '/desktop/v1/billing') {
      mockBilling = {
        ...mockBilling,
        lastCheckedAt: new Date().toISOString(),
      };
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(mockBilling));
      return;
    }

    if (request.url === '/desktop/v1/oem') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(mockOEM));
      return;
    }

    if (request.url === fixtureArtifactPath) {
      response.writeHead(200, {
        'content-type': 'application/gzip',
        'content-length': String(releaseBytes.byteLength),
      });
      response.end(releaseBytes);
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'not-found' }));
  });

  await new Promise((resolveStart, rejectStart) => {
    server.once('error', rejectStart);
    server.listen(0, '127.0.0.1', () => resolveStart());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('mock limecore address unavailable');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

function closeServer(server) {
  return new Promise((resolveClose) => {
    server.close(() => resolveClose());
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json();
}

async function waitForDebugTarget(port = remoteDebuggingPort, timeoutMs = 20_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json`);
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) {
        return page;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(250);
  }
  throw new Error(`等待 Electron 调试目标超时：${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function createCdpClient(webSocketDebuggerUrl) {
  const ws = new WebSocketClient(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const exceptions = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: resolvePending, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolvePending(message.result);
      }
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params?.exceptionDetails?.text ?? 'Runtime exception');
    }
  };

  const opened = new Promise((resolveOpen, rejectOpen) => {
    ws.onopen = resolveOpen;
    ws.onerror = () => rejectOpen(new Error('无法连接 CDP WebSocket'));
  });

  return {
    exceptions,
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function waitForRendererReady(cdp, timeoutMs = 20_000) {
  const started = Date.now();
  let lastState;
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(cdp, `(() => ({
      readyState: document.readyState,
      hasBridge: Boolean(window.limeDesktop),
      text: document.body?.innerText?.slice(0, 1600) ?? ''
    }))()`);
    lastState = state;
    const text = state?.text ?? '';
    if (
      state?.readyState === 'complete' &&
      state.hasBridge &&
      text.includes('平台能力总览') &&
      text.includes('平台应用中心') &&
      text.includes('云端会话') &&
      text.includes('模型设置') &&
      text.includes('Host Bridge') &&
      text.includes('诊断')
    ) {
      return state;
    }
    await wait(250);
  }
  throw new Error(`Renderer 未在超时时间内完成加载或 preload bridge 缺失：${JSON.stringify(lastState)}`);
}

async function waitForTarget(port, predicate, timeoutMs = 20_000) {
  const started = Date.now();
  let lastTargets = [];
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json`);
      lastTargets = targets;
      const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl && predicate(item));
      if (target) {
        return target;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(250);
  }
  throw new Error(
    `等待调试目标超时：${lastError instanceof Error ? lastError.message : String(lastError)} ${JSON.stringify(
      lastTargets.map((target) => ({ title: target.title, url: target.url })),
    )}`,
  );
}

const electronArgs = [projectRoot, `--remote-debugging-port=${remoteDebuggingPort}`, `--user-data-dir=${userDataDir}`];
if (process.env.CI === 'true' && process.platform === 'linux') {
  electronArgs.push('--no-sandbox');
}

const mockLimecore = await startMockLimecoreServer();
servedCatalog = createMockCatalog(mockLimecore.baseUrl);

const child = spawn(electronPath, electronArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    LIME_DESKTOP_SMOKE: '1',
    LIME_DESKTOP_TEST_SILENT: headed ? '0' : '1',
    LIMECORE_CATALOG_URL: `${mockLimecore.baseUrl}/desktop/v1/catalog`,
    LIMECORE_SESSION_URL: `${mockLimecore.baseUrl}/desktop/v1/session`,
    LIMECORE_BILLING_URL: `${mockLimecore.baseUrl}/desktop/v1/billing`,
    LIMECORE_OEM_URL: `${mockLimecore.baseUrl}/desktop/v1/oem`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const output = [];
child.stdout.on('data', (chunk) => output.push(chunk.toString()));
child.stderr.on('data', (chunk) => output.push(chunk.toString()));

let cdp;
try {
  const target = await waitForDebugTarget();
  cdp = createCdpClient(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await waitForRendererReady(cdp);
  const bridgeState = await evaluate(cdp, `(async () => {
    const bootstrap = await window.limeDesktop.platform.getBootstrap();
    const projection = await window.limeDesktop.apps.install('${fixtureAppId}');
    const login = await window.limeDesktop.auth.login({ tenantName: 'Smoke 租户', accountEmail: 'smoke@limecloud.local' });
    await window.limeDesktop.settings.saveModel({
      ...bootstrap.modelSettings,
      defaultTextModelId: 'local-default',
      providers: bootstrap.modelSettings.providers.map((provider) => provider.id === 'local'
        ? { ...provider, enabled: true, apiKeyConfigured: true }
        : provider),
    });
    const billing = await window.limeDesktop.billing.refresh();
    const syncedBootstrap = await window.limeDesktop.platform.getBootstrap();
    const launch = await window.limeDesktop.apps.launchEntry({ appId: '${fixtureAppId}', entryKey: '${fixtureEntryKey}' });
    const diagnostics = await window.limeDesktop.apps.invokeCapability({
      appId: '${fixtureAppId}',
      entryKey: '${fixtureEntryKey}',
      capability: 'lime.diagnostics',
      operation: 'smoke',
    });
    const capability = await window.limeDesktop.apps.invokeCapability({
      appId: '${fixtureAppId}',
      entryKey: '${fixtureEntryKey}',
      capability: 'lime.modelSettings',
      operation: 'smoke',
    });
    const agentExecution = await window.limeDesktop.apps.invokeCapability({
      appId: '${fixtureAppId}',
      entryKey: '${fixtureEntryKey}',
      capability: 'lime.agentExecution',
      operation: 'start',
      input: {
        prompt: 'smoke agent execution readiness probe',
        modelPolicy: { capability: 'agent' },
        toolPolicy: { permissionMode: 'safe' },
      },
    });
    return {
      catalogCount: bootstrap.catalog.length,
      controlPlaneSource: bootstrap.diagnostics.controlPlane.source,
      loginSource: login.source,
      loginAuthMode: login.authMode,
      sessionSource: syncedBootstrap.authSession.source,
      billingSource: billing.source,
      oemSource: syncedBootstrap.oemProjection.source,
      oemBrandName: syncedBootstrap.oemProjection.brandName,
      hasProjection: projection.appId === '${fixtureAppId}',
      billingState: billing.state,
      launched: launch.launched,
      snapshotAppId: launch.snapshot?.appId,
      capabilityOk: capability.ok,
      agentExecutionOk: agentExecution.ok,
      agentExecutionState: agentExecution.output?.state,
      agentExecutionBackend: agentExecution.output?.backend,
      agentExecutionEventType: agentExecution.output?.events?.[0]?.type,
      agentToolCount: agentExecution.output?.events?.[0]?.payload?.toolCount,
      diagnosticsHasClaudeDescriptor: diagnostics.output?.agentExecution?.backends?.some((backend) =>
        backend.kind === 'claude-sdk' && backend.status === 'not-installed'
      ),
      diagnosticsHasPiDescriptor: diagnostics.output?.agentExecution?.backends?.some((backend) =>
        backend.kind === 'pi-sidecar' && backend.status === 'not-installed'
      ),
      diagnosticsToolCount: diagnostics.output?.agentExecution?.tools?.length,
      bodyHasRuntime: document.body.innerText.includes('运行'),
    };
  })()`, true);

  if (
    bridgeState.catalogCount !== 1 ||
    bridgeState.controlPlaneSource !== 'limecore' ||
    bridgeState.loginSource !== 'limecore' ||
    bridgeState.loginAuthMode !== 'oauth' ||
    bridgeState.sessionSource !== 'limecore' ||
    bridgeState.billingSource !== 'limecore' ||
    bridgeState.oemSource !== 'limecore' ||
    bridgeState.oemBrandName !== 'Mock Limecore Brand' ||
    !bridgeState.hasProjection ||
    bridgeState.billingState !== 'active' ||
    !bridgeState.launched ||
    bridgeState.snapshotAppId !== fixtureAppId ||
    !bridgeState.capabilityOk ||
    bridgeState.agentExecutionOk ||
    bridgeState.agentExecutionState !== 'blocked' ||
    bridgeState.agentExecutionBackend !== 'blocked' ||
    bridgeState.agentExecutionEventType !== 'blocked' ||
    bridgeState.agentToolCount !== 2 ||
    !bridgeState.diagnosticsHasClaudeDescriptor ||
    !bridgeState.diagnosticsHasPiDescriptor ||
    bridgeState.diagnosticsToolCount !== 2
  ) {
    throw new Error(`Smoke 状态不符合预期：${JSON.stringify(bridgeState)}`);
  }

  servedCatalog = createMockCatalog(mockLimecore.baseUrl, { fixtureUpdateAvailable: true });
  const updateState = await evaluate(cdp, `(async () => {
    const checked = await window.limeDesktop.updates.check();
    const update = checked.availableUpdates.find((item) => item.appId === '${fixtureAppId}');
    const downloaded = await window.limeDesktop.updates.download('${fixtureAppId}');
    const applied = await window.limeDesktop.updates.apply('${fixtureAppId}');
    const installed = await window.limeDesktop.apps.listInstalled();
    const fixtureRecord = installed.find((item) => item.appId === '${fixtureAppId}');
    return {
      controlPlaneSource: checked.controlPlane?.source,
      updateTargetKind: update?.targetKind,
      updateNextVersion: update?.nextVersion,
      updateHasArtifact: Boolean(update?.artifact?.sha256),
      downloadedOk: downloaded.ok,
      downloadedState: downloaded.state,
      downloadedVerified: downloaded.updateState.downloadedUpdates?.some((item) =>
        item.targetKind === 'agentapp-package' && item.appId === '${fixtureAppId}' && item.version === '0.1.1' && item.verified
      ),
      appliedOk: applied.ok,
      appliedState: applied.state,
      installedVersion: fixtureRecord?.version,
      packageHashMatches: fixtureRecord?.packageHash === update?.artifact?.sha256,
    };
  })()`, true);
  if (
    updateState.controlPlaneSource !== 'limecore' ||
    updateState.updateTargetKind !== 'agentapp-package' ||
    updateState.updateNextVersion !== '0.1.1' ||
    !updateState.updateHasArtifact ||
    !updateState.downloadedOk ||
    updateState.downloadedState !== 'downloaded' ||
    !updateState.downloadedVerified ||
    !updateState.appliedOk ||
    updateState.appliedState !== 'applied' ||
    updateState.installedVersion !== '0.1.1' ||
    !updateState.packageHashMatches
  ) {
    throw new Error(`更新分发状态不符合预期：${JSON.stringify(updateState)}`);
  }
  bridgeState.limecoreRelease = true;

  const lifecycleState = await evaluate(cdp, `(async () => {
    const changes = [];
    const stop = window.limeDesktop.platform.onChanged((event) => {
      changes.push({
        reason: event.reason,
        appId: event.appId,
        installedCount: event.bootstrap.installedApps.length,
      });
    });
    const uninstall = await window.limeDesktop.apps.uninstall({ appId: '${fixtureAppId}', keepData: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
    stop();
    const bootstrap = await window.limeDesktop.platform.getBootstrap();
    const projection = await window.limeDesktop.apps.getProjection('${fixtureAppId}');
    const snapshot = await window.limeDesktop.apps.getRuntimeSnapshot({
      appId: '${fixtureAppId}',
      entryKey: '${fixtureEntryKey}',
    });
    return {
      uninstallOk: uninstall.ok,
      uninstallStatus: uninstall.status,
      changeSeen: changes.some((event) => event.reason === 'app-uninstalled' && event.appId === '${fixtureAppId}'),
      installedGone: !bootstrap.installedApps.some((app) => app.appId === '${fixtureAppId}'),
      snapshotGone: !snapshot,
      projectionState: projection.readiness.state,
      entryDisabled: projection.entryCards.every((entry) => !entry.enabled),
    };
  })()`, true);
  if (
    !lifecycleState.uninstallOk ||
    lifecycleState.uninstallStatus !== 'removed' ||
    !lifecycleState.changeSeen ||
    !lifecycleState.installedGone ||
    !lifecycleState.snapshotGone ||
    lifecycleState.projectionState !== 'needs-setup' ||
    !lifecycleState.entryDisabled
  ) {
    throw new Error(`生命周期状态不符合预期：${JSON.stringify(lifecycleState)}`);
  }
  bridgeState.fixtureLifecycle = true;

  if (cdp.exceptions.length > 0) {
    throw new Error(`Renderer 发生异常：${cdp.exceptions.join('; ')}`);
  }

  console.log(`Electron smoke 通过：${JSON.stringify(bridgeState)}`);
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  const childOutput = output.join('').trim();
  if (childOutput) {
    console.error(childOutput.slice(-4000));
  }
  process.exitCode = 1;
} finally {
  cdp?.close();
  child.kill();
  await waitForChildExit(child);
  await closeServer(mockLimecore.server);
  await removeDirectoryWithRetry(userDataDir);
}
