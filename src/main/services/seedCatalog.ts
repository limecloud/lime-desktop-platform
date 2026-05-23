import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { app } from 'electron';
import type { CatalogApp, DesktopAppManifest, PlatformCapability, SourceKind } from '../../shared/types';

interface DevCatalogMetadata {
  sourceKind?: SourceKind;
  description?: string;
  categories?: string[];
  latestVersion?: string;
  updatedAt?: string;
  releaseNotes?: string[];
  frameworkHighlights?: CatalogApp['frameworkHighlights'];
  devRuntime?: CatalogApp['devRuntime'];
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function isPlatformCapability(value: string): value is PlatformCapability {
  return [
    'lime.cloudSession',
    'lime.modelSettings',
    'lime.branding',
    'lime.billing',
    'lime.appUpdates',
    'lime.download',
    'lime.permissions',
    'lime.diagnostics',
  ].includes(value);
}

function normalizeManifest(manifest: DesktopAppManifest): DesktopAppManifest {
  return {
    ...manifest,
    requires: {
      ...manifest.requires,
      capabilities: manifest.requires.capabilities.filter(isPlatformCapability),
    },
  };
}

function createCatalogApp(manifest: DesktopAppManifest, metadata: DevCatalogMetadata): CatalogApp {
  return {
    manifest,
    sourceKind: metadata.sourceKind ?? 'local',
    description: metadata.description ?? `${manifest.displayName} dev catalog fixture.`,
    categories: metadata.categories ?? ['Agent App'],
    latestVersion: metadata.latestVersion ?? manifest.version,
    updatedAt: metadata.updatedAt ?? '2026-05-23T00:00:00.000Z',
    releaseNotes: metadata.releaseNotes ?? ['从 samples fixture 加载。'],
    frameworkHighlights: metadata.frameworkHighlights,
    devRuntime: metadata.devRuntime,
  };
}

function loadSampleCatalog(): CatalogApp[] {
  const samplesRoot = resolve(app.getAppPath(), 'samples');
  if (!existsSync(samplesRoot)) {
    return [];
  }

  return readdirSync(samplesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const sampleRoot = join(samplesRoot, entry.name);
      const manifestPath = join(sampleRoot, 'manifest.example.json');
      const metadataPath = join(sampleRoot, 'catalog.example.json');
      if (!existsSync(manifestPath) || !existsSync(metadataPath)) {
        return [];
      }

      const manifest = normalizeManifest(readJsonFile<DesktopAppManifest>(manifestPath));
      const metadata = readJsonFile<DevCatalogMetadata>(metadataPath);
      return [createCatalogApp(manifest, metadata)];
    });
}

export const seedCatalog: CatalogApp[] = loadSampleCatalog();
