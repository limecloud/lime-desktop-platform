import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const scriptPath = join(projectRoot, 'scripts/testing/app-server-sidecar-smoke.mjs');

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
