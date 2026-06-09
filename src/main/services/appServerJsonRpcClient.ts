import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, sep } from 'node:path';
import type {
  AgentRuntimeContext,
  AgentRuntimeEvent,
  AgentRuntimeRequest,
  AppServerAgentSession,
  AppServerAgentTurn,
  AppServerJsonRpcMethod,
  ModelProviderAppServerSyncRecord,
  ModelProviderConfig,
} from '../../shared/types';
import { createAppServerRuntimeOptionsProjection } from './appServerRuntimeService';
import { redactSensitiveValue } from './sensitiveRedaction';

const APP_SERVER_RESOURCE_DIR_NAME = 'app-server';
const APP_SERVER_RESOURCE_MANIFEST = 'manifest.json';

export interface AppServerJsonRpcTransport {
  writeLine(line: string): void;
  onLine(listener: (line: string) => void): void;
  close(): void;
}

export interface AppServerSidecarLaunchConfig {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  source: 'env-bin' | 'packaged-resource';
  manifestPath?: string;
  binarySha256?: string;
}

export interface AppServerSidecarResolveOptions {
  resourcesPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  exists?: (path: string) => boolean;
  readFile?: (path: string) => Buffer | string;
}

export type AppServerSidecarSpawn = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio,
) => ChildProcessWithoutNullStreams;

export interface JsonRpcErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcRequestEnvelope {
  id: number;
  method: AppServerJsonRpcMethod;
  params?: unknown;
}

export interface JsonRpcNotificationEnvelope {
  method: AppServerJsonRpcMethod;
  params?: unknown;
}

type JsonRpcInboundEnvelope =
  | {
      id: number;
      result?: unknown;
      error?: JsonRpcErrorPayload;
    }
  | JsonRpcNotificationEnvelope;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface AgentSessionStartResult {
  session: AppServerAgentSession;
}

interface AgentTurnStartResult {
  turn: AppServerAgentTurn;
}

type AppServerProviderType =
  | 'openai'
  | 'openai-response'
  | 'anthropic-compatible'
  | 'gemini'
  | 'ollama';

interface AppServerProviderValue {
  id: string;
  name: string;
  type: string;
  apiHost: string;
  apiKeyCount?: number;
}

interface AppServerModelProviderListResult {
  providers: unknown[];
}

interface AppServerModelProviderReadResult {
  provider?: unknown;
}

interface AppServerModelProviderWriteResult {
  provider: unknown;
}

export interface AppServerRunInput {
  request: AgentRuntimeRequest;
  runtimeContext: AgentRuntimeContext;
  workspaceId?: string;
  locale?: string;
}

export interface AppServerRunResult {
  session: AppServerAgentSession;
  turn: AppServerAgentTurn;
  events: AgentRuntimeEvent[];
}

export interface AppServerModelProviderSyncInput {
  provider: ModelProviderConfig;
  settingsVersion: string;
  apiKey?: string;
  previousSyncRecord?: ModelProviderAppServerSyncRecord;
}

export interface AppServerModelProviderSyncResult {
  record: ModelProviderAppServerSyncRecord;
  created: boolean;
  updated: boolean;
  credentialSynced: boolean;
}

export class JsonRpcProtocolError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'JsonRpcProtocolError';
  }
}

export class StdioJsonRpcTransport implements AppServerJsonRpcTransport {
  private readonly lines: EventEmitter = new EventEmitter();

  constructor(private readonly childProcess: ChildProcessWithoutNullStreams) {
    const reader = createInterface({ input: childProcess.stdout });
    reader.on('line', (line) => {
      this.lines.emit('line', line);
    });
  }

  writeLine(line: string): void {
    this.childProcess.stdin.write(`${line}\n`);
  }

  onLine(listener: (line: string) => void): void {
    this.lines.on('line', listener);
  }

  close(): void {
    this.childProcess.kill();
  }
}

export function resolveAppServerSidecarLaunchConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: AppServerSidecarResolveOptions = {},
): AppServerSidecarLaunchConfig | undefined {
  const command = env.APP_SERVER_BIN?.trim();
  if (!command) {
    return resolvePackagedAppServerSidecarLaunchConfig(env, options);
  }

  return createLaunchConfig({
    command,
    args: parseShellLikeArgs(env.APP_SERVER_ARGS),
    cwd: env.APP_SERVER_CWD?.trim() || undefined,
    env,
    source: 'env-bin',
  });
}

