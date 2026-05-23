import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type {
  CapabilityInvokeInput,
  CapabilityInvokeResult,
  HostSnapshot,
  RuntimeBridgeDescriptor,
} from '../../shared/types';

interface RuntimeBridgeSession {
  token: string;
  appId: string;
  entryKey: string;
  snapshot: HostSnapshot;
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
  private sessions = new Map<string, RuntimeBridgeSession>();

  constructor(private readonly invokeCapability: (input: CapabilityInvokeInput) => CapabilityInvokeResult) {}

  async createDescriptor(input: { appId: string; entryKey: string; snapshot: HostSnapshot }): Promise<RuntimeBridgeDescriptor> {
    const endpoint = await this.ensureStarted();
    const token = randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
    this.sessions.set(token, {
      token,
      appId: input.appId,
      entryKey: input.entryKey,
      snapshot: input.snapshot,
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

  revokeApp(appId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.appId === appId) {
        this.sessions.delete(token);
      }
    }
  }

  close(): void {
    this.sessions.clear();
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

      const token = this.extractBearerToken(request);
      const session = token ? this.sessions.get(token) : undefined;
      if (!session || session.expiresAt < Date.now()) {
        writeJson(response, 401, { ok: false, error: { code: 'bridge-unauthorized', message: 'runtime bridge token 无效。' } });
        return;
      }

      if (request.url === '/snapshot') {
        writeJson(response, 200, { ok: true, snapshot: session.snapshot });
        return;
      }

      if (request.url === '/capability/invoke') {
        const body = (await readRequestBody(request)) as Partial<CapabilityInvokeInput> | undefined;
        const result = this.invokeCapability({
          appId: session.appId,
          entryKey: session.entryKey,
          capability: body?.capability ?? 'lime.diagnostics',
          operation: typeof body?.operation === 'string' ? body.operation : 'runtime-bridge',
          input: body?.input,
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
}
