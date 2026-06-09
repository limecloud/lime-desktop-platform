import { randomUUID } from 'node:crypto';
import type {
  AgentRuntimeBridgeProfile,
  AgentRuntimeContext,
  AgentRuntimeEvent,
  AgentRuntimeModelProfile,
  AgentRuntimeRequest,
  AgentRuntimeResult,
  AppServerRuntimeOptionsProjection,
  AppServerRuntimeDiagnostics,
  CapabilityInvokeInput,
  ModelProviderConfig,
  ModelProviderCredentialState,
  ModelProviderCredentialRuntimeStatus,
  ModelSettings,
  ReadinessReason,
  ReadinessResult,
} from '../../shared/types';
import type { AppServerJsonRpcClient } from './appServerJsonRpcClient';

export const APP_SERVER_RUNTIME_BRIDGE_PROFILE: AgentRuntimeBridgeProfile = {
  kind: 'app-server-json-rpc',
  transport: 'host-mediated',
  hostBoundary: 'desktop-host-ipc',
  runtimeOwner: 'runtime-core',
  protocolVersion: 'appserver.v0',
  methods: {
    initialize: 'initialize',
    initialized: 'initialized',
    startSession: 'agentSession/start',
    readSession: 'agentSession/read',
    startTurn: 'agentSession/turn/start',
    cancelTurn: 'agentSession/turn/cancel',
    respondAction: 'agentSession/action/respond',
    listCapabilities: 'capability/list',
    readArtifact: 'artifact/read',
    exportEvidence: 'evidence/export',
    events: 'agentSession/event',
  },
  events: {
    notification: 'agentSession/event',
    allowUiSynthesis: false,
  },
};

export interface AppServerRuntimeStartContext {
  modelSettings: ModelSettings;
  workspaceId?: string;
  locale?: string;
}

export interface AppServerRuntimeClientProvider {
  getClient(): AppServerJsonRpcClient | undefined;
  isConnected(): boolean;
  isConfigured(): boolean;
}

type RuntimeClientState = 'connected' | 'not-configured' | 'disconnected';
type ModelProviderCredentialStateReader = (provider: ModelProviderConfig) => ModelProviderCredentialState;

function hasUsableAgentModel(
  settings: ModelSettings,
  readCredentialState: ModelProviderCredentialStateReader,
  preferredModelId?: string,
): boolean {
  return Boolean(findUsableAgentProvider(settings, readCredentialState, preferredModelId));
}

function normalizeAuthType(provider: ModelSettings['providers'][number]): NonNullable<ModelSettings['providers'][number]['authType']> {
  return provider.authType ?? 'api-key';
}

function createDefaultCredentialState(provider: ModelProviderConfig): ModelProviderCredentialState {
  const authType = normalizeAuthType(provider);
  if (authType === 'none') {
    return {
      providerId: provider.id,
      authType,
      configured: true,
      storageKind: 'none',
      keychainBacked: false,
      rotationRequired: false,
      runtimeStatus: 'not-required',
      plaintextSecrets: false,
    };
  }

  const configured = Boolean(provider.apiKeyConfigured);
  return {
    providerId: provider.id,
    authType,
    configured,
    storageKind: configured ? 'local-encrypted-file' : 'none',
    keychainBacked: false,
    rotationRequired: false,
    runtimeStatus: configured ? 'broker-reference-only' : 'missing',
    plaintextSecrets: false,
  };
}

function hasConfiguredCredential(
  provider: ModelSettings['providers'][number],
  readCredentialState: ModelProviderCredentialStateReader,
): boolean {
  return readCredentialState(provider).configured;
}

function findUsableAgentProvider(
  settings: ModelSettings,
  readCredentialState: ModelProviderCredentialStateReader,
  preferredModelId?: string,
): ModelSettings['providers'][number] | undefined {
  const enabledProviders = settings.providers.filter(
    (provider) => provider.enabled && hasConfiguredCredential(provider, readCredentialState) && provider.capabilityKinds.includes('text'),
  );
  const defaultProvider = enabledProviders.find((provider) => provider.id === settings.defaultAgentProviderId);
  if (preferredModelId) {
    return (
      (defaultProvider?.models.includes(preferredModelId) ? defaultProvider : undefined) ??
      enabledProviders.find((provider) => provider.models.includes(preferredModelId))
    );
  }

  return defaultProvider ?? enabledProviders.find((provider) => provider.models.includes(settings.defaultTextModelId ?? ''));
}

