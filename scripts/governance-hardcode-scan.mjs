import { readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const scannedRoots = ['src/main', 'src/shared', 'packages/contracts/src'];
const runtimeCatalogRoot = 'samples';
const blockedPatterns = [
  /zhongcao/i,
  /lime\.zhongcao/i,
  /geo\.generateDraft/i,
  /geo\.scoreDraft/i,
  /geo\.addSchema/i,
  /LIME_ZHONGCAO/i,
  /content-studio/i,
];
const blockedRuntimeCatalogPatterns = [/zhongcao/i, /lime\.zhongcao/i, /content-studio/i, /oem-starter/i];
const blockedProviderSdkContractPatterns = [/@anthropic-ai\/claude-agent-sdk/, /@mariozechner\/pi-ai/, /@mariozechner\/pi-coding-agent/];
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md']);

function collectFiles(root) {
  const absoluteRoot = join(projectRoot, root);
  const result = [];
  for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
    const absolutePath = join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(relative(projectRoot, absolutePath)));
      continue;
    }
    if (allowedExtensions.has(extname(entry.name))) {
      result.push(absolutePath);
    }
  }
  return result;
}

const violations = scannedRoots
  .flatMap(collectFiles)
  .flatMap((filePath) => {
    const content = readFileSync(filePath, 'utf8');
    return blockedPatterns.flatMap((pattern) => {
      if (!pattern.test(content)) {
        return [];
      }
      return [`${relative(projectRoot, filePath)} -> ${pattern.source}`];
    });
  });

const runtimeCatalogViolations = collectFiles(runtimeCatalogRoot).flatMap((filePath) => {
  if (!filePath.endsWith('catalog.example.json')) {
    return [];
  }

  const content = readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  if (parsed.catalogScope !== 'platform-conformance') {
    return [];
  }

  const siblingManifestPath = join(dirname(filePath), 'manifest.example.json');
  const combinedContent = `${content}\n${readFileSync(siblingManifestPath, 'utf8')}`;
  return blockedRuntimeCatalogPatterns.flatMap((pattern) => {
    if (!pattern.test(combinedContent)) {
      return [];
    }
    return [`${relative(projectRoot, filePath)} -> platform-conformance uses ${pattern.source}`];
  });
});

const externalProductReferenceViolations = collectFiles(runtimeCatalogRoot).flatMap((filePath) => {
  if (!filePath.endsWith('catalog.example.json')) {
    return [];
  }

  const content = readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  if (parsed.catalogScope !== 'external-product-reference') {
    return [];
  }

  const siblingManifestPath = join(dirname(filePath), 'manifest.example.json');
  const manifest = JSON.parse(readFileSync(siblingManifestPath, 'utf8'));
  const violations = [];
  if (manifest.installMode === 'runtime_backed') {
    violations.push(`${relative(projectRoot, siblingManifestPath)} -> external product reference must not use runtime_backed`);
  }
  if (parsed.referenceRuntime || parsed.devRuntime) {
    violations.push(`${relative(projectRoot, filePath)} -> external product reference must not declare referenceRuntime/devRuntime`);
  }
  return violations;
});

const providerSdkContractViolations = collectFiles('packages/contracts').flatMap((filePath) => {
  const content = readFileSync(filePath, 'utf8');
  return blockedProviderSdkContractPatterns.flatMap((pattern) => {
    if (!pattern.test(content)) {
      return [];
    }
    return [`${relative(projectRoot, filePath)} -> provider SDK leaked into public contracts: ${pattern.source}`];
  });
});

if (
  violations.length > 0 ||
  runtimeCatalogViolations.length > 0 ||
  externalProductReferenceViolations.length > 0 ||
  providerSdkContractViolations.length > 0
) {
  console.error('平台核心目录发现业务硬编码：');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  for (const violation of runtimeCatalogViolations) {
    console.error(`- ${violation}`);
  }
  for (const violation of externalProductReferenceViolations) {
    console.error(`- ${violation}`);
  }
  for (const violation of providerSdkContractViolations) {
    console.error(`- ${violation}`);
  }
  console.error('业务 App 样板只能作为 external-product-reference 文档参照；平台运行时 catalog 只能使用中性 conformance fixture。');
  console.error('Claude SDK / Pi SDK 只能进入 host-core backend adapter 或 sidecar，不能进入公开 contracts。');
  process.exit(1);
}

console.log('governance:hardcode-scan passed');
