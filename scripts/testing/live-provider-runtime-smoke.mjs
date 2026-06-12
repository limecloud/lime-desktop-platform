import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket as UndiciWebSocket } from 'undici';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const WebSocketClient = globalThis.WebSocket ?? UndiciWebSocket;
const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultAppServerBin = resolve(platformRoot, '../../aiclientproxy/lime/lime-rs/target/debug/app-server');
const mainEntry = join(platformRoot, 'out/main/index.js');
const remoteDebuggingPort = 9873 + Math.floor(Math.random() * 400);
const providerId = 'desktop-platform-live-provider';
const appId = 'lime.platform.conformance';
const entryKey = 'host-conformance';
let tempRoot;
let platformUserDataDir;
let appServerDataDir;
let appPolicyPath;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    const value = !next || next.startsWith('--') ? 'true' : next;
    if (value !== 'true') index += 1;
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const allowed = args['allow-live-provider'] === 'true' || process.env.LIME_DESKTOP_ALLOW_LIVE_PROVIDER === '1';
const appServerBin = resolve(String(args['app-server-bin'] || process.env.APP_SERVER_BIN || defaultAppServerBin));
const liveApiKey = process.env.LIME_DESKTOP_LIVE_PROVIDER_API_KEY?.trim();
const liveModel = process.env.LIME_DESKTOP_LIVE_PROVIDER_MODEL?.trim();
const liveProtocol = process.env.LIME_DESKTOP_LIVE_PROVIDER_PROTOCOL?.trim() || 'openai-compatible';
const liveBaseUrl = process.env.LIME_DESKTOP_LIVE_PROVIDER_BASE_URL?.trim() || defaultBaseUrlForProtocol(liveProtocol);
const liveProviderName = process.env.LIME_DESKTOP_LIVE_PROVIDER_NAME?.trim() || 'Desktop Platform Live Provider';
const liveUseResponsesApi = process.env.LIME_DESKTOP_LIVE_PROVIDER_USE_RESPONSES_API === '1';
const liveTimeoutMs = Number(process.env.LIME_DESKTOP_LIVE_PROVIDER_TIMEOUT_MS || '120000');
const livePrompt =
  process.env.LIME_DESKTOP_LIVE_PROVIDER_PROMPT?.trim() ||
  '用一句中文回答：Lime Desktop Platform live provider runtime smoke 已经连通。';