function resolveRuntimeModelProfile(
  settings: ModelSettings,
  request: AgentRuntimeRequest,
  readCredentialState: ModelProviderCredentialStateReader,
): AgentRuntimeModelProfile | undefined {
  const requestedModelId = request.modelPolicy?.preferredModelId ?? request.runtimeOptions?.modelId;
  const provider = findUsableAgentProvider(settings, readCredentialState, requestedModelId);
  if (!provider) {
    return undefined;
  }

  const modelId = requestedModelId ?? settings.defaultTextModelId ?? provider.models[0];
  if (!modelId) {
    return undefined;
  }

  const credentialState = readCredentialState(provider);
  const authType = credentialState.authType;
  return {
    settingsVersion: settings.version,
    provider: {
      id: provider.id,
      appServerProviderId: credentialState.appServerProviderId,
      protocol: provider.protocol,
      authType,
      baseUrl: provider.baseUrl,
      useResponsesApi: provider.useResponsesApi,
      capabilityKinds: provider.capabilityKinds,
      credentialConfigured: credentialState.configured,
      credentialRef:
        authType === 'none'
          ? undefined
          : {
              kind: 'model-provider',
              providerId: provider.id,
              authType,
              resolver: 'desktop-host-credential-broker',
              configured: credentialState.configured,
              storageKind: credentialState.storageKind,
              keychainBacked: credentialState.keychainBacked,
              ...(credentialState.updatedAt ? { updatedAt: credentialState.updatedAt } : {}),
              ...(credentialState.expiresAt ? { expiresAt: credentialState.expiresAt } : {}),
              rotationRequired: credentialState.rotationRequired,
              runtimeStatus: credentialState.runtimeStatus,
              productionInjectionReady:
                credentialState.runtimeStatus === 'resolver-ready' ||
                credentialState.runtimeStatus === 'app-server-provider-ready',
            },
    },
    modelId,
    requestedModelId,
    capability: request.modelPolicy?.capability ?? 'agent',
  };
}

function runtimeStatusFromModelProfile(modelProfile: AgentRuntimeModelProfile | undefined): ModelProviderCredentialRuntimeStatus {
  return modelProfile?.provider.credentialRef?.runtimeStatus ?? (modelProfile ? 'not-required' : 'missing');
}

function credentialReadinessReason(
  state: ModelProviderCredentialState | undefined,
): ReadinessReason | undefined {
  if (
    !state ||
    state.runtimeStatus === 'not-required' ||
    state.runtimeStatus === 'resolver-ready' ||
    state.runtimeStatus === 'app-server-provider-ready'
  ) {
    return undefined;
  }
  if (state.runtimeStatus === 'rotation-required') {
    return {
      code: 'model-provider-credential-rotation-required',
      message: '模型 provider 凭证已过期或需要轮换，请在模型设置中更新凭证。',
      fixable: true,
    };
  }
  if (state.runtimeStatus === 'broker-reference-only') {
    return {
      code: 'host-credential-resolver-required',
      message:
        '当前 Credential Broker 已有 provider 凭证，但尚未完成 App Server provider/key provisioning 或 host credential resolver 注入；不能把明文密钥放入 runtime turn JSON-RPC payload。',
      fixable: false,
    };
  }
  return undefined;
}

function createRuntimeContext(
  settings: ModelSettings,
  request: AgentRuntimeRequest,
  readCredentialState: ModelProviderCredentialStateReader,
): AgentRuntimeContext {
  const modelProfile = resolveRuntimeModelProfile(settings, request, readCredentialState);
  const credentialRuntimeStatus = runtimeStatusFromModelProfile(modelProfile);
  return {
    protocol: 'appserver.runtimeContext',
    version: 1,
    source: 'desktop-platform-model-settings',
    modelProfile,
    permissionMode: request.runtimeOptions?.permissionMode ?? request.toolPolicy?.permissionMode ?? 'ask',
    credentialPolicy: {
      handoff: 'credential-ref-only',
      plaintextSecrets: false,
      resolver: 'desktop-host-credential-broker',
      runtimeStatus: credentialRuntimeStatus,
      productionInjectionReady:
        credentialRuntimeStatus === 'not-required' ||
        credentialRuntimeStatus === 'resolver-ready' ||
        credentialRuntimeStatus === 'app-server-provider-ready',
    },
  };
}

