import type {
  CatalogApp,
  ControlPlaneStatus,
  DesktopAppManifest,
  PlatformCapability,
  SourceKind,
} from '../../shared/types';

interface ControlPlaneCatalogPayload {
  catalog?: CatalogApp[];
  apps?: CatalogApp[];
}

function nowIso(): string {
  return new Date().toISOString();
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

function normalizeCatalogApp(app: CatalogApp): CatalogApp {
  return {
    ...app,
    manifest: normalizeManifest(app.manifest),
    sourceKind: (app.sourceKind ?? 'cloud') as SourceKind,
    categories: app.categories ?? ['Agent App'],
    releaseNotes: app.releaseNotes ?? [],
    updatedAt: app.updatedAt ?? nowIso(),
    latestVersion: app.latestVersion ?? app.manifest.version,
  };
}

function parseCatalogPayload(payload: unknown): CatalogApp[] {
  const catalog = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as ControlPlaneCatalogPayload | undefined)?.catalog)
      ? (payload as ControlPlaneCatalogPayload).catalog
      : Array.isArray((payload as ControlPlaneCatalogPayload | undefined)?.apps)
        ? (payload as ControlPlaneCatalogPayload).apps
        : undefined;

  if (!catalog) {
    throw new Error('limecore catalog 响应必须是 CatalogApp[] 或包含 catalog/apps 数组。');
  }

  return catalog.map(normalizeCatalogApp).filter((app) => app.manifest?.appId && app.manifest?.entries?.length);
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, base).toString();
}

export class LimecoreControlPlane {
  private readonly baseUrl = process.env.LIMECORE_BASE_URL?.trim();
  private readonly catalogUrl =
    process.env.LIMECORE_CATALOG_URL?.trim() ||
    (this.baseUrl ? joinUrl(this.baseUrl, process.env.LIMECORE_CATALOG_PATH?.trim() || '/desktop/v1/catalog') : undefined);
  private readonly token = process.env.LIMECORE_AUTH_TOKEN?.trim() || process.env.LIMECORE_ACCESS_TOKEN?.trim();
  private status: ControlPlaneStatus = {
    configured: Boolean(this.catalogUrl),
    source: 'samples',
    baseUrl: this.baseUrl,
    catalogUrl: this.catalogUrl,
  };

  getStatus(): ControlPlaneStatus {
    return this.status;
  }

  async fetchCatalog(fallbackCatalog: CatalogApp[]): Promise<CatalogApp[]> {
    if (!this.catalogUrl) {
      this.status = {
        configured: false,
        source: 'samples',
      };
      return fallbackCatalog;
    }

    try {
      const response = await fetch(this.catalogUrl, {
        headers: this.token ? { authorization: `Bearer ${this.token}` } : undefined,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const catalog = parseCatalogPayload(await response.json());
      this.status = {
        configured: true,
        source: 'limecore',
        baseUrl: this.baseUrl,
        catalogUrl: this.catalogUrl,
        lastSyncedAt: nowIso(),
      };
      return catalog;
    } catch (error) {
      this.status = {
        configured: true,
        source: 'samples',
        baseUrl: this.baseUrl,
        catalogUrl: this.catalogUrl,
        lastSyncedAt: this.status.lastSyncedAt,
        lastError: error instanceof Error ? error.message : 'limecore catalog sync failed',
      };
      return fallbackCatalog;
    }
  }
}
