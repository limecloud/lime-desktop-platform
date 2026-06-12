import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket as UndiciWebSocket } from 'undici';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const WebSocketClient = globalThis.WebSocket ?? UndiciWebSocket;
const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultContentStudioRoot = resolve(platformRoot, '../content-studio');
const defaultZhongcaoRoot = resolve(platformRoot, '../zhongcao');
const defaultLimeNovelRoot = resolve(platformRoot, '../lime-novel');
const defaultAppServerBin = resolve(platformRoot, '../../aiclientproxy/lime/lime-rs/target/debug/app-server');
const mainEntry = join(platformRoot, 'out/main/index.js');
const remoteDebuggingPort = 9833 + Math.floor(Math.random() * 400);
const tempRoot = mkdtempSync(join(tmpdir(), `lime-desktop-product-app-live-${randomUUID()}-`));
const platformUserDataDir = join(tempRoot, 'platform-user-data');
const discoveryPath = join(tempRoot, 'runtime-bridge-discovery.json');
const externalBackendPath = join(tempRoot, 'external-backend.mjs');
const appPolicyPath = join(tempRoot, 'app-policy.json');

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
const contentStudioRoot = resolve(String(args['content-studio-root'] || process.env.CONTENT_STUDIO_ROOT || defaultContentStudioRoot));
const zhongcaoRoot = resolve(String(args['zhongcao-root'] || process.env.ZHONGCAO_ROOT || defaultZhongcaoRoot));
const limeNovelRoot = resolve(String(args['lime-novel-root'] || process.env.LIME_NOVEL_ROOT || defaultLimeNovelRoot));
const appServerBin = resolve(String(args['app-server-bin'] || process.env.APP_SERVER_BIN || defaultAppServerBin));
const providerId = 'platform-live-provider';
const modelId = 'platform-live-model';
const providerSecret = 'sk-platform-live-secret';
const artifactMarkdown = [
  '# 平台 Runtime 生成草稿',
  '',
  '这段内容来自真实 lime-desktop-platform runtime bridge 与 Lime App Server JSON-RPC external backend fixture。',
  '',
  '它用于证明 Product App 不保存 Provider Key，只通过平台 discovery 与 lime.agent 获取运行结果。',
].join('\n');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFileExists(filePath, message) {
  assert(existsSync(filePath), `${message}: ${filePath}`);
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

function createExternalBackendFixture(filePath) {
  writeFileSync(
    filePath,
    `
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const request = input.request ?? {};
const sessionId = request.session?.sessionId ?? request.session?.session_id ?? 'sess_platform_live';
const threadId = request.session?.threadId ?? request.session?.thread_id ?? \`thread_\${sessionId}\`;
const turnId = request.turn?.turnId ?? request.turn?.turn_id ?? 'turn_platform_live';
const markdown = ${JSON.stringify(artifactMarkdown)};

console.log(JSON.stringify({
  type: 'message.delta',
  payload: {
    text: '平台 runtime bridge 已连接 App Server JSON-RPC external backend fixture。',
    providerPreference: request.providerPreference,
    modelPreference: request.modelPreference
  }
}));
console.log(JSON.stringify({
  type: 'artifact.snapshot',
  payload: {
    artifactId: 'platform-live-artifact',
    artifactRef: 'platform-live-artifact',
    title: '平台 Runtime 生成草稿',
    content: markdown,
    markdown,
    summary: '真实平台 runtime bridge 与 App Server JSON-RPC external backend fixture 已返回 artifact。'
  }
}));
console.log(JSON.stringify({
  type: 'turn.completed',
  payload: {
    sessionId,
    threadId,
    turnId,
    reason: 'external-fixture-completed'
  }
}));
`,
    'utf8',
  );
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
            appIds: ['content-studio', 'lime.zhongcao', 'lime.novel'],
          },
        ],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
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
  const bootstrapProbe = await evaluate(cdp, `(() => {
    const timeoutMs = 5000;
    const startedAt = Date.now();
    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve({ ok: false, timedOut: true, elapsedMs: Date.now() - startedAt }), timeoutMs);
    });
    const call = (async () => {
      if (!window.limeDesktop?.platform?.getBootstrap) {
        return { ok: false, hasBootstrapBridge: false };
      }
      try {
        const bootstrap = await window.limeDesktop.platform.getBootstrap();
        return {
          ok: true,
          hasBootstrapBridge: true,
          elapsedMs: Date.now() - startedAt,
          catalogApps: bootstrap?.catalog?.length ?? 0,
          providers: bootstrap?.modelSettings?.providers?.length ?? 0,
          diagnostics: bootstrap?.diagnostics
        };
      } catch (error) {
        return {
          ok: false,
          hasBootstrapBridge: true,
          elapsedMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })();
    return Promise.race([call, timeout]);
  })()`, true);
  throw new Error(`平台 renderer 未完成加载或 preload bridge 缺失：${JSON.stringify({ lastState, bootstrapProbe })}`);
}

