import type {
  BillingSnapshot,
  CatalogApp,
  CloudSessionSnapshot,
  ControlPlaneStatus,
  DesktopAppManifest,
  LoginInput,
  OEMProjection,
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
    'lime.agentExecution',
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
  private readonly sessionUrl =
    process.env.LIMECORE_SESSION_URL?.trim() ||
    (this.baseUrl ? joinUrl(this.baseUrl, process.env.LIMECORE_SESSION_PATH?.trim() || '/desktop/v1/session') : undefined);
  private readonly billingUrl =
    process.env.LIMECORE_BILLING_URL?.trim() ||
    (this.baseUrl ? joinUrl(this.baseUrl, process.env.LIMECORE_BILLING_PATH?.trim() || '/desktop/v1/billing') : undefined);
  private readonly oemUrl =
    process.env.LIMECORE_OEM_URL?.trim() ||
    (this.baseUrl ? joinUrl(this.baseUrl, process.env.LIMECORE_OEM_PATH?.trim() || '/desktop/v1/oem') : undefined);
  private readonly token = process.env.LIMECORE_AUTH_TOKEN?.trim() || process.env.LIMECORE_ACCESS_TOKEN?.trim();
  private status: ControlPlaneStatus = {
    configured: Boolean(this.catalogUrl || this.sessionUrl || this.billingUrl || this.oemUrl),
    source: 'samples',
    baseUrl: this.baseUrl,
    catalogUrl: this.catalogUrl,
    sessionUrl: this.sessionUrl,
    billingUrl: this.billingUrl,
    oemUrl: this.oemUrl,
  };

  getStatus(): ControlPlaneStatus {
    return this.status;
  }

  private baseStatus(): Pick<
    ControlPlaneStatus,
    'configured' | 'baseUrl' | 'catalogUrl' | 'sessionUrl' | 'billingUrl' | 'oemUrl'
  > {
    return {
      configured: Boolean(this.catalogUrl || this.sessionUrl || this.billingUrl || this.oemUrl),
      baseUrl: this.baseUrl,
      catalogUrl: this.catalogUrl,
      sessionUrl: this.sessionUrl,
      billingUrl: this.billingUrl,
      oemUrl: this.oemUrl,
    };
  }

  async fetchCatalog(fallbackCatalog: CatalogApp[]): Promise<CatalogApp[]> {
    if (!this.catalogUrl) {
      this.status = {
        ...this.status,
        ...this.baseStatus(),
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
        ...this.status,
        ...this.baseStatus(),
        configured: true,
        source: 'limecore',
        lastSyncedAt: nowIso(),
        lastError: undefined,
      };
      return catalog;
    } catch (error) {
      this.status = {
        ...this.status,
        ...this.baseStatus(),
        configured: true,
        source: 'samples',
        lastSyncedAt: this.status.lastSyncedAt,
        lastError: error instanceof Error ? error.message : 'limecore catalog sync failed',
      };
      return fallbackCatalog;
    }
  }

  async fetchSession(fallbackSession: CloudSessionSnapshot): Promise<CloudSessionSnapshot> {
    if (!this.sessionUrl) {
      return {
        ...fallbackSession,
        source: fallbackSession.source ?? 'local-dev',
      };
    }

    try {
      const payload = await this.requestJson<CloudSessionSnapshot>(this.sessionUrl);
      const session: CloudSessionSnapshot = {
        ...fallbackSession,
        ...payload,
        scopes: payload.scopes ?? fallbackSession.scopes ?? [],
        authMode: payload.authMode ?? 'oauth',
        source: 'limecore',
      };
      this.status = {
        ...this.status,
        sessionLastSyncedAt: nowIso(),
        sessionLastError: undefined,
      };
      return session;
    } catch (error) {
      this.status = {
        ...this.status,
        sessionLastError: error instanceof Error ? error.message : 'limecore session sync failed',
      };
      return {
        ...fallbackSession,
        source: fallbackSession.source ?? 'local-dev',
      };
    }
  }

  async login(input: LoginInput, fallbackLogin: () => CloudSessionSnapshot): Promise<CloudSessionSnapshot> {
    if (!this.sessionUrl) {
      return fallbackLogin();
    }

    try {
      const payload = await this.requestJson<CloudSessionSnapshot>(this.sessionUrl, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const session: CloudSessionSnapshot = {
        state: payload.state ?? 'authenticated',
        tenantId: payload.tenantId,
        tenantName: payload.tenantName ?? input.tenantName,
        accountEmail: payload.accountEmail ?? input.accountEmail,
        expiresAt: payload.expiresAt,
        scopes: payload.scopes ?? ['catalog:read', 'apps:run', 'settings:read'],
        authMode: payload.authMode ?? 'oauth',
        source: 'limecore',
      };
      this.status = {
        ...this.status,
        sessionLastSyncedAt: nowIso(),
        sessionLastError: undefined,
      };
      return session;
    } catch (error) {
      this.status = {
        ...this.status,
        sessionLastError: error instanceof Error ? error.message : 'limecore login failed',
      };
      return fallbackLogin();
    }
  }

  async logout(fallbackLogout: () => CloudSessionSnapshot): Promise<CloudSessionSnapshot> {
    if (!this.sessionUrl) {
      return fallbackLogout();
    }

    try {
      await this.requestJson<unknown>(this.sessionUrl, { method: 'DELETE' });
      this.status = {
        ...this.status,
        sessionLastSyncedAt: nowIso(),
        sessionLastError: undefined,
      };
      return {
        state: 'unauthenticated',
        scopes: [],
        authMode: 'oauth',
        source: 'limecore',
      };
    } catch (error) {
      this.status = {
        ...this.status,
        sessionLastError: error instanceof Error ? error.message : 'limecore logout failed',
      };
      return fallbackLogout();
    }
  }

  async fetchBilling(fallbackBilling: BillingSnapshot): Promise<BillingSnapshot> {
    if (!this.billingUrl) {
      return {
        ...fallbackBilling,
        source: fallbackBilling.source ?? 'local-dev',
      };
    }

    try {
      const payload = await this.requestJson<BillingSnapshot>(this.billingUrl);
      const billing: BillingSnapshot = {
        ...fallbackBilling,
        ...payload,
        lastCheckedAt: payload.lastCheckedAt ?? nowIso(),
        source: 'limecore',
      };
      this.status = {
        ...this.status,
        billingLastSyncedAt: nowIso(),
        billingLastError: undefined,
      };
      return billing;
    } catch (error) {
      this.status = {
        ...this.status,
        billingLastError: error instanceof Error ? error.message : 'limecore billing sync failed',
      };
      return {
        ...fallbackBilling,
        source: fallbackBilling.source ?? 'local-dev',
      };
    }
  }

  async fetchOEM(fallbackOEM: OEMProjection): Promise<OEMProjection> {
    if (!this.oemUrl) {
      return {
        ...fallbackOEM,
        source: fallbackOEM.source ?? 'local-dev',
      };
    }

    try {
      const payload = await this.requestJson<OEMProjection>(this.oemUrl);
      const projection: OEMProjection = {
        ...fallbackOEM,
        ...payload,
        updatedAt: payload.updatedAt ?? nowIso(),
        source: 'limecore',
      };
      this.status = {
        ...this.status,
        oemLastSyncedAt: nowIso(),
        oemLastError: undefined,
      };
      return projection;
    } catch (error) {
      this.status = {
        ...this.status,
        oemLastError: error instanceof Error ? error.message : 'limecore oem sync failed',
      };
      return {
        ...fallbackOEM,
        source: fallbackOEM.source ?? 'local-dev',
      };
    }
  }

  private async requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json; charset=utf-8' } : {}),
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