export function createAppServerRuntimeOptionsProjection(
  request: AgentRuntimeRequest,
  runtimeContext: AgentRuntimeContext,
): AppServerRuntimeOptionsProjection {
  const metadata: AppServerRuntimeOptionsProjection['metadata'] = {
    workflowId: request.runtimeOptions?.workflowId,
    requestedModelId: request.runtimeOptions?.modelId,
    permissionMode: request.runtimeOptions?.permissionMode,
  };
  const hasMetadata = Object.values(metadata).some((value) => value !== undefined);

  return {
    capabilityId: request.runtimeOptions?.capabilityId,
    stream: true,
    providerPreference: runtimeContext.modelProfile?.provider.appServerProviderId ?? runtimeContext.modelProfile?.provider.id,
    modelPreference: runtimeContext.modelProfile?.modelId,
    ...(hasMetadata ? { metadata } : {}),
    hostOptions: {
      desktopPlatformRuntimeContext: runtimeContext,
    },
  };
}

function normalizeRuntimeRequest(input: CapabilityInvokeInput): AgentRuntimeRequest {
  const candidate = input.input && typeof input.input === 'object' ? (input.input as Partial<AgentRuntimeRequest>) : {};
  const permissionMode =
    candidate.runtimeOptions?.permissionMode === 'allow-all' || candidate.runtimeOptions?.permissionMode === 'safe'
      ? candidate.runtimeOptions.permissionMode
      : candidate.runtimeOptions?.permissionMode === 'ask'
        ? 'ask'
        : undefined;

  return {
    appId: input.appId,
    entryKey: input.entryKey,
    agentAppId: typeof candidate.agentAppId === 'string' ? candidate.agentAppId : undefined,
    taskId: typeof candidate.taskId === 'string' ? candidate.taskId : undefined,
    prompt: typeof candidate.prompt === 'string' && candidate.prompt.trim() ? candidate.prompt : 'Agent runtime readiness probe.',
    attachments: Array.isArray(candidate.attachments) ? candidate.attachments : undefined,
    runtimeOptions: {
      capabilityId:
        typeof candidate.runtimeOptions?.capabilityId === 'string' ? candidate.runtimeOptions.capabilityId : 'lime.agent',
      workflowId: typeof candidate.runtimeOptions?.workflowId === 'string' ? candidate.runtimeOptions.workflowId : undefined,
      modelId:
        typeof candidate.runtimeOptions?.modelId === 'string'
          ? candidate.runtimeOptions.modelId
          : candidate.modelPolicy?.preferredModelId,
      permissionMode: permissionMode ?? candidate.toolPolicy?.permissionMode ?? 'ask',
    },
    modelPolicy:
      candidate.modelPolicy && typeof candidate.modelPolicy === 'object'
        ? {
            preferredModelId:
              typeof candidate.modelPolicy.preferredModelId === 'string' ? candidate.modelPolicy.preferredModelId : undefined,
            capability:
              candidate.modelPolicy.capability === 'vision' || candidate.modelPolicy.capability === 'text'
                ? candidate.modelPolicy.capability
                : 'agent',
          }
        : { capability: 'agent' },
    toolPolicy:
      candidate.toolPolicy && typeof candidate.toolPolicy === 'object'
        ? {
            allowedToolIds: Array.isArray(candidate.toolPolicy.allowedToolIds) ? candidate.toolPolicy.allowedToolIds : undefined,
            permissionMode:
              candidate.toolPolicy.permissionMode === 'allow-all' || candidate.toolPolicy.permissionMode === 'safe'
                ? candidate.toolPolicy.permissionMode
                : 'ask',
          }
        : { permissionMode: 'ask' },
  };
}

function createBlockedEvent(
  sessionId: string,
  request: AgentRuntimeRequest,
  runtimeContext: AgentRuntimeContext,
  readiness: ReadinessResult,
  message: string,
): AgentRuntimeEvent {
  return {
    sessionId,
    threadId: `thread-${sessionId}`,
    turnId: `turn-${sessionId}`,
    sequence: 1,
    type: readiness.state === 'needs-setup' ? 'needs-setup' : 'blocked',
    method: 'agentSession/turn/start',
    payload: {
      message,
      readiness,
      bridge: APP_SERVER_RUNTIME_BRIDGE_PROFILE.kind,
      runtimeOwner: APP_SERVER_RUNTIME_BRIDGE_PROFILE.runtimeOwner,
      methodMapping: APP_SERVER_RUNTIME_BRIDGE_PROFILE.methods,
      capabilityId: request.runtimeOptions?.capabilityId ?? 'lime.agent',
      runtimeContext,
    },
  };
}