async function waitForFile(filePath, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf8'));
    }
    await wait(200);
  }
  throw new Error(`等待 runtime bridge discovery 文件超时：${filePath}`);
}

function spawnPlatformElectron() {
  const backendArgs = [
    '--backend',
    'external',
    '--backend-command',
    process.execPath,
    '--backend-arg',
    externalBackendPath,
    '--backend-timeout-ms',
    '15000',
    '--app-policy',
    appPolicyPath,
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
      APP_SERVER_BACKEND_MODE: 'external',
      ELECTRON_ENABLE_LOGGING: '1',
      LIME_DESKTOP_SMOKE: '1',
      LIME_DESKTOP_TEST_SILENT: '1',
      LIME_DESKTOP_PLATFORM_BRIDGE_DISCOVERY_PATH: discoveryPath,
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
      defaultTextModelId: ${JSON.stringify(modelId)},
      providers: [
        {
          id: ${JSON.stringify(providerId)},
          displayName: 'Platform Live Provider',
          protocol: 'openai-compatible',
          capabilityKinds: ['text'],
          enabled: true,
          apiKeyConfigured: false,
          authType: 'api-key',
          baseUrl: 'http://127.0.0.1:65535/v1',
          useResponsesApi: true,
          models: [${JSON.stringify(modelId)}],
          apiKey: ${JSON.stringify(providerSecret)}
        }
      ]
    });
    const bootstrap = await window.limeDesktop.platform.getBootstrap();
    const provider = bootstrap.modelSettings.providers.find((item) => item.models?.includes(${JSON.stringify(modelId)}));
    const diagnosticsProvider = bootstrap.diagnostics.appServerRuntime.modelProvider.enabledProviders.find((item) =>
      item.models?.includes(${JSON.stringify(modelId)})
    );
    return {
      providerId: provider?.id,
      defaultAgentProviderId: bootstrap.modelSettings.defaultAgentProviderId,
      defaultTextModelId: bootstrap.modelSettings.defaultTextModelId,
      apiKeyConfigured: provider?.apiKeyConfigured,
      runtimeStatus: diagnosticsProvider?.credentialState?.runtimeStatus,
      appServerProviderId: diagnosticsProvider?.credentialState?.appServerProviderId,
      savedText: JSON.stringify(saved),
      bootstrapText: JSON.stringify(bootstrap)
    };
  })()`, true);

  assert(result?.defaultTextModelId === modelId, `平台默认模型未保存：${JSON.stringify(result)}`);
  assert(result.apiKeyConfigured === true, `平台 provider key 未进入 App Server provider store：${JSON.stringify(result)}`);
  assert(result.runtimeStatus === 'app-server-provider-ready', `App Server provider store 未 ready：${JSON.stringify(result)}`);
  assert(!result.savedText.includes(providerSecret), 'settings.saveModel 返回值泄露 API Key。');
  assert(!result.bootstrapText.includes(providerSecret), '平台 bootstrap 泄露 API Key。');
  return result;
}

function runNodeScript(scriptPath, root, env, args = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      rejectRun(new Error(`${scriptPath} failed: code=${code ?? 'null'} signal=${signal ?? 'null'}\nstdout=${stdout}\nstderr=${stderr}`));
    });
  });
}

async function runContentStudioGate(platformProviderId) {
  const scriptPath = join(contentStudioRoot, 'scripts/platform-host-runtime-live-check.mjs');
  assertFileExists(scriptPath, '缺少 Content Studio platform host live gate');
  const result = await runNodeScript(
    scriptPath,
    contentStudioRoot,
    sanitizedEnv({
      LIME_DESKTOP_PLATFORM_BRIDGE_DISCOVERY_PATH: discoveryPath,
      CONTENT_STUDIO_RUNTIME_PROVIDER_PREFERENCE: platformProviderId,
      CONTENT_STUDIO_RUNTIME_MODEL_PREFERENCE: modelId,
    }),
  );
  assert(result.stdout.includes('mode=lime-desktop-platform'), `Content Studio 未连接平台模式：${result.stdout}`);
  assert(result.stdout.includes('source=discovery'), `Content Studio 未使用 discovery：${result.stdout}`);
  assert(result.stdout.includes('artifact=平台 Runtime 生成草稿'), `Content Studio 未收到 artifact.snapshot：${result.stdout}`);
  assert(!result.stdout.includes(providerSecret) && !result.stderr.includes(providerSecret), 'Content Studio live gate 输出泄露 API Key。');
  return result;
}

function waitForZhongcaoResult(child, timeoutMs = 30_000) {
  return new Promise((resolveResult, rejectResult) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectResult(new Error(`zhongcao runtime live smoke 超时。\nstdout=${stdout}\nstderr=${stderr}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const line = stdout.split('\n').find((item) => item.startsWith('ZHONGCAO_RUNTIME_BRIDGE_SMOKE_RESULT='));
      if (!line || settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveResult({
        stdout,
        stderr,
        result: JSON.parse(line.slice('ZHONGCAO_RUNTIME_BRIDGE_SMOKE_RESULT='.length)),
      });
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectResult(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectResult(new Error(`zhongcao Electron 提前退出：code=${code ?? 'null'} signal=${signal ?? 'null'}\nstdout=${stdout}\nstderr=${stderr}`));
    });
  });
}

