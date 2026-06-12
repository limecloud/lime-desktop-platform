import { spawnSync } from 'node:child_process';

const cliArgs = new Set(process.argv.slice(2));
const runProductAppRuntimeLive =
  cliArgs.has('--product-app-runtime-live') || process.env.PRODUCT_APP_RUNTIME_LIVE === '1';
const runLiveProviderRuntime =
  cliArgs.has('--live-provider') || process.env.LIME_DESKTOP_LIVE_PROVIDER_RUNTIME === '1';
const skipLocal = cliArgs.has('--skip-local');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpmScript(scriptName) {
  console.log(`[release-readiness] npm run ${scriptName}`);
  const result = spawnSync(npmCommand, ['run', scriptName], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!skipLocal) {
  runNpmScript('governance:hardcode-scan');
  runNpmScript('build:packages');
  runNpmScript('verify:local');
}

if (runProductAppRuntimeLive) {
  runNpmScript('smoke:product-app-runtime-live');
} else {
  console.log(
    '[release-readiness] 跳过跨仓 Product App runtime live smoke。需要本仓、../content-studio、../zhongcao、../lime-novel 构建产物和 App Server binary 时，传 --product-app-runtime-live 或设置 PRODUCT_APP_RUNTIME_LIVE=1。',
  );
}

if (runLiveProviderRuntime) {
  runNpmScript('smoke:live-provider-runtime');
} else {
  console.log(
    '[release-readiness] 跳过正式 Provider live API smoke。需要真实 Provider Key 且会调用上游 LLM API 时，传 --live-provider 或设置 LIME_DESKTOP_LIVE_PROVIDER_RUNTIME=1，并同时按 smoke gate 提供 LIME_DESKTOP_ALLOW_LIVE_PROVIDER=1、LIME_DESKTOP_LIVE_PROVIDER_API_KEY、LIME_DESKTOP_LIVE_PROVIDER_MODEL。',
  );
}

console.log('[release-readiness] 通过');
