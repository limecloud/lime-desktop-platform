import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type {
  CapabilityInvokeInput,
  CapabilityInvokeResult,
  HostSnapshot,
  PlatformNavigationIntent,
  PlatformNavigationResult,
  RuntimeBridgeDiscoveryDescriptor,
  RuntimeBridgeDescriptor,
} from '../../shared/types';

interface RuntimeBridgeSession {
  token: string;
  appId: string;
  entryKey: string;
  expiresAt: number;
}

function readRequestBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 512 * 1024) {
        request.destroy(new Error('runtime bridge payload too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

export class RuntimeBridgeServer {
  private server?: Server;
  private endpoint?: string;
  private discovery?: { token: string; expiresAt: number; publishedAt: number };
  private sessions = new Map<string, RuntimeBridgeSession>();

  constructor(
    private readonly invokeCapability: (input: CapabilityInvokeInput) => CapabilityInvokeResult | Promise<CapabilityInvokeResult>,
    private readonly openNavigationIntent: (input: PlatformNavigationIntent) => PlatformNavigationResult,
    private readonly createSnapshot: (input: { appId: string; entryKey: string }) => HostSnapshot,
  ) {}

  async createDescriptor(input: { appId: string; entryKey: string; snapshot: HostSnapshot }): Promise<RuntimeBridgeDescriptor> {
    const endpoint = await this.ensureStarted();
    const token = randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
    this.sessions.set(token, {
      token,
      appId: input.appId,
      entryKey: input.entryKey,
      expiresAt,
    });

    return {
      protocol: 'lime.runtimeBridge',
      version: 1,
      endpoint,
      token,
      appId: input.appId,
      entryKey: input.entryKey,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async createDiscoveryDescriptor(input: {
    hostKind: RuntimeBridgeDiscoveryDescriptor['hostKind'];
    hostVersion: string;
  }): Promise<RuntimeBridgeDiscoveryDescriptor> {
    const endpoint = await this.ensureStarted();
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7;
    if (!this.discovery || this.discovery.expiresAt < now) {
      this.discovery = {
        token: randomUUID(),
        publishedAt: now,
        expiresAt,
      };
    } else {
      this.discovery.expiresAt = expiresAt;
    }

    return {
      protocol: 'lime.runtimeBridge.discovery',
      version: 1,
      endpoint,
      token: this.discovery.token,
      hostKind: input.hostKind,
      hostVersion: input.hostVersion,
      publishedAt: new Date(this.discovery.publishedAt).toISOString(),
      expiresAt: new Date(this.discovery.expiresAt).toISOString(),
    };
  }

  revokeApp(appId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.appId === appId) {
        this.sessions.delete(token);
      }
    }
  }

  close(): void {
    this.sessions.clear();
    this.discovery = undefined;
    this.server?.close();
    this.server = undefined;
    this.endpoint = undefined;
  }

  private async ensureStarted(): Promise<string> {
    if (this.endpoint) {
      return this.endpoint;
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = this.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('runtime bridge address unavailable');
    }

    this.endpoint = `http://127.0.0.1:${address.port}`;
    return this.endpoint;
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (request.method !== 'POST') {
        writeJson(response, 405, { ok: false, error: { code: 'method-not-allowed', message: '仅支持 POST。' } });
        return;
      }

      if (request.url === '/attach') {
        await this.handleAttach(request, response);
        return;
      }

      const token = this.extractBearerToken(request);
      const session = token ? this.sessions.get(token) : undefined;
      if (!session || session.expiresAt < Date.now()) {
        writeJson(response, 401, { ok: false, error: { code: 'bridge-unauthorized', message: 'runtime bridge token 无效。' } });
        return;
      }

      if (request.url === '/snapshot') {
        writeJson(response, 200, { ok: true, snapshot: this.createSnapshot({ appId: session.appId, entryKey: session.entryKey }) });
        return;
      }

      if (request.url === '/capability/invoke') {
        const body = (await readRequestBody(request)) as Partial<CapabilityInvokeInput> | undefined;
        const result = await this.invokeCapability({
          appId: session.appId,
          entryKey: session.entryKey,
          capability: body?.capability ?? 'lime.diagnostics',
          operation: typeof body?.operation === 'string' ? body.operation : 'runtime-bridge',
          input: body?.input,
        });
        writeJson(response, 200, { ok: true, result });
        return;
      }

      if (request.url === '/intent/open') {
        const body = (await readRequestBody(request)) as Partial<PlatformNavigationIntent> | undefined;
        if (!body?.target) {
          writeJson(response, 400, { ok: false, error: { code: 'intent-target-required', message: '缺少导航目标。' } });
          return;
        }
        const result = this.openNavigationIntent({
          target: body.target,
          appId: session.appId,
          entryKey: session.entryKey,
          reason: typeof body.reason === 'string' ? body.reason : undefined,
        });
        writeJson(response, 200, { ok: true, result });
        return;
      }

      writeJson(response, 404, { ok: false, error: { code: 'route-not-found', message: 'runtime bridge route 不存在。' } });
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: {
          code: 'runtime-bridge-error',
          message: error instanceof Error ? error.message : 'runtime bridge failed',
        },
      });
    }
  }

  private extractBearerToken(request: IncomingMessage): string | undefined {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') {
      return undefined;
    }
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private async handleAttach(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const token = this.extractBearerToken(request);
    if (!this.discovery || !token || token !== this.discovery.token || this.discovery.expiresAt < Date.now()) {
      writeJson(response, 401, { ok: false, error: { code: 'discovery-unauthorized', message: 'runtime bridge discovery token 无效。' } });
      return;
    }

    const body = (await readRequestBody(request)) as Partial<{ appId: string; entryKey: string }> | undefined;
    const appId = typeof body?.appId === 'string' && body.appId.trim() ? body.appId.trim() : undefined;
    if (!appId) {
      writeJson(response, 400, { ok: false, error: { code: 'app-id-required', message: '缺少业务 App ID。' } });
      return;
    }

    const entryKey = typeof body?.entryKey === 'string' && body.entryKey.trim() ? body.entryKey.trim() : 'default';
    const descriptor = await this.createDescriptor({
      appId,
      entryKey,
      snapshot: this.createSnapshot({ appId, entryKey }),
    });
    writeJson(response, 200, { ok: true, result: descriptor });
  }
}