async function runZhongcaoGate() {
  assertFileExists(join(zhongcaoRoot, 'out/main/index.js'), '缺少 zhongcao 构建产物，请先运行 zhongcao npm run build');
  const userDataDir = join(tempRoot, 'zhongcao-user-data');
  const child = spawn(electronPath, [zhongcaoRoot], {
    cwd: zhongcaoRoot,
    env: sanitizedEnv({
      ZHONGCAO_USER_DATA_DIR: userDataDir,
      ZHONGCAO_RUNTIME_BRIDGE_SMOKE: '1',
      LIME_DESKTOP_PLATFORM_BRIDGE_DISCOVERY_PATH: discoveryPath,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const output = await waitForZhongcaoResult(child);
    const result = output.result;
    assert(result.ok === true, `zhongcao runtime live gate 未成功：${JSON.stringify(result)}`);
    assert(result.readiness === 'ready', `zhongcao readiness 非 ready：${JSON.stringify(result)}`);
    assert(result.source === 'runtime-projection', `zhongcao 未使用 runtime-projection：${JSON.stringify(result)}`);
    assert(
      String(result.draft?.markdown || '').includes('真实 lime-desktop-platform runtime bridge'),
      `zhongcao 未写回 App Server artifact markdown：${JSON.stringify(result)}`,
    );
    assert(!output.stdout.includes(providerSecret) && !output.stderr.includes(providerSecret), 'zhongcao live gate 输出泄露 API Key。');
    return output;
  } finally {
    await terminateChild(child);
  }
}

function waitForLimeNovelResult(child, timeoutMs = 30_000) {
  return new Promise((resolveResult, rejectResult) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectResult(new Error(`lime-novel runtime live smoke 超时。\nstdout=${stdout}\nstderr=${stderr}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const line = stdout.split('\n').find((item) => item.startsWith('LIME_NOVEL_PLATFORM_RUNTIME_SMOKE_RESULT='));
      if (!line || settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveResult({
        stdout,
        stderr,
        result: JSON.parse(line.slice('LIME_NOVEL_PLATFORM_RUNTIME_SMOKE_RESULT='.length)),
      });
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectResult(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectResult(new Error(`lime-novel Electron 提前退出：code=${code ?? 'null'} signal=${signal ?? 'null'}\nstdout=${stdout}\nstderr=${stderr}`));
    });
  });
}

async function runLimeNovelGate() {
  assertFileExists(join(limeNovelRoot, 'out/main/index.js'), '缺少 lime-novel 构建产物，请先运行 lime-novel npm run build');
  const userDataDir = join(tempRoot, 'lime-novel-user-data');
  const documentsDir = join(tempRoot, 'lime-novel-documents');
  const child = spawn(electronPath, [limeNovelRoot], {
    cwd: limeNovelRoot,
    env: sanitizedEnv({
      LIME_NOVEL_USER_DATA_DIR: userDataDir,
      LIME_NOVEL_DOCUMENTS_DIR: documentsDir,
      LIME_NOVEL_PLATFORM_RUNTIME_SMOKE: '1',
      LIME_DESKTOP_PLATFORM_BRIDGE_DISCOVERY_PATH: discoveryPath,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const output = await waitForLimeNovelResult(child);
    const result = output.result;
    assert(result.ok === true, `lime-novel runtime live gate 未成功：${JSON.stringify(result)}`);
    assert(result.mode === 'platform', `lime-novel 未进入 platform 模式：${JSON.stringify(result)}`);
    assert(result.readiness === 'ready', `lime-novel readiness 非 ready：${JSON.stringify(result)}`);
    assert(result.platformSource === 'desktop-platform', `lime-novel 未使用 discovery：${JSON.stringify(result)}`);
    assert(
      String(result.artifact?.summary || result.artifact?.title || '').includes('平台 Runtime 生成草稿'),
      `lime-novel 未收到 App Server artifact：${JSON.stringify(result)}`,
    );
    assert(!output.stdout.includes(providerSecret) && !output.stderr.includes(providerSecret), 'lime-novel live gate 输出泄露 API Key。');
    return output;
  } finally {
    await terminateChild(child);
  }
}

async function main() {
  assertFileExists(mainEntry, '缺少平台构建产物，请先运行 npm run build');
  assertFileExists(appServerBin, '缺少 App Server binary，请传 --app-server-bin 或设置 APP_SERVER_BIN');
  assertFileExists(join(contentStudioRoot, 'package.json'), '缺少 Content Studio 仓库');
  assertFileExists(join(zhongcaoRoot, 'package.json'), '缺少 zhongcao 仓库');
  assertFileExists(join(limeNovelRoot, 'package.json'), '缺少 lime-novel 仓库');
  createExternalBackendFixture(externalBackendPath);
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
    const seeded = await seedPlatformModelSettings(cdp);
    const discovery = await waitForFile(discoveryPath);
    assert(discovery.protocol === 'lime.runtimeBridge.discovery', `discovery 协议不合法：${JSON.stringify(discovery)}`);
    assert(String(discovery.endpoint || '').startsWith('http://127.0.0.1:'), `discovery endpoint 非 loopback：${JSON.stringify(discovery)}`);

    const platformProviderId = seeded.appServerProviderId || seeded.providerId || providerId;
    const contentStudio = await runContentStudioGate(platformProviderId);
    const zhongcao = await runZhongcaoGate();
    const limeNovel = await runLimeNovelGate();

    console.log(
      `Product App runtime live smoke 通过：${JSON.stringify({
        mode: 'lime-desktop-platform',
        appServer: 'json-rpc-external-backend',
        discovery: 'published',
        providerId: platformProviderId,
        modelId,
        contentStudio: contentStudio.stdout.trim(),
        zhongcao: {
          ok: zhongcao.result.ok,
          source: zhongcao.result.source,
          taskStatus: zhongcao.result.latestTask?.status,
        },
        limeNovel: {
          ok: limeNovel.result.ok,
          source: limeNovel.result.platformSource,
          taskStatus: limeNovel.result.task?.status,
        },
      })}`,
    );
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nplatform stdout=${platformStdout}\nplatform stderr=${platformStderr}`,
    );
  } finally {
    cdp?.close();
    await terminateChild(platform);
    await removeDirectoryWithRetry(tempRoot);
  }
}

main().catch((error) => {
  console.error(`[product-app-runtime-live-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
