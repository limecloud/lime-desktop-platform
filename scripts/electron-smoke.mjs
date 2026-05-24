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
const zhongcaoRemoteDebuggingPort = remoteDebuggingPort + 500;
const userDataDir = mkdtempSync(join(tmpdir(), `lime-desktop-platform-smoke-${randomUUID()}-`));
const headed = process.argv.slice(2).includes('--headed') || process.env.LIME_DESKTOP_TEST_SILENT === '0';
const releaseBytes = Buffer.from(`lime desktop platform smoke release ${randomUUID()}`, 'utf8');
const releaseSha256 = createHash('sha256').update(releaseBytes).digest('hex');
let servedCatalog = [];

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
    devRuntime: metadata.devRuntime,
  };
}

function createMockCatalog(baseUrl, options = {}) {
  return ['content-studio', 'oem-starter', 'zhongcao'].map((sampleName) => {
    const catalogApp = readSampleCatalogApp(sampleName);
    if (sampleName !== 'oem-starter' || !options.oemUpdateAvailable) {
      return catalogApp;
    }

    return {
      ...catalogApp,
      latestVersion: '0.1.1',
      updatedAt: new Date().toISOString(),
      releaseNotes: ['Smoke: limecore release artifact 校验链路。'],
      releaseArtifact: {
        url: `${baseUrl}/artifacts/oem-starter-0.1.1.tgz`,
        sha256: releaseSha256,
        sizeBytes: releaseBytes.byteLength,
        fileName: 'oem-starter-0.1.1.tgz',
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

    if (request.url === '/artifacts/oem-starter-0.1.1.tgz') {
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
      text.includes('Lime Desktop Platform') &&
      text.includes('应用中心') &&
      text.includes('设置中心')
    ) {
      return state;
    }
    await wait(250);
  }
  throw new Error(`Renderer 未在超时时间内完成加载或 preload bridge 缺失：${JSON.stringify(lastState)}`);
}

async function waitForZhongcaoReady(cdp, timeoutMs = 20_000) {
  const started = Date.now();
  let lastState;
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(cdp, `(() => ({
      readyState: document.readyState,
      hasBridge: Boolean(window.zhongcao),
      text: document.body?.innerText ?? ''
    }))()`);
    lastState = state;
    const text = state?.text ?? '';
    if (
      state?.readyState === 'complete' &&
      state.hasBridge &&
      text.includes('种草日记') &&
      text.includes('runtime projection') &&
      text.includes('STREAM 五维') &&
      text.includes('宿主框架能力') &&
      text.includes('应用中心') &&
      text.includes('模型设置') &&
      text.includes('打开模型设置') &&
      text.includes('OAuth / 会话') &&
      text.includes('OEM / 品牌') &&
      text.includes('充值 / 订阅') &&
      text.includes('更新 / 分发') &&
      text.includes('Agent Runtime') &&
      text.includes('Host Bridge') &&
      text.includes('本地状态 / 缓存')
    ) {
      return state;
    }
    await wait(250);
  }
  throw new Error(`zhongcao 页面未在超时时间内完成渲染：${JSON.stringify({
    hasBridge: lastState?.hasBridge,
    readyState: lastState?.readyState,
    text: (lastState?.text ?? '').slice(0, 1200),
  })}`);
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
    LIME_ZHONGCAO_REMOTE_DEBUGGING_PORT: String(zhongcaoRemoteDebuggingPort),
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
    const projection = await window.limeDesktop.apps.install('content-studio');
    await window.limeDesktop.auth.login({ tenantName: 'Smoke 租户', accountEmail: 'smoke@limecloud.local' });
    await window.limeDesktop.settings.saveModel({
      ...bootstrap.modelSettings,
      defaultTextModelId: 'local-default',
      providers: bootstrap.modelSettings.providers.map((provider) => provider.id === 'local'
        ? { ...provider, enabled: true, apiKeyConfigured: true }
        : provider),
    });
    const billing = await window.limeDesktop.billing.refresh();
    const launch = await window.limeDesktop.apps.launchEntry({ appId: 'content-studio', entryKey: 'workbench' });
    const capability = await window.limeDesktop.apps.invokeCapability({
      appId: 'content-studio',
      entryKey: 'workbench',
      capability: 'lime.modelSettings',
      operation: 'smoke',
    });
    const zhongcaoProjection = await window.limeDesktop.apps.install('lime.zhongcao');
    const zhongcaoLaunch = await window.limeDesktop.apps.launchEntry({
      appId: 'lime.zhongcao',
      entryKey: 'diary-workbench',
    });
    const oemProjection = await window.limeDesktop.apps.install('oem-starter');
    return {
      catalogCount: bootstrap.catalog.length,
      controlPlaneSource: bootstrap.diagnostics.controlPlane.source,
      hasProjection: projection.appId === 'content-studio',
      hasZhongcaoProjection: zhongcaoProjection.appId === 'lime.zhongcao',
      hasOemProjection: oemProjection.appId === 'oem-starter',
      billingState: billing.state,
      launched: launch.launched,
      snapshotAppId: launch.snapshot?.appId,
      capabilityOk: capability.ok,
      zhongcaoLaunched: zhongcaoLaunch.launched,
      zhongcaoSnapshotAppId: zhongcaoLaunch.snapshot?.appId,
      bodyHasRuntime: document.body.innerText.includes('运行页'),
    };
  })()`, true);

  if (
    bridgeState.catalogCount < 3 ||
    bridgeState.controlPlaneSource !== 'limecore' ||
    !bridgeState.hasProjection ||
    !bridgeState.hasZhongcaoProjection ||
    !bridgeState.hasOemProjection ||
    bridgeState.billingState !== 'active' ||
    !bridgeState.launched ||
    bridgeState.snapshotAppId !== 'content-studio' ||
    !bridgeState.capabilityOk ||
    !bridgeState.zhongcaoLaunched ||
    bridgeState.zhongcaoSnapshotAppId !== 'lime.zhongcao'
  ) {
    throw new Error(`Smoke 状态不符合预期：${JSON.stringify(bridgeState)}`);
  }

  servedCatalog = createMockCatalog(mockLimecore.baseUrl, { oemUpdateAvailable: true });
  const updateState = await evaluate(cdp, `(async () => {
    const checked = await window.limeDesktop.updates.check();
    const update = checked.availableUpdates.find((item) => item.appId === 'oem-starter');
    const downloaded = await window.limeDesktop.updates.download('oem-starter');
    const applied = await window.limeDesktop.updates.apply('oem-starter');
    const installed = await window.limeDesktop.apps.listInstalled();
    const oemRecord = installed.find((item) => item.appId === 'oem-starter');
    return {
      controlPlaneSource: checked.controlPlane?.source,
      updateNextVersion: update?.nextVersion,
      updateHasArtifact: Boolean(update?.artifact?.sha256),
      downloadedOk: downloaded.ok,
      downloadedState: downloaded.state,
      downloadedVerified: downloaded.updateState.downloadedUpdates?.some((item) =>
        item.appId === 'oem-starter' && item.version === '0.1.1' && item.verified
      ),
      appliedOk: applied.ok,
      appliedState: applied.state,
      installedVersion: oemRecord?.version,
      packageHashMatches: oemRecord?.packageHash === update?.artifact?.sha256,
    };
  })()`, true);
  if (
    updateState.controlPlaneSource !== 'limecore' ||
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

  const zhongcaoTarget = await waitForTarget(
    zhongcaoRemoteDebuggingPort,
    (target) => target.title.includes('种草日记') || target.url.includes('zhongcao'),
  );
  const zhongcaoCdp = createCdpClient(zhongcaoTarget.webSocketDebuggerUrl);
  try {
    await zhongcaoCdp.send('Runtime.enable');
    await waitForZhongcaoReady(zhongcaoCdp);
    const runtimeBridgeState = await evaluate(zhongcaoCdp, `(async () => {
      const before = await window.zhongcao.getWorkspaceSnapshot();
      await window.zhongcao.invokeCapability({
        capability: 'lime.modelSettings',
        action: 'geo.generateDraft',
        payload: { draftId: before.data.drafts[0]?.id }
      });
      const after = await window.zhongcao.getWorkspaceSnapshot();
      const task = after.data.generationTasks[0];
      const intent = await window.zhongcao.openPlatformIntent({
        target: 'model-settings',
        reason: 'smoke 验证业务 App 只发送平台设置导航意图'
      });
      const afterIntent = await window.zhongcao.getWorkspaceSnapshot();
      return {
        taskAction: task?.action,
        taskSource: task?.source,
        taskStatus: task?.status,
        taskId: task?.id,
        intentOk: intent.ok,
        intentSource: intent.source,
        intentTarget: intent.target,
        intentEventMessage: afterIntent.data.runtimeEvents[0]?.message,
        eventMessage: after.data.runtimeEvents[0]?.message,
      };
    })()`, true);
    if (
      runtimeBridgeState.taskAction !== 'geo.generateDraft' ||
      runtimeBridgeState.taskSource !== 'runtime-projection' ||
      runtimeBridgeState.taskStatus !== 'succeeded' ||
      !runtimeBridgeState.taskId ||
      !runtimeBridgeState.intentOk ||
      runtimeBridgeState.intentSource !== 'runtime-projection' ||
      runtimeBridgeState.intentTarget !== 'model-settings' ||
      !runtimeBridgeState.intentEventMessage?.includes('平台导航意图已发送') ||
      !runtimeBridgeState.eventMessage?.includes('runtime bridge 能力调用完成')
    ) {
      throw new Error(`runtime bridge 状态不符合预期：${JSON.stringify(runtimeBridgeState)}`);
    }
    bridgeState.zhongcaoRuntimeBridge = true;
    bridgeState.zhongcaoPlatformIntent = true;
  } finally {
    zhongcaoCdp.close();
  }

  const lifecycleState = await evaluate(cdp, `(async () => {
    const changes = [];
    const stop = window.limeDesktop.platform.onChanged((event) => {
      changes.push({
        reason: event.reason,
        appId: event.appId,
        installedCount: event.bootstrap.installedApps.length,
      });
    });
    const uninstall = await window.limeDesktop.apps.uninstall({ appId: 'lime.zhongcao', keepData: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
    stop();
    const bootstrap = await window.limeDesktop.platform.getBootstrap();
    const projection = await window.limeDesktop.apps.getProjection('lime.zhongcao');
    const snapshot = await window.limeDesktop.apps.getRuntimeSnapshot({
      appId: 'lime.zhongcao',
      entryKey: 'diary-workbench',
    });
    return {
      uninstallOk: uninstall.ok,
      uninstallStatus: uninstall.status,
      changeSeen: changes.some((event) => event.reason === 'app-uninstalled' && event.appId === 'lime.zhongcao'),
      installedGone: !bootstrap.installedApps.some((app) => app.appId === 'lime.zhongcao'),
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
  bridgeState.zhongcaoLifecycle = true;

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