export class AppServerSidecarLifecycle {
  private childProcess?: ChildProcessWithoutNullStreams;
  private client?: AppServerJsonRpcClient;

  constructor(
    private readonly config: AppServerSidecarLaunchConfig,
    private readonly spawnProcess: AppServerSidecarSpawn = spawn,
  ) {}

  get connected(): boolean {
    return Boolean(this.childProcess && this.childProcess.exitCode === null && this.client?.connected);
  }

  getClient(): AppServerJsonRpcClient {
    if (this.client && this.connected) {
      return this.client;
    }

    this.childProcess = this.spawnProcess(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: this.config.env,
      stdio: 'pipe',
    });
    this.client = new AppServerJsonRpcClient(new StdioJsonRpcTransport(this.childProcess));
    this.childProcess.once('exit', () => {
      this.client = undefined;
      this.childProcess = undefined;
    });
    return this.client;
  }

  close(): void {
    this.client?.close();
    this.client = undefined;
    this.childProcess = undefined;
  }
}

export class AppServerJsonRpcClient {
  private nextId = 1;
  private initialized = false;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly eventBuffer: AgentRuntimeEvent[] = [];

  constructor(private readonly transport: AppServerJsonRpcTransport) {
    this.transport.onLine((line) => this.handleLine(line));
  }

  get connected(): boolean {
    return true;
  }

  async initialize(input: { clientInfo: { name: string; title?: string; version: string } }): Promise<unknown> {
    if (this.initialized) {
      return undefined;
    }

    const result = await this.request('initialize', {
      clientInfo: input.clientInfo,
      capabilities: {
        experimentalApi: false,
        optOutNotificationMethods: [],
      },
    });
    this.notify('initialized', {});
    this.initialized = true;
    return result;
  }

  async startAgentRun(input: AppServerRunInput): Promise<AppServerRunResult> {
    await this.initialize({
      clientInfo: {
        name: 'lime-desktop-platform',
        title: 'Lime Desktop Platform',
        version: '0.1.4',
      },
    });

    this.eventBuffer.length = 0;
    const sessionResult = await this.request<AgentSessionStartResult>('agentSession/start', {
      appId: input.request.appId,
      workspaceId: input.workspaceId ?? 'default',
      locale: input.locale,
    });
    const turnResult = await this.request<AgentTurnStartResult>('agentSession/turn/start', {
      sessionId: sessionResult.session.sessionId,
      input: {
        text: input.request.prompt,
        attachments: input.request.attachments ?? [],
      },
      runtimeOptions: createAppServerRuntimeOptionsProjection(input.request, input.runtimeContext),
    });

    return {
      session: sessionResult.session,
      turn: turnResult.turn,
      events: [...this.eventBuffer],
    };
  }