function failGate(message) {
  console.error(`[live-provider-runtime-smoke] ${message}`);
  console.error(
    [
      '该入口会通过真实 Lime App Server runtime backend 调用上游 LLM API，默认 fail-closed。',
      '需要显式授权：--allow-live-provider 或 LIME_DESKTOP_ALLOW_LIVE_PROVIDER=1。',
      '需要平台专用环境变量：LIME_DESKTOP_LIVE_PROVIDER_API_KEY、LIME_DESKTOP_LIVE_PROVIDER_MODEL。',
      '可选环境变量：LIME_DESKTOP_LIVE_PROVIDER_BASE_URL、LIME_DESKTOP_LIVE_PROVIDER_PROTOCOL、LIME_DESKTOP_LIVE_PROVIDER_USE_RESPONSES_API、APP_SERVER_BIN。',
      '脚本不会读取任何通用 Provider 环境变量。',
    ].join('\n'),
  );
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFileExists(filePath, message) {
  assert(existsSync(filePath), `${message}: ${filePath}`);
}

function redactLiveSecret(value) {
  const text = String(value ?? '');
  if (!liveApiKey) {
    return text;
  }
  return text.split(liveApiKey).join('[REDACTED_LIVE_PROVIDER_API_KEY]');
}

function assertValidTimeout(value) {
  assert(Number.isFinite(value) && value >= 10_000, 'LIME_DESKTOP_LIVE_PROVIDER_TIMEOUT_MS 必须是不小于 10000 的毫秒数。');
}

async function withTimeout(promise, timeoutMs, label) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, rejectTimeout) => {
        timeout = setTimeout(() => rejectTimeout(new Error(`${label} 超时：${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function defaultBaseUrlForProtocol(protocol) {
  if (protocol === 'anthropic-compatible') {
    return 'https://api.anthropic.com';
  }
  if (protocol === 'gemini-native') {
    return 'https://generativelanguage.googleapis.com';
  }
  return 'https://api.openai.com';
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function isChildRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

async function waitForChildExit(child, timeoutMs = 10_000) {
  if (!isChildRunning(child)) {
    return;
  }

  await new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => {
      rejectExit(new Error(`等待子进程退出超时：pid=${child.pid ?? 'unknown'}`));
    }, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function terminateChild(child, timeoutMs = 10_000) {
  if (!isChildRunning(child)) {
    return;
  }

  child.kill('SIGTERM');
  try {
    await waitForChildExit(child, timeoutMs);
  } catch (error) {
    if (isChildRunning(child)) {
      child.kill('SIGKILL');
      await waitForChildExit(child, 5_000);
      return;
    }
    throw error;
  }
}

async function removeDirectoryWithRetry(directoryPath, attempts = 10) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      rmSync(directoryPath, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await wait(150 + attempt * 150);
    }
  }
  throw lastError;
}

function shellQuote(value) {
  const text = String(value);
  if (!/[\s"']/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function sanitizedEnv(extra = {}) {
  return {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || homedir(),
    TMPDIR: process.env.TMPDIR || tmpdir(),
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    ...extra,
  };
}

function createAppPolicyFixture(filePath) {
  writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        capabilities: [
          {
            id: 'lime.agent',
            title: 'Lime Agent',
            methods: ['agentSession/turn/start'],
            appIds: [appId],
          },
        ],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function initializeTempPaths() {
  tempRoot = mkdtempSync(join(tmpdir(), `desktop-platform-live-provider-${randomUUID()}-`));
  platformUserDataDir = join(tempRoot, 'platform-user-data');
  appServerDataDir = join(tempRoot, 'app-server-data');
  appPolicyPath = join(tempRoot, 'app-policy.json');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json();
}

async function waitForDebugTarget(port = remoteDebuggingPort, timeoutMs = 30_000) {
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
  throw new Error(`等待平台 Electron 调试目标超时：${lastError instanceof Error ? lastError.message : String(lastError)}`);
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
    ws.onerror = () => rejectOpen(new Error('无法连接平台 CDP WebSocket'));
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

async function waitForPlatformRendererReady(cdp, timeoutMs = 30_000) {
  const started = Date.now();
  let lastState;
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(cdp, `(() => ({
      readyState: document.readyState,
      hasBridge: Boolean(window.limeDesktop),
      text: document.body?.innerText?.slice(0, 1200) ?? ''
    }))()`);
    lastState = state;
    if (state?.readyState === 'complete' && state.hasBridge && String(state.text || '').includes('模型设置')) {
      return state;
    }
    await wait(250);
  }
  throw new Error(`平台 renderer 未完成加载或 preload bridge 缺失：${JSON.stringify(lastState)}`);
}

function spawnPlatformElectron() {
  const backendArgs = [
    '--backend',
    'runtime',
    '--app-policy',
    appPolicyPath,
    '--data-dir',
    appServerDataDir,
  ].map(shellQuote).join(' ');
  const electronArgs = [
    platformRoot,
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--user-data-dir=${platformUserDataDir}`,
  ];
  if (process.env.CI === 'true' && process.platform === 'linux') {
    electronArgs.push('--no-sandbox');
  }
  return spawn(electronPath, electronArgs, {
    cwd: platformRoot,
    env: {
      ...sanitizedEnv(),
      APP_SERVER_BIN: appServerBin,
      APP_SERVER_ARGS: backendArgs,
      APP_SERVER_BACKEND_MODE: 'runtime',
      ELECTRON_ENABLE_LOGGING: '1',
      LIME_DESKTOP_SMOKE: '1',
      LIME_DESKTOP_TEST_SILENT: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function seedPlatformModelSettings(cdp) {
  const result = await evaluate(cdp, `(async () => {
    const current = await window.limeDesktop.settings.getModel();
    const saved = await window.limeDesktop.settings.saveModel({
      ...current,
      defaultAgentProviderId: ${JSON.stringify(providerId)},
      defaultTextModelId: ${JSON.stringify(liveModel)},
      providers: [
        {
          id: ${JSON.stringify(providerId)},
          displayName: ${JSON.stringify(liveProviderName)},
          protocol: ${JSON.stringify(liveProtocol)},
          capabilityKinds: ['text'],
          enabled: true,
          apiKeyConfigured: false,
          authType: 'api-key',
          baseUrl: ${JSON.stringify(liveBaseUrl)},
          useResponsesApi: ${JSON.stringify(liveUseResponsesApi)},
          models: [${JSON.stringify(liveModel)}],
          apiKey: ${JSON.stringify(liveApiKey)}
        }
      ]
    });
    const bootstrap = await window.limeDesktop.platform.getBootstrap();
    const provider = bootstrap.modelSettings.providers.find((item) => item.models?.includes(${JSON.stringify(liveModel)}));
    const diagnosticsProvider = bootstrap.diagnostics.appServerRuntime.modelProvider.enabledProviders.find((item) =>
      item.models?.includes(${JSON.stringify(liveModel)})
    );
    return {
      providerId: provider?.id,
      defaultAgentProviderId: bootstrap.modelSettings.defaultAgentProviderId,
      defaultTextModelId: bootstrap.modelSettings.defaultTextModelId,
      apiKeyConfigured: provider?.apiKeyConfigured,
      credentialState: diagnosticsProvider?.credentialState,
      appServerProviderId: diagnosticsProvider?.credentialState?.appServerProviderId,
      runtimeStatus: diagnosticsProvider?.credentialState?.runtimeStatus,
      savedText: JSON.stringify(saved),
      bootstrapText: JSON.stringify(bootstrap)
    };
  })()`, true);

  assert(result?.defaultTextModelId === liveModel, `平台默认模型未保存：${JSON.stringify(result)}`);
  assert(result.apiKeyConfigured === true, `平台 provider key 未进入 App Server provider store：${JSON.stringify(result)}`);
  assert(result.runtimeStatus === 'app-server-provider-ready', `App Server provider store 未 ready：${JSON.stringify(result)}`);
  assert(result.credentialState?.storageKind === 'app-server-provider-store', `Provider key 未归属 App Server provider store：${JSON.stringify(result)}`);
  assert(!result.savedText.includes(liveApiKey), 'settings.saveModel 返回值泄露 API Key。');
  assert(!result.bootstrapText.includes(liveApiKey), '平台 bootstrap 泄露 API Key。');
  return result;
}

async function invokeLiveAgent(cdp, appServerProviderId) {
  const result = await evaluate(cdp, `(async () => {
    const response = await window.limeDesktop.apps.invokeCapability({
      appId: ${JSON.stringify(appId)},
      entryKey: ${JSON.stringify(entryKey)},
      capability: 'lime.agent',
      operation: 'start',
      input: {
        prompt: ${JSON.stringify(livePrompt)},
        runtimeOptions: {
          capabilityId: 'lime.agent',
          modelId: ${JSON.stringify(liveModel)},
          permissionMode: 'safe'
        },
        modelPolicy: {
          preferredModelId: ${JSON.stringify(liveModel)},
          capability: 'agent'
        },
        toolPolicy: {
          permissionMode: 'safe',
          allowedToolIds: []
        }
      }
    });
    return {
      response,
      text: JSON.stringify(response)
    };
  })()`, true);

  assert(result?.response?.ok === true, `live provider runtime 未成功：${result?.text}`);
  const output = result.response.output;
  assert(output?.runtimeContext?.credentialPolicy?.resolver === 'app-server-provider-store', `runtime resolver 非 App Server provider store：${result.text}`);
  assert(output.runtimeContext.credentialPolicy.productionInjectionReady === true, `runtime credential policy 未 ready：${result.text}`);
  assert(output.runtimeContext.modelProfile?.provider?.appServerProviderId, `runtimeContext 缺少 appServerProviderId：${result.text}`);
  if (appServerProviderId) {
    assert(
      output.runtimeContext.modelProfile.provider.appServerProviderId === appServerProviderId,
      `runtimeContext 未使用 App Server provider id：${result.text}`,
    );
  }
  assert(output.runtimeContext.modelProfile?.modelId === liveModel, `runtimeContext 未使用 live model：${result.text}`);
  assert(output.request?.runtimeOptions?.capabilityId === 'lime.agent', `App Server capability policy 未固定 lime.agent：${result.text}`);
  const eventTypes = Array.isArray(output.events) ? output.events.map((event) => event.type) : [];
  assert(
    eventTypes.includes('message.delta') || eventTypes.includes('turn.completed') || eventTypes.includes('completed'),
    `live provider runtime 未返回 message.delta / turn.completed / completed 事件：${result.text}`,
  );
  assert(!result.text.includes(liveApiKey), 'live provider runtime output 泄露 API Key。');
  assert(!/"apiKey"\s*:/.test(result.text), 'live provider runtime output 包含 apiKey 字段。');
  assert(!/"token"\s*:/.test(result.text), 'live provider runtime output 包含 token 字段。');
  assert(!/"secret"\s*:/.test(result.text), 'live provider runtime output 包含 secret 字段。');
  return {
    output,
    eventTypes,
  };
}

async function main() {
  if (!allowed) {
    failGate('缺少 live Provider 显式授权。');
    return;
  }
  if (!liveApiKey) {
    failGate('缺少 LIME_DESKTOP_LIVE_PROVIDER_API_KEY。');
    return;
  }
  if (!liveModel) {
    failGate('缺少 LIME_DESKTOP_LIVE_PROVIDER_MODEL。');
    return;
  }
  assertValidTimeout(liveTimeoutMs);
  assert(['openai-compatible', 'anthropic-compatible', 'gemini-native'].includes(liveProtocol), `不支持的 LIME_DESKTOP_LIVE_PROVIDER_PROTOCOL：${liveProtocol}`);
  assertFileExists(mainEntry, '缺少平台构建产物，请先运行 npm run build');
  assertFileExists(appServerBin, '缺少 App Server binary，请传 --app-server-bin 或设置 APP_SERVER_BIN');
  initializeTempPaths();
  createAppPolicyFixture(appPolicyPath);

  const platform = spawnPlatformElectron();
  let platformStdout = '';
  let platformStderr = '';
  platform.stdout.on('data', (chunk) => {
    platformStdout += chunk.toString();
  });
  platform.stderr.on('data', (chunk) => {
    platformStderr += chunk.toString();
  });

  let cdp;
  try {
    const target = await waitForDebugTarget();
    cdp = createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await waitForPlatformRendererReady(cdp);
    const seeded = await withTimeout(seedPlatformModelSettings(cdp), liveTimeoutMs, '保存 live Provider 设置');
    const liveRun = await withTimeout(invokeLiveAgent(cdp, seeded.appServerProviderId), liveTimeoutMs, '调用 live Provider runtime');

    console.log(
      `Live Provider runtime smoke 通过：${JSON.stringify({
        mode: 'lime-desktop-platform',
        appServer: 'json-rpc-runtime-backend',
        providerId: seeded.appServerProviderId || seeded.providerId,
        modelId: liveModel,
        credentialResolver: liveRun.output.runtimeContext.credentialPolicy.resolver,
        productionInjectionReady: liveRun.output.runtimeContext.credentialPolicy.productionInjectionReady,
        events: liveRun.eventTypes,
      })}`,
    );
  } catch (error) {
    const redactedStdout = redactLiveSecret(platformStdout);
    const redactedStderr = redactLiveSecret(platformStderr);
    throw new Error(
      `${redactLiveSecret(error instanceof Error ? error.message : String(error))}\nplatform stdout=${redactedStdout}\nplatform stderr=${redactedStderr}`,
    );
  } finally {
    cdp?.close();
    await terminateChild(platform);
    if (tempRoot) {
      await removeDirectoryWithRetry(tempRoot);
    }
  }
}

main().catch((error) => {
  console.error(`[live-provider-runtime-smoke] failed: ${redactLiveSecret(error instanceof Error ? error.message : String(error))}`);
  process.exitCode = 1;
});
