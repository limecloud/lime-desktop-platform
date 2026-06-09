import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(new URL('../..', import.meta.url).pathname);
const outDir = join(projectRoot, '.tmp', 'unit-tests');

rmSync(outDir, { recursive: true, force: true });

const compile = spawnSync('npx', ['tsc', '-p', 'tests/tsconfig.unit.json'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}\n');

function collectTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTestFiles(entryPath);
    }
    return entry.name.endsWith('.test.js') ? [entryPath] : [];
  });
}

const testFiles = collectTestFiles(join(outDir, 'tests'));
if (testFiles.length === 0) {
  console.error('未找到单元测试输出文件。');
  process.exit(1);
}

const test = spawnSync('node', ['--test', ...testFiles], {
  cwd: projectRoot,
  stdio: 'inherit',
});

process.exit(test.status ?? 1);
