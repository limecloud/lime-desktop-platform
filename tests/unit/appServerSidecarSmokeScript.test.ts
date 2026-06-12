import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const scriptPath = join(projectRoot, 'scripts/testing/app-server-sidecar-smoke.mjs');
const productAppRuntimeLiveScriptPath = join(projectRoot, 'scripts/testing/product-app-runtime-live-smoke.mjs');
const liveProviderRuntimeScriptPath = join(projectRoot, 'scripts/testing/live-provider-runtime-smoke.mjs');
const releaseReadinessScriptPath = join(projectRoot, 'scripts/testing/release-readiness-check.mjs');
const packageJsonPath = join(projectRoot, 'package.json');

function createResourceFixture(args: string[] = ['--backend', 'unavailable']) {
  const root = join(tmpdir(), `platform-sidecar-smoke-script-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const appServerResourceDir = join(root, 'resources', 'app-server');
  const binDir = join(appServerResourceDir, 'bin');
  mkdirSync(binDir, { recursive: true });

  const binaryName = process.platform === 'win32' ? 'app-server.cmd' : 'app-server';
  const binaryPath = join(binDir, binaryName);
  const fixtureScriptPath = join(binDir, 'app-server-fixture.cjs');
  const fixtureScriptContent = `
const readline = require('node:readline');
const reader = readline.createInterface({ input: process.stdin });
reader.on('line', (line) => {
  if (!line.trim()) {
    return;
  }
  const envelope = JSON.parse(line);
  if (typeof envelope.id !== 'number') {
    return;
  }
  if (envelope.method === 'initialize') {
    console.log(JSON.stringify({
      id: envelope.id,
      result: {
        serverInfo: { name: 'app-server-fixture', version: '0.0.0', protocolVersion: 'appserver.v0' },
        capabilities: { agentSession: true, capabilityDiscovery: true }
      }
    }));
    return;
  }
  if (envelope.method === 'capability/list') {
    console.log(JSON.stringify({
      id: envelope.id,
      result: { capabilities: [{ id: 'lime.agent', methods: ['agentSession/turn/start'] }] }
    }));
    return;
  }
  if (envelope.method === 'agentSession/start') {
    console.log(JSON.stringify({
      id: envelope.id,
      result: {
        session: {
          sessionId: 'sess_fixture',
          threadId: 'thread_fixture',
          appId: envelope.params.appId,
          workspaceId: envelope.params.workspaceId,
          status: 'idle'
        }
      }
    }));
    return;
  }
  if (envelope.method === 'agentSession/turn/start') {
    console.log(JSON.stringify({
      id: envelope.id,
      error: { code: -32000, message: 'standalone app-server backend is not configured' }
    }));
  }
});
`;
  writeFileSync(fixtureScriptPath, fixtureScriptContent, 'utf8');
  const binaryContent =
    process.platform === 'win32'
      ? `@echo off\r\n"${process.execPath}" "%~dp0app-server-fixture.cjs" %*\r\n`
      : `#!/bin/sh\nexec "${process.execPath}" "$(dirname "$0")/app-server-fixture.cjs" "$@"\n`;
  writeFileSync(binaryPath, binaryContent, 'utf8');
  chmodSync(binaryPath, 0o755);
  const sha256 = createHash('sha256').update(binaryContent).digest('hex');

  writeFileSync(
    join(appServerResourceDir, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        binaries: {
          [`${process.platform}-${process.arch}`]: {
            path: `bin/${binaryName}`,
            sha256,
            args,
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    root,
    resourcesDir: join(root, 'resources'),
    appServerResourceDir,
    binaryPath,
  };
}

test('app-server sidecar smoke script 在 package-resources 模式从 APP_SERVER_RESOURCE_DIR 校验资源后启动 binary', () => {
  const fixture = createResourceFixture();
  const result = spawnSync(process.execPath, [scriptPath, '--package-resources'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      APP_SERVER_RESOURCE_DIR: fixture.appServerResourceDir,
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes('App Server sidecar smoke 通过'), true);
  assert.equal(result.stdout.includes('"inputKind":"app-server-resource-dir"'), true);
  assert.equal(result.stdout.includes('"backendMode":"unavailable"'), true);
});

test('app-server sidecar smoke script 在 package-resources 模式阻断 mock backend manifest', () => {
  const fixture = createResourceFixture(['--backend', 'mock']);
  const result = spawnSync(process.execPath, [scriptPath, '--package-resources'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      APP_SERVER_RESOURCE_DIR: fixture.appServerResourceDir,
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes('sidecar smoke must not use mock backend'), true);
});

test('product app runtime live smoke 固定走 App Server external backend 和最小 app policy', () => {
  const source = readFileSync(productAppRuntimeLiveScriptPath, 'utf8');

  assert.equal(source.includes("APP_SERVER_BACKEND_MODE: 'external'"), true);
  assert.match(source, /'--backend'\s*,\s*'external'/);
  assert.equal(source.includes("APP_SERVER_BACKEND_MODE: 'mock'"), false);
  assert.doesNotMatch(source, /'--backend'\s*,\s*'mock'/);
  assert.match(source, /'--app-policy'\s*,\s*appPolicyPath/);
  assert.equal(source.includes("id: 'lime.agent'"), true);
  assert.equal(source.includes("methods: ['agentSession/turn/start']"), true);
  assert.equal(source.includes("appIds: ['content-studio', 'lime.zhongcao', 'lime.novel']"), true);
});

test('product app runtime live smoke 通过平台 discovery 接入并阻断 Provider key 泄露', () => {
  const source = readFileSync(productAppRuntimeLiveScriptPath, 'utf8');

  assert.equal(source.includes('LIME_DESKTOP_PLATFORM_BRIDGE_DISCOVERY_PATH'), true);
  assert.equal(source.includes("discovery.protocol === 'lime.runtimeBridge.discovery'"), true);
  assert.equal(source.includes("result.stdout.includes('source=discovery')"), true);
  assert.equal(source.includes('window.limeDesktop.settings.saveModel'), true);
  assert.equal(source.includes('assert(!result.savedText.includes(providerSecret)'), true);
  assert.equal(source.includes('assert(!result.bootstrapText.includes(providerSecret)'), true);
  assert.equal(source.includes('Content Studio live gate 输出泄露 API Key'), true);
  assert.equal(source.includes('zhongcao live gate 输出泄露 API Key'), true);
  assert.equal(source.includes('lime-novel live gate 输出泄露 API Key'), true);
  assert.equal(source.includes('modelProviderKey/next'), false);
});

test('live provider runtime smoke 默认 fail-closed，且只接受平台专用 Provider env', () => {
  const source = readFileSync(liveProviderRuntimeScriptPath, 'utf8');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };

  assert.equal(packageJson.scripts?.['smoke:live-provider-runtime'], 'node scripts/testing/live-provider-runtime-smoke.mjs');
  assert.equal(source.includes('--allow-live-provider'), true);
  assert.equal(source.includes('LIME_DESKTOP_ALLOW_LIVE_PROVIDER'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_API_KEY'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_MODEL'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_BASE_URL'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_PROTOCOL'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_USE_RESPONSES_API'), true);
  assert.equal(source.includes('LIME_DESKTOP_LIVE_PROVIDER_TIMEOUT_MS'), true);
  assert.equal(source.includes('OPENAI_API_KEY'), false);
  assert.equal(source.includes('ANTHROPIC_API_KEY'), false);
  assert.equal(source.includes('GEMINI_API_KEY'), false);
});

test('live provider runtime smoke 使用真实 App Server runtime backend 并阻断 Provider key 泄露', () => {
  const source = readFileSync(liveProviderRuntimeScriptPath, 'utf8');

  assert.equal(source.includes("APP_SERVER_BACKEND_MODE: 'runtime'"), true);
  assert.match(source, /'--backend'\s*,\s*'runtime'/);
  assert.match(source, /'--data-dir'\s*,\s*appServerDataDir/);
  assert.equal(source.includes("APP_SERVER_BACKEND_MODE: 'mock'"), false);
  assert.doesNotMatch(source, /'--backend'\s*,\s*'mock'/);
  assert.equal(source.includes("APP_SERVER_BACKEND_MODE: 'external'"), false);
  assert.doesNotMatch(source, /'--backend'\s*,\s*'external'/);
  assert.match(source, /'--app-policy'\s*,\s*appPolicyPath/);
  assert.equal(source.includes("id: 'lime.agent'"), true);
  assert.equal(source.includes("methods: ['agentSession/turn/start']"), true);
  assert.equal(source.includes("appIds: [appId]"), true);
  assert.equal(source.includes('window.limeDesktop.settings.saveModel'), true);
  assert.equal(source.includes('window.limeDesktop.apps.invokeCapability'), true);
  assert.equal(source.includes("credentialPolicy?.resolver === 'app-server-provider-store'"), true);
  assert.equal(source.includes('productionInjectionReady === true'), true);
  assert.equal(source.includes('withTimeout(seedPlatformModelSettings'), true);
  assert.equal(source.includes('withTimeout(invokeLiveAgent'), true);
  assert.equal(source.includes('redactLiveSecret'), true);
  assert.equal(
    source.includes("eventTypes.includes('message.delta') || eventTypes.includes('turn.completed') || eventTypes.includes('completed')"),
    true,
  );
  assert.equal(source.includes("eventTypes.includes('started')"), false);
  assert.equal(source.includes('modelProviderKey/next'), false);
  assert.equal(source.includes('settings.saveModel 返回值泄露 API Key'), true);
  assert.equal(source.includes('平台 bootstrap 泄露 API Key'), true);
  assert.equal(source.includes('live provider runtime output 泄露 API Key'), true);
});

test('live provider runtime smoke 未授权时在启动 Electron 前失败', () => {
  const result = spawnSync(process.execPath, [liveProviderRuntimeScriptPath], {
    cwd: projectRoot,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes('缺少 live Provider 显式授权'), true);
  assert.equal(result.stderr.includes('默认 fail-closed'), true);
  assert.equal(result.stderr.includes('LIME_DESKTOP_LIVE_PROVIDER_API_KEY'), true);
  assert.equal(result.stderr.includes('通用 Provider 环境变量'), true);
});

test('release readiness 入口默认不强制跨仓 live smoke，且不包含 git 发布动作', () => {
  const source = readFileSync(releaseReadinessScriptPath, 'utf8');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };

  assert.equal(packageJson.scripts?.['release:readiness'], 'node scripts/testing/release-readiness-check.mjs');
  assert.equal(
    packageJson.scripts?.['release:readiness:product-app-live'],
    'node scripts/testing/release-readiness-check.mjs --product-app-runtime-live',
  );
  assert.equal(
    packageJson.scripts?.['release:readiness:live-provider'],
    'node scripts/testing/release-readiness-check.mjs --live-provider',
  );
  assert.equal(source.includes("runNpmScript('governance:hardcode-scan')"), true);
  assert.equal(source.includes("runNpmScript('build:packages')"), true);
  assert.equal(source.includes("runNpmScript('verify:local')"), true);
  assert.equal(source.includes("runNpmScript('smoke:product-app-runtime-live')"), true);
  assert.equal(source.includes("runNpmScript('smoke:live-provider-runtime')"), true);
  assert.equal(source.includes("cliArgs.has('--product-app-runtime-live')"), true);
  assert.equal(source.includes("cliArgs.has('--live-provider')"), true);
  assert.equal(source.includes("process.env.PRODUCT_APP_RUNTIME_LIVE === '1'"), true);
  assert.equal(source.includes("process.env.LIME_DESKTOP_LIVE_PROVIDER_RUNTIME === '1'"), true);
  assert.equal(source.includes('git commit'), false);
  assert.equal(source.includes('git push'), false);
  assert.equal(source.includes('git tag'), false);
});