  async syncModelProvider(input: AppServerModelProviderSyncInput): Promise<AppServerModelProviderSyncResult> {
    const mappedProvider = createAppServerProviderProjection(input.provider);
    if (!mappedProvider) {
      return {
        record: {
          desktopProviderId: input.provider.id,
          status: 'unsupported',
          settingsVersion: input.settingsVersion,
          lastError: '当前 provider 协议暂不支持同步到 App Server provider store。',
          plaintextSecrets: false,
        },
        created: false,
        updated: false,
        credentialSynced: false,
      };
    }

    await this.initialize({
      clientInfo: {
        name: 'lime-desktop-platform',
        title: 'Lime Desktop Platform',
        version: '0.1.4',
      },
    });

    const previousProviderId = input.previousSyncRecord?.appServerProviderId;
    let provider = previousProviderId ? await this.readAppServerProvider(previousProviderId) : undefined;
    if (!provider) {
      provider = await this.findMatchingAppServerProvider(mappedProvider);
    }
    let created = false;

    if (!provider) {
      const createResult = await this.request<AppServerModelProviderWriteResult>('modelProvider/create', {
        provider: {
          type: mappedProvider.type,
          name: mappedProvider.name,
          api_host: mappedProvider.apiHost,
        },
      });
      provider = normalizeAppServerProviderValue(createResult.provider);
      created = true;
    }

    if (!provider) {
      throw new Error('App Server provider create/read 未返回 provider。');
    }

    const updateResult = await this.request<AppServerModelProviderWriteResult>('modelProvider/update', {
      providerId: provider.id,
      patch: {
        type: mappedProvider.type,
        name: mappedProvider.name,
        api_host: mappedProvider.apiHost,
        enabled: input.provider.enabled,
        custom_models: input.provider.models,
      },
    });
    provider = normalizeAppServerProviderValue(updateResult.provider) ?? provider;

    let credentialSynced = false;
    let credentialSyncedAt = input.previousSyncRecord?.credentialSyncedAt;
    if ((input.provider.authType ?? 'api-key') === 'api-key' && input.apiKey?.trim()) {
      await this.request('modelProviderKey/create', {
        providerId: provider.id,
        apiKey: input.apiKey,
        alias: input.provider.displayName,
        replaceExisting: true,
      });
      credentialSynced = true;
      credentialSyncedAt = new Date().toISOString();
    }

    return {
      record: {
        desktopProviderId: input.provider.id,
        status: 'synced',
        appServerProviderId: provider.id,
        appServerProviderType: provider.type,
        appServerProviderName: provider.name,
        apiHost: provider.apiHost,
        settingsVersion: input.settingsVersion,
        syncedAt: new Date().toISOString(),
        credentialSyncedAt,
        plaintextSecrets: false,
      },
      created,
      updated: true,
      credentialSynced,
    };
  }

  close(): void {
    this.transport.close();
  }

  private async readAppServerProvider(providerId: string): Promise<AppServerProviderValue | undefined> {
    const result = await this.request<AppServerModelProviderReadResult>('modelProvider/read', { providerId });
    return normalizeAppServerProviderValue(result.provider);
  }

  private async findMatchingAppServerProvider(
    mappedProvider: NonNullable<ReturnType<typeof createAppServerProviderProjection>>,
  ): Promise<AppServerProviderValue | undefined> {
    const listResult = await this.request<AppServerModelProviderListResult>('modelProvider/list');
    const providers = listResult.providers
      .map((provider) => normalizeAppServerProviderValue(provider))
      .filter((provider): provider is AppServerProviderValue => Boolean(provider));
    const normalizedHost = normalizeProviderHost(mappedProvider.apiHost);
    return providers.find(
      (provider) =>
        provider.type === mappedProvider.type &&
        normalizeProviderHost(provider.apiHost) === normalizedHost &&
        provider.name === mappedProvider.name,
    ) ?? providers.find(
      (provider) =>
        provider.type === mappedProvider.type &&
        normalizeProviderHost(provider.apiHost) === normalizedHost,
    );
  }

  private request<TResult>(method: AppServerJsonRpcMethod, params?: unknown): Promise<TResult> {
    const id = this.nextId++;
    const envelope: JsonRpcRequestEnvelope = { id, method, params };
    const promise = new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
      });
    });
    this.transport.writeLine(JSON.stringify(envelope));
    return promise;
  }

  private notify(method: AppServerJsonRpcMethod, params?: unknown): void {
    const envelope: JsonRpcNotificationEnvelope = { method, params };
    this.transport.writeLine(JSON.stringify(envelope));
  }

  private handleLine(line: string): void {
    if (!line.trim()) {
      return;
    }

    const envelope = JSON.parse(line) as JsonRpcInboundEnvelope;
    if ('id' in envelope) {
      const pending = this.pending.get(envelope.id);
      if (!pending) {
        return;
      }
      this.pending.delete(envelope.id);
      if (envelope.error) {
        pending.reject(new JsonRpcProtocolError(envelope.error.message, envelope.error.code, envelope.error.data));
        return;
      }
      pending.resolve(envelope.result);
      return;
    }

    if (envelope.method === 'agentSession/event') {
      const event = asAgentRuntimeEvent(envelope.params);
      if (event) {
        this.eventBuffer.push(event);
      }
    }
  }
}

function createAppServerProviderProjection(
  provider: ModelProviderConfig,
): { type: AppServerProviderType; name: string; apiHost: string } | undefined {
  const apiHost = resolveAppServerProviderApiHost(provider);
  if (!apiHost) {
    return undefined;
  }

  return {
    type: mapAppServerProviderType(provider),
    name: provider.displayName.trim() || provider.id,
    apiHost,
  };
}