export class AppServerRuntimeService {
  constructor(
    private readonly clientProvider?: AppServerRuntimeClientProvider,
    private readonly readCredentialState: ModelProviderCredentialStateReader = createDefaultCredentialState,
  ) {}

  async start(input: CapabilityInvokeInput, context: AppServerRuntimeStartContext): Promise<AgentRuntimeResult> {
    const baseRequest = normalizeRuntimeRequest(input);
    const runtimeContext = createRuntimeContext(context.modelSettings, baseRequest, this.readCredentialState);
    const request: AgentRuntimeRequest = {
      ...baseRequest,
      runtimeContext,
    };
    if (!hasUsableAgentModel(context.modelSettings, this.readCredentialState, request.modelPolicy?.preferredModelId)) {
      return this.createBlockedResult({
        request,
        runtimeContext,
        readiness: this.getReadiness(context.modelSettings, request.modelPolicy?.preferredModelId),
        message: 'App Server JSON-RPC 运行时需要先补齐模型设置。',
      });
    }

    let client: AppServerJsonRpcClient | undefined;
    try {
      client = this.clientProvider?.getClient();
    } catch (error) {
      return this.createBlockedResult({
        request,
        runtimeContext,
        readiness: this.getReadiness(context.modelSettings, request.modelPolicy?.preferredModelId, this.getClientState()),
        message: error instanceof Error ? error.message : 'App Server JSON-RPC client 启动失败。',
      });
    }

    const readiness = this.getReadiness(
      context.modelSettings,
      request.modelPolicy?.preferredModelId,
      client?.connected ? 'connected' : this.getClientState(),
    );
    if (client && readiness.state === 'ready') {
      try {
        const run = await client.startAgentRun({
          request,
          runtimeContext,
          workspaceId: context.workspaceId,
          locale: context.locale,
        });
        const events = run.events.length > 0
          ? run.events
          : [
              {
                sessionId: run.session.sessionId,
                threadId: run.session.threadId,
                turnId: run.turn.turnId,
                sequence: 1,
                type: 'started' as const,
                method: 'agentSession/turn/start' as const,
                payload: {
                  session: run.session,
                  turn: run.turn,
                  runtimeContext,
                },
              },
            ];

        return {
          ok: true,
          state: 'started',
          sessionId: run.session.sessionId,
          threadId: run.session.threadId,
          turnId: run.turn.turnId,
          bridge: APP_SERVER_RUNTIME_BRIDGE_PROFILE.kind,
          message: 'App Server JSON-RPC runtime 已发起 Agent turn。',
          readiness,
          request,
          runtimeContext,
          bridgeProfile: APP_SERVER_RUNTIME_BRIDGE_PROFILE,
          events,
          appServer: {
            session: run.session,
            turn: run.turn,
          },
        };
      } catch (error) {
        return this.createBlockedResult({
          request,
          runtimeContext,
          readiness,
          message: error instanceof Error ? error.message : 'App Server JSON-RPC client 调用失败。',
        });
      }
    }

    return this.createBlockedResult({
      request,
      runtimeContext,
      readiness,
      message: 'App Server JSON-RPC client / RuntimeCore 尚未接入当前宿主，Agent 调用已 fail closed。',
    });
  }

  private createBlockedResult(input: {
    request: AgentRuntimeRequest;
    runtimeContext: AgentRuntimeContext;
    readiness: ReadinessResult;
    message: string;
  }): AgentRuntimeResult {
    const { request, runtimeContext, readiness, message } = input;
    const sessionId = `app-server-runtime-${randomUUID()}`;
    const blockedEvent = createBlockedEvent(sessionId, request, runtimeContext, readiness, message);

    return {
      ok: false,
      state: readiness.state === 'needs-setup' ? 'needs-setup' : 'blocked',
      sessionId,
      threadId: `thread-${sessionId}`,
      turnId: `turn-${sessionId}`,
      bridge: APP_SERVER_RUNTIME_BRIDGE_PROFILE.kind,
      message,
      readiness,
      request,
      runtimeContext,
      bridgeProfile: APP_SERVER_RUNTIME_BRIDGE_PROFILE,
      events: [blockedEvent],
    };
  }

