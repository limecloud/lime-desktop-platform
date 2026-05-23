import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json();
}

async function waitForDebugTarget(timeoutMs = 20_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${remoteDebuggingPort}/json`);
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

const electronArgs = [projectRoot, `--remote-debugging-port=${remoteDebuggingPort}`, `--user-data-dir=${userDataDir}`];
if (process.env.CI === 'true' && process.platform === 'linux') {
  electronArgs.push('--no-sandbox');
}

const child = spawn(electronPath, electronArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    LIME_DESKTOP_SMOKE: '1',
    LIME_DESKTOP_TEST_SILENT: headed ? '0' : '1',
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
    return {
      catalogCount: bootstrap.catalog.length,
      hasProjection: projection.appId === 'content-studio',
      billingState: billing.state,
      launched: launch.launched,
      snapshotAppId: launch.snapshot?.appId,
      capabilityOk: capability.ok,
      bodyHasRuntime: document.body.innerText.includes('运行页'),
    };
  })()`, true);

  if (
    bridgeState.catalogCount < 2 ||
    !bridgeState.hasProjection ||
    bridgeState.billingState !== 'active' ||
    !bridgeState.launched ||
    bridgeState.snapshotAppId !== 'content-studio' ||
    !bridgeState.capabilityOk
  ) {
    throw new Error(`Smoke 状态不符合预期：${JSON.stringify(bridgeState)}`);
  }

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
  await removeDirectoryWithRetry(userDataDir);
}