function mapAppServerProviderType(provider: ModelProviderConfig): AppServerProviderType {
  if (provider.protocol === 'anthropic-compatible') {
    return 'anthropic-compatible';
  }
  if (provider.protocol === 'gemini-native') {
    return 'gemini';
  }
  if (provider.protocol === 'local') {
    return 'ollama';
  }
  return provider.useResponsesApi ? 'openai-response' : 'openai';
}

function resolveAppServerProviderApiHost(provider: ModelProviderConfig): string | undefined {
  const explicitBaseUrl = provider.baseUrl?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }
  if (provider.protocol === 'openai-compatible') {
    return 'https://api.openai.com';
  }
  if (provider.protocol === 'anthropic-compatible') {
    return 'https://api.anthropic.com';
  }
  if (provider.protocol === 'gemini-native') {
    return 'https://generativelanguage.googleapis.com';
  }
  return undefined;
}

function normalizeAppServerProviderValue(value: unknown): AppServerProviderValue | undefined {
  const provider = asRecord(value);
  const id = readStringField(provider, 'id');
  const name = readStringField(provider, 'name');
  const type = readStringField(provider, 'type');
  const apiHost = readStringField(provider, 'apiHost') ?? readStringField(provider, 'api_host');
  if (!id || !name || !type || !apiHost) {
    return undefined;
  }
  const apiKeyCount = readNumberField(provider, 'apiKeyCount') ?? readNumberField(provider, 'api_key_count');
  return { id, name, type, apiHost, apiKeyCount };
}