  describeRuntime(modelSettings: ModelSettings): AppServerRuntimeDiagnostics {
    const readiness = this.getReadiness(modelSettings);
    const runtimeContext = createRuntimeContext(modelSettings, {
      appId: 'platform-diagnostics',
      entryKey: 'runtime',
      prompt: 'Agent runtime diagnostics.',
      runtimeOptions: {
        capabilityId: 'lime.agent',
        modelId: modelSettings.defaultTextModelId,
        permissionMode: 'ask',
      },
      modelPolicy: {
        preferredModelId: modelSettings.defaultTextModelId,
        capability: 'agent',
      },
      toolPolicy: {
        permissionMode: 'ask',
      },
    }, this.readCredentialState);
    return {
      state: readiness.state === 'ready' ? 'ready' : readiness.state === 'needs-setup' ? 'needs-setup' : 'blocked',
      currentCapability: 'lime.agent',
      compatCapabilities: ['lime.agentExecution'],
      bridgeProfile: APP_SERVER_RUNTIME_BRIDGE_PROFILE,
      readiness,
      runtimeContext,
      modelProvider: {
        defaultProviderId: modelSettings.defaultAgentProviderId,
        defaultTextModelId: modelSettings.defaultTextModelId,
        enabledProviders: modelSettings.providers
          .filter((provider) => provider.enabled && provider.capabilityKinds.includes('text'))
          .map((provider) => {
            const credentialState = this.readCredentialState(provider);
            return {
              id: provider.id,
              displayName: provider.displayName,
              protocol: provider.protocol,
              authType: provider.authType,
              apiKeyConfigured: provider.apiKeyConfigured,
              credentialState,
              appServerProviderId: credentialState.appServerProviderId,
              appServerSyncStatus: credentialState.appServerSyncStatus,
              useResponsesApi: provider.useResponsesApi,
              models: provider.models,
            };
          }),
      },
      client: {
        connected: Boolean(this.clientProvider?.isConnected()),
        state: this.clientProvider?.isConnected()
          ? 'connected'
          : this.clientProvider?.isConfigured()
            ? 'disconnected'
            : 'not-configured',
        transport: 'stdio',
        hostBoundary: 'desktop-host-ipc',
      },
    };
  }

  private getReadiness(
    modelSettings: ModelSettings,
    preferredModelId?: string,
    clientState: RuntimeClientState = this.getClientState(),
  ): ReadinessResult {
    const reasons: ReadinessReason[] = [];
    const setupActions: string[] = [];

    if (!hasUsableAgentModel(modelSettings, this.readCredentialState, preferredModelId)) {
      reasons.push({
        code: 'agent-model-required',
        message: 'App Server Runtime 需要至少一个已启用且已配置凭证的文本模型。',
        fixable: true,
      });
      setupActions.push('open-model-settings');
    }

    const provider = findUsableAgentProvider(modelSettings, this.readCredentialState, preferredModelId);
    const credentialReason = credentialReadinessReason(provider ? this.readCredentialState(provider) : undefined);
    if (credentialReason) {
      reasons.push(credentialReason);
      if (credentialReason.fixable) {
        setupActions.push('open-model-settings');
      }
    }

    if (clientState !== 'connected') {
      reasons.push({
        code: clientState === 'not-configured' ? 'app-server-client-not-configured' : 'app-server-client-not-connected',
        message:
          clientState === 'not-configured'
            ? '当前宿主尚未配置 App Server JSON-RPC sidecar；生产路径不能回退到 Pi agent、Claude SDK 或 mock backend。'
            : '当前宿主尚未连接 App Server JSON-RPC client；生产路径不能回退到 Pi agent、Claude SDK 或 mock backend。',
        fixable: false,
      });
    }

    if (reasons.length === 0) {
      return {
        state: 'ready',
        reasons: [],
        setupActions: [],
      };
    }

    return {
      state: reasons.some((reason) => !reason.fixable) ? 'blocked' : 'needs-setup',
      reasons,
      setupActions,
    };
  }

  private getClientState(): RuntimeClientState {
    if (!this.clientProvider?.isConfigured()) {
      return 'not-configured';
    }
    return this.clientProvider.isConnected() ? 'connected' : 'disconnected';
  }
}
