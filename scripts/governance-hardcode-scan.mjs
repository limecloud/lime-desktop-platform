import { readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const scannedRoots = ['src/main', 'src/shared', 'packages/contracts/src'];
const blockedPatterns = [
  /zhongcao/i,
  /lime\.zhongcao/i,
  /geo\.generateDraft/i,
  /geo\.scoreDraft/i,
  /geo\.addSchema/i,
  /LIME_ZHONGCAO/i,
  /content-studio/i,
];
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

if (violations.length > 0) {
  console.error('平台核心目录发现业务硬编码：');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  console.error('业务 App 样板请放在 samples/*，专项验收请放在 scripts/smoke fixture 中。');
  process.exit(1);
}

console.log('governance:hardcode-scan passed');