function normalizeProviderHost(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseShellLikeArgs(value: string | undefined): string[] {
  const input = value?.trim();
  if (!input) {
    return [];
  }
  return input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^["']|["']$/g, '')) ?? [];
}

function createLaunchConfig(input: {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  source: AppServerSidecarLaunchConfig['source'];
  manifestPath?: string;
  binarySha256?: string;
}): AppServerSidecarLaunchConfig | undefined {
  const args = input.args.filter(Boolean);
  if (!args.includes('--stdio')) {
    args.unshift('--stdio');
  }
  if (argsRequestMockBackend(args)) {
    return undefined;
  }

  return {
    command: input.command,
    args,
    cwd: input.cwd,
    env: {
      ...input.env,
      APP_SERVER_BACKEND_MODE: normalizeBackendMode(input.env.APP_SERVER_BACKEND_MODE),
    },
    source: input.source,
    manifestPath: input.manifestPath,
    binarySha256: input.binarySha256,
  };
}

function resolvePackagedAppServerSidecarLaunchConfig(
  env: NodeJS.ProcessEnv,
  options: AppServerSidecarResolveOptions,
): AppServerSidecarLaunchConfig | undefined {
  const exists = options.exists ?? existsSync;
  const readFile = options.readFile ?? readFileSync;
  const resourceRoot = resolveAppServerResourceRoot(env, options);
  if (!resourceRoot) {
    return undefined;
  }

  const manifestPath = join(resourceRoot, APP_SERVER_RESOURCE_MANIFEST);
  if (!exists(manifestPath)) {
    return undefined;
  }

  const manifest = readJsonRecord(readFile(manifestPath));
  const target = `${options.platform ?? process.platform}-${options.arch ?? process.arch}`;
  const binary = resolveManifestBinary(manifest, target);
  if (!binary) {
    return undefined;
  }

  const command = resolveResourceRelativePath(resourceRoot, binary.path);
  if (!command || !exists(command)) {
    return undefined;
  }
  if (binary.sha256 && !fileMatchesSha256(command, binary.sha256, readFile)) {
    return undefined;
  }

  return createLaunchConfig({
    command,
    args: [...binary.args, ...parseShellLikeArgs(env.APP_SERVER_ARGS)],
    cwd: env.APP_SERVER_CWD?.trim() || undefined,
    env,
    source: 'packaged-resource',
    manifestPath,
    binarySha256: binary.sha256,
  });
}

function resolveAppServerResourceRoot(env: NodeJS.ProcessEnv, options: AppServerSidecarResolveOptions): string | undefined {
  const explicitResourceDir = env.APP_SERVER_RESOURCE_DIR?.trim();
  if (explicitResourceDir) {
    return explicitResourceDir;
  }

  const resourcesPath =
    options.resourcesPath ??
    (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  return resourcesPath ? join(resourcesPath, APP_SERVER_RESOURCE_DIR_NAME) : undefined;
}

function readJsonRecord(value: Buffer | string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(Buffer.isBuffer(value) ? value.toString('utf8') : value);
    return asRecord(parsed);
  } catch {
    return {};
  }
}

function resolveManifestBinary(
  manifest: Record<string, unknown>,
  target: string,
): { path: string; sha256?: string; args: string[] } | undefined {
  if (manifest.schemaVersion !== 1) {
    return undefined;
  }

  const binaries = asRecord(manifest.binaries);
  const candidate = binaries[target] ?? binaries.default ?? manifest.binary;
  const binary = typeof candidate === 'string' ? { path: candidate } : asRecord(candidate);
  const path = typeof binary.path === 'string' ? binary.path.trim() : '';
  if (!path) {
    return undefined;
  }

  const sha256 = typeof binary.sha256 === 'string' && binary.sha256.trim() ? binary.sha256.trim().toLowerCase() : undefined;
  const args = Array.isArray(binary.args) ? binary.args.filter((arg): arg is string => typeof arg === 'string') : [];
  if (argsRequestMockBackend(args)) {
    return undefined;
  }

  return { path, sha256, args };
}

function resolveResourceRelativePath(root: string, candidate: string): string | undefined {
  const normalizedCandidate = normalize(candidate.trim().replace(/[\\/]+/g, sep));
  if (!normalizedCandidate || isAbsolute(normalizedCandidate) || normalizedCandidate.startsWith('..')) {
    return undefined;
  }

  const absolutePath = join(root, normalizedCandidate);
  const relativeToRoot = relative(root, absolutePath);
  if (!relativeToRoot || relativeToRoot.startsWith('..') || isAbsolute(relativeToRoot)) {
    return undefined;
  }
  return absolutePath;
}

function fileMatchesSha256(filePath: string, expectedSha256: string, readFile: (path: string) => Buffer | string): boolean {
  const bytes = readFile(filePath);
  const digest = createHash('sha256')
    .update(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes))
    .digest('hex');
  return digest === expectedSha256;
}

function argsRequestMockBackend(args: string[]): boolean {
  return args.some((arg, index) => {
    if (arg === '--backend' && args[index + 1]?.trim() === 'mock') {
      return true;
    }
    return arg.trim() === '--backend=mock';
  });
}

function normalizeBackendMode(value: string | undefined): string {
  const normalized = value?.trim();
  if (normalized === 'external' || normalized === 'runtime' || normalized === 'unavailable') {
    return normalized;
  }
  return 'runtime';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asAgentRuntimeEvent(value: unknown): AgentRuntimeEvent | undefined {
  const params = asRecord(value);
  const event = asRecord(params.event ?? value);
  if (typeof event.sessionId !== 'string' || typeof event.sequence !== 'number' || typeof event.type !== 'string') {
    return undefined;
  }

  return {
    sessionId: event.sessionId,
    threadId: typeof event.threadId === 'string' ? event.threadId : undefined,
    turnId: typeof event.turnId === 'string' ? event.turnId : undefined,
    sequence: event.sequence,
    type: normalizeEventType(event.type),
    method: 'agentSession/event',
    payload: redactSensitiveValue(asRecord(event.payload)),
  };
}

function normalizeEventType(type: string): AgentRuntimeEvent['type'] {
  if (type === 'turn.started' || type === 'session.started' || type === 'turn.accepted') {
    return 'started';
  }
  if (type === 'tool.started') {
    return 'tool.call';
  }
  if (type === 'tool.failed') {
    return 'failed';
  }
  if (type === 'turn.failed') {
    return 'failed';
  }
  if (type === 'turn.canceled') {
    return 'canceled';
  }
  if (type === 'turn.completed' || type === 'message.completed') {
    return 'completed';
  }
  if (
    type === 'message.delta' ||
    type === 'tool.result' ||
    type === 'action.required' ||
    type === 'needs-setup' ||
    type === 'blocked'
  ) {
    return type;
  }
  return 'message.delta';
}
