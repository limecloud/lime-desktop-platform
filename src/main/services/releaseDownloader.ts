import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { DownloadedUpdateArtifact, ReleaseArtifact } from '../../shared/types';

const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;

function nowIso(): string {
  return new Date().toISOString();
}

function safeFileName(input: string, fallback: string): string {
  const name = basename(input).replace(/[^a-zA-Z0-9._-]/g, '-');
  return name || fallback;
}

function artifactFileName(artifact: ReleaseArtifact, fallback: string): string {
  if (artifact.fileName) {
    return safeFileName(artifact.fileName, fallback);
  }

  try {
    return safeFileName(new URL(artifact.url).pathname, fallback);
  } catch {
    return safeFileName(artifact.url, fallback);
  }
}

async function readArtifactBytes(artifact: ReleaseArtifact): Promise<Buffer> {
  if (artifact.url.startsWith('file://')) {
    return readFile(new URL(artifact.url));
  }

  const response = await fetch(artifact.url, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`release artifact download failed: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > MAX_ARTIFACT_BYTES) {
    throw new Error('release artifact exceeds maximum allowed size');
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) {
    throw new Error('release artifact exceeds maximum allowed size');
  }
  return bytes;
}

export async function downloadAndVerifyReleaseArtifact(input: {
  appId: string;
  version: string;
  artifact: ReleaseArtifact;
  destinationRoot: string;
}): Promise<DownloadedUpdateArtifact> {
  const fileName = artifactFileName(input.artifact, `${input.appId}-${input.version}.tgz`);
  const destinationDir = join(input.destinationRoot, input.appId, input.version);
  const filePath = join(destinationDir, fileName);
  const bytes = await readArtifactBytes(input.artifact);
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  if (sha256 !== input.artifact.sha256) {
    throw new Error(`release artifact sha256 mismatch: expected ${input.artifact.sha256}, got ${sha256}`);
  }

  if (input.artifact.sizeBytes !== undefined && input.artifact.sizeBytes !== bytes.byteLength) {
    throw new Error(`release artifact size mismatch: expected ${input.artifact.sizeBytes}, got ${bytes.byteLength}`);
  }

  await mkdir(destinationDir, { recursive: true });
  await writeFile(filePath, bytes);

  return {
    appId: input.appId,
    version: input.version,
    fileName,
    filePath,
    sha256,
    sizeBytes: bytes.byteLength,
    downloadedAt: nowIso(),
    verified: true,
  };
}
