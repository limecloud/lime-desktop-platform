---
title: Host 与数据契约
status: draft
repo: lime-desktop-platform
---

# Host 与数据契约

## 1. 目标

这份文档定义 `lime-desktop-platform` 对外稳定的宿主契约，保证 Electron 先行实现和后续 Tauri 适配共享同一组事实模型。

## 2. 契约层次

宿主契约分四层：

1. `manifest`：描述 App 是什么。
2. `projection`：描述宿主如何展示这个 App。
3. `readiness`：描述现在能不能启动。
4. `Host Bridge` 和 `IPC`：描述运行中如何通信。

## 3. 核心类型

```ts
export interface DesktopAppManifest {
  appId: string;
  displayName: string;
  version: string;
  installMode: 'in_lime' | 'standalone' | 'runtime_backed';
  entries: Array<{
    key: string;
    kind: 'page' | 'workflow' | 'expert-chat' | 'settings' | 'diagnostics';
    route: string;
  }>;
  requires: {
    sdkVersion: string;
    capabilities: string[];
    hostKinds?: Array<'electron' | 'tauri'>;
  };
  branding?: {
    logo?: string;
    theme?: string;
  };
}

export interface DesktopPackageIdentity {
  appId: string;
  version: string;
  packageHash: string;
  manifestHash: string;
  sourceKind: 'cloud' | 'local' | 'oem';
  installedAt: string;
  updatedAt: string;
}

export interface HostProfile {
  hostKind: 'electron' | 'tauri';
  hostVersion: string;
  capabilities: string[];
  locale: string;
  theme: 'light' | 'dark' | 'system';
  appearance?: PlatformAppearanceSettings;
  workspacePath?: string;
}

export interface PlatformAppearanceSettings {
  colorTheme:
    | 'emerald'
    | 'ocean'
    | 'vintage'
    | 'neon'
    | 'lime'
    | 'dusk'
    | 'minimal'
    | 'vibrant'
    | 'nature'
    | 'arts'
    | 'luxury';
  fontScale: number;
  serifEnabled: boolean;
}

export type ReadinessState = 'ready' | 'needs-setup' | 'blocked' | 'disabled';

export interface ReadinessResult {
  state: ReadinessState;
  reasons: Array<{
    code: string;
    message: string;
    fixable: boolean;
  }>;
  setupActions: string[];
}

export interface DesktopAppProjection {
  appId: string;
  displayName: string;
  version: string;
  catalogCard: {
    sourceKind: 'cloud' | 'local' | 'oem';
    description?: string;
    updateAvailable?: boolean;
  };
  entryCards: Array<{
    key: string;
    label: string;
    route: string;
    enabled: boolean;
  }>;
  capabilityPreview: string[];
  readiness: ReadinessResult;
}

export interface HostSnapshot {
  hostKind: 'electron' | 'tauri';
  hostVersion: string;
  appId: string;
  entryKey: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  appearance?: PlatformAppearanceSettings;
  workspacePath?: string;
  modelSettingsVersion?: string;
  oauthState?: 'unauthenticated' | 'authenticated' | 'expired';
  billingState?: 'unknown' | 'active' | 'needs-payment' | 'suspended';
  oemState?: 'unbranded' | 'branded' | 'customized';
}

export interface HostBridgeMessage<T = unknown> {
  protocol: 'lime.agentApp.bridge';
  version: 1;
  requestId: string;
  appId: string;
  entryKey: string;
  type: 'ready' | 'snapshot' | 'invoke' | 'result' | 'error' | 'toast' | 'navigate' | 'event';
  payload: T;
}

export interface ReleaseArtifact {
  url: string;
  sha256: string;
  sizeBytes?: number;
  fileName?: string;
}

export interface UpdateCandidate {
  targetKind: 'agentapp-package';
  appId: string;
  currentVersion: string;
  nextVersion: string;
  sourceKind: 'cloud' | 'local' | 'oem';
  artifact?: ReleaseArtifact;
}

export interface ControlPlaneStatus {
  configured: boolean;
  source: 'samples' | 'limecore';
  baseUrl?: string;
  catalogUrl?: string;
  lastSyncedAt?: string;
  lastError?: string;
}

export type PlatformNavigationTarget =
  | 'app-center'
  | 'auth-settings'
  | 'model-settings'
  | 'branding-settings'
  | 'billing-settings'
  | 'updates'
  | 'diagnostics'
  | 'runtime';

export interface PlatformNavigationIntent {
  target: PlatformNavigationTarget;
  appId?: string;
  entryKey?: string;
  reason?: string;
}
```

## 4. Projection

Projection 的职责是把 manifest 转成宿主可读对象，不运行 App 代码。

输入：

- manifest
- package identity
- host profile
- tenant / OEM bootstrap

输出：

- catalog card
- entry 列表
- capability requirements
- permission preview
- readiness 入口
- install / update 行为描述
- release artifact 的下载地址、sha256、大小和文件名

## 5. Readiness

规则：

- `ready` 才允许启动 App。
- `needs-setup` 必须展示修复动作。
- `blocked` 必须展示原因，不得伪成功。
- `disabled` 只表示入口被隐藏或暂停。
- readiness 不应被 UI 手工覆盖，只能通过真实设置恢复。

## 6. Host Bridge

### 6.1 消息信封

`Host Bridge` 只承认一个公开协议名：`lime.agentApp.bridge`。

### 6.2 消息类别

- `ready`
- `snapshot`
- `invoke`
- `result`
- `error`
- `toast`
- `navigate`
- `event`

### 6.3 必须支持的能力

- `snapshot:update`
- `theme:update`
- `locale:update`
- `capability:invoke`
- `capability:result`
- `capability:error`
- `download`
- `permission:request`
- `permission:result`
- `platform:intent`

## 7. IPC 公共面

建议对外暴露的宿主命令：

- `apps:listCatalog`
- `apps:listInstalled`
- `apps:getProjection`
- `apps:getReadiness`
- `apps:install`
- `apps:update`
- `apps:enable`
- `apps:disable`
- `apps:uninstall`
- `apps:launchEntry`
- `apps:invokeCapability`
- `apps:getRuntimeSnapshot`
- `settings:getModel`
- `settings:saveModel`
- `settings:getPlatform`
- `settings:savePlatform`
- `settings:readProductApp`
- `settings:writeProductApp`
- `auth:getSession`
- `auth:login`
- `auth:logout`
- `billing:getState`
- `billing:refresh`
- `oem:getProjection`
- `updates:check`
- `updates:download`
- `updates:apply`

### 7.1 更新与发布校验

- `updates:check` 必须同步当前 agentapp package catalog，并返回 `targetKind: 'agentapp-package'` 的 `UpdateCandidate[]`。
- `updates:download` 只有在 catalog 提供 agentapp package `releaseArtifact` 时才执行真实下载。
- artifact 必须校验 `sha256`，可选校验 `sizeBytes`。
- 校验失败必须返回 `blocked`，不得写成下载成功。
- 已校验 artifact 写入 `.lime-desktop/app-artifacts/`。
- `updates:apply` 对带 artifact 的更新必须先确认已下载且 verified。
- 这组 IPC 不替换 Product App 安装包；Product App 自身更新由产品安装器、Electron updater、Tauri updater 或系统包管理器负责。

### 7.2 平台变化事件

宿主必须暴露订阅式变化事件，业务 App 不应只靠轮询 bootstrap。

- 事件通道：`platform:changed`
- Preload API：`window.limeDesktop.platform.onChanged(listener)`
- 事件载荷：`reason`、`appId`、`entryKey`、`timestamp`、`bootstrap`
- 典型原因：`app-installed`、`app-updated`、`app-enabled`、`app-disabled`、`app-uninstalled`、`app-launched`、`settings-updated`、`auth-updated`、`billing-updated`、`updates-checked`

业务 App 只能消费事件中的平台投影，不得把 OAuth、billing、模型设置或 OEM 状态复制成自己的权威事实。

### 7.3 平台导航意图

业务 App 和 reference runtime fixture 不能直接打开宿主内部页面，也不能复制设置 UI。
它们只能发送导航意图，例如打开模型设置、OAuth、billing、更新或诊断页。

第一阶段 Runtime Bridge 路径：

- `POST /intent/open`
- 输入：`PlatformNavigationIntent`
- 输出：`PlatformNavigationResult`
- 结果：当前 Electron 实现先写入 runtime event，后续 UI 路由聚焦在壳层补齐。

### 7.4 Product App 独特设置

平台基础设置统一由 `lime-desktop-platform` 承载：账号、模型 provider、网络、搜索、开放网关、数据、安全、更新、关于等都属于平台页。业务 App 只允许开放自己的独特设置入口，并通过 `appId + namespace + scope` 写入平台托管 namespace。

```ts
export type ProductAppSettingsScope = 'user' | 'workspace';

export interface ProductAppSettingsRecord<TValue = Record<string, unknown>> {
  appId: string;
  namespace: string;
  scope: ProductAppSettingsScope;
  version: string;
  updatedAt: string;
  value: TValue;
}

export interface ProductAppSettingsReadInput {
  appId: string;
  namespace: string;
  scope?: ProductAppSettingsScope;
}

export interface ProductAppSettingsWriteInput<TValue = Record<string, unknown>> extends ProductAppSettingsReadInput {
  value: TValue;
}
```

存储落点：

- `scope: 'workspace'`：`.lime-desktop/product-settings/<appId>/<namespace>.json`
- `scope: 'user'`：Electron `userData/state/product-settings/<appId>/<namespace>.json`

Product App 独特设置不得保存 OAuth token、模型 API Key、billing 账本或平台权限权威状态；凭证、token、API Key 和 OAuth 类 namespace / key 会被宿主拒绝。模型 Provider metadata 和 API Key 的 current 事实源是 App Server provider store；Desktop Credential Broker 仅作为旧 key 一次性迁移 source 和 fail-closed 诊断状态。

### 7.5 Model Settings Capability

业务 App 不直接读写模型 Provider key。平台宿主通过 `lime.modelSettings` capability 提供非敏感 projection、旧设置迁移入口和设置页导航。

Runtime Bridge 路径：

- `POST /snapshot`：返回 `HostSnapshot.modelSettingsVersion`，只用于业务 App 判断平台模型设置版本是否变化。
- `POST /capability/invoke`，`capability: "lime.modelSettings"`：
  - `operation: "model-settings/read"`：返回当前 App Server provider store 的非敏感 `ModelSettings` projection。
  - `operation: "model-settings/save"`：保存平台模型设置；若 input 中包含 provider `apiKey`，该 key 只能作为瞬时字段转交 App Server `modelProviderKey/create(replaceExisting:true)`。
  - `operation: "migrate"`：与 `model-settings/save` 等价，用于业务 App 启动期把旧本地模型设置一次性迁到平台/App Server。
- `POST /intent/open`，`target: "model-settings"`：业务 App 无权复制设置 UI，只能请求宿主打开平台模型设置页。

保存输入示例：

```ts
await platform.invokeCapability({
  capability: 'lime.modelSettings',
  operation: 'model-settings/save',
  input: {
    source: 'content-studio-local-migration',
    settings: {
      version: '0',
      updatedAt: new Date().toISOString(),
      defaultAgentProviderId: 'content-studio-text-openai',
      defaultTextModelId: 'gpt-4.1-mini',
      providers: [
        {
          id: 'content-studio-text-openai',
          displayName: 'Content Studio 文字 openai-chat',
          protocol: 'openai-compatible',
          capabilityKinds: ['text'],
          enabled: true,
          authType: 'api-key',
          baseUrl: 'https://api.openai.com/v1',
          models: ['gpt-4.1-mini'],
          apiKey: '短程输入，不能持久化到平台普通 JSON',
        },
      ],
    },
  },
});
```

必须满足：

- 返回给业务 App 的 `ModelSettings` 不包含 `apiKey`，只包含 `apiKeyConfigured` / readiness / provider/model projection。
- 保存请求包含新 API Key 但 App Server provider store 不可用时，平台必须 fail-closed；不能把 key 写入 Desktop Credential Broker 或普通 JSON 再“稍后同步”。
- 旧 Desktop Credential Broker 只作为升级迁移 source；迁移成功后删除旧 broker key 文件，并以 App Server sync record 的 `credentialSyncedAt` 作为后续 marker。
- 业务 App 迁移旧设置后必须清除本地旧 key 字段；standalone/dev 模式只能作为过渡，不得成为 Agent Runtime key source。
- `modelProviderKey/next` 会返回明文 key，只能留在 App Server/runtime 内部；Desktop Host 不在 Product App invoke 路径调用。

### 7.6 Agent Runtime Capability

Agent Runtime current 路线是 Lime App Server JSON-RPC / RuntimeCore。Claude SDK、Pi 和 MCP session tools 不作为 Product App 的公开依赖，也不再作为当前 platform backend 路线。业务 App 只能通过平台 capability 发起 agent runtime：

- current capability id：`lime.agent`
- compat alias：`lime.agentExecution`
- 入口：`apps.invokeCapability({ capability: 'lime.agent', operation: 'start' })`
- bridge profile：`agentRuntime.bridge.kind = 'app-server-json-rpc'`
- 运行时 owner：Lime App Server `RuntimeCore`
- Electron 职责：Desktop Host IPC、preload 白名单、sidecar 生命周期和 fail-closed bridge，不承接第二套 Agent 后端。

模型设置的执行时投影由 Desktop Host 生成，不由 Product App 生成：

- 平台设置中心是 provider/model 设置事实源。
- App Server / RuntimeCore 是 agent runtime 执行事实源。
- Product App 不能传 provider key、OAuth token、refresh token、billing 原始账本或平台设置副本。
- Desktop Host 保存模型设置时，必须通过 App Server JSON-RPC `modelProvider/list/read/create/update` 同步 provider metadata，并且只在这个设置同步边界调用 `modelProviderKey/create` 写入 API Key；App Server 返回的真实 provider id 作为非敏感 sync record 保存。
- Desktop Host 调用 App Server JSON-RPC runtime 前，必须把设置中心解析成 `AgentRuntimeContext`。
- `AgentRuntimeContext.modelProfile` 是 Desktop Host 对 RuntimeCore 暴露的唯一模型配置投影。
- `agentSession/start` 必须只发送 App Server 当前 schema 接收的 session 字段；provider / model 选择同步投影为 `agentSession/turn/start.params.runtimeOptions.providerPreference` / `runtimeOptions.modelPreference`，其中 `providerPreference` 优先使用 App Server provider id。同一份非敏感上下文放入 `runtimeOptions.hostOptions.desktopPlatformRuntimeContext`。禁止把 `runtimeContext` 写到 App Server 当前不消费的 `agentSession/start.params.runtimeContext` 或 `runtimeOptions.runtimeContext` 假字段。
- 密钥只能通过 `credentialRef` 表达，current live resolver 是 `app-server-provider-store`；`desktop-host-credential-broker` 只表示旧 key 迁移或未完成 App Server provisioning 的诊断状态。
- 普通 `ModelSettings` JSON 只保留 `apiKeyConfigured`；runtime turn JSON-RPC payload、Host Snapshot、runtime event 和 Product App settings 不能包含明文 secret。`modelProviderKey/create` 属于设置同步控制面；`modelProviderKey/next` 会返回明文 key，Desktop Host 不在 Product App invoke 路径调用。OAuth token 轮换和生产级注入策略仍是后续项。

当前请求契约：

```ts
export interface AgentRuntimeCredentialRef {
  kind: 'model-provider';
  providerId: string;
  authType: NonNullable<ModelProviderConfig['authType']>;
  resolver: 'app-server-provider-store' | 'desktop-host-credential-broker';
  configured: boolean;
}

export interface AgentRuntimeProviderProfile {
  id: string;
  protocol: ModelProtocol;
  authType: NonNullable<ModelProviderConfig['authType']>;
  baseUrl?: string;
  useResponsesApi?: boolean;
  capabilityKinds: ModelCapabilityKind[];
  credentialConfigured: boolean;
  credentialRef?: AgentRuntimeCredentialRef;
}

export interface AgentRuntimeModelProfile {
  settingsVersion: string;
  provider: AgentRuntimeProviderProfile;
  modelId: string;
  requestedModelId?: string;
  capability: 'text' | 'agent' | 'vision';
}

export interface AgentRuntimeContext {
  protocol: 'appserver.runtimeContext';
  version: 1;
  source: 'desktop-platform-model-settings';
  modelProfile?: AgentRuntimeModelProfile;
  permissionMode: 'safe' | 'ask' | 'allow-all';
  credentialPolicy: {
    handoff: 'credential-ref-only';
    plaintextSecrets: false;
  };
}

export interface AgentRuntimeRequest {
  appId: string;
  entryKey: string;
  agentAppId?: string;
  taskId?: string;
  prompt: string;
  attachments?: Array<{
    kind: 'text' | 'image' | 'file';
    ref: string;
    mimeType?: string;
  }>;
  modelPolicy?: {
    preferredModelId?: string;
    capability: 'text' | 'agent' | 'vision';
  };
  toolPolicy?: {
    allowedToolIds?: string[];
    permissionMode?: 'safe' | 'ask' | 'allow-all';
  };
  runtimeContext?: AgentRuntimeContext;
  runtimeOptions?: {
    capabilityId?: string;
    workflowId?: string;
    modelId?: string;
    permissionMode?: 'safe' | 'ask' | 'allow-all';
  };
}

export interface AppServerRuntimeOptionsProjection {
  capabilityId?: string;
  stream: true;
  providerPreference?: string;
  modelPreference?: string;
  metadata?: {
    workflowId?: string;
    requestedModelId?: string;
    permissionMode?: 'safe' | 'ask' | 'allow-all';
  };
  hostOptions: {
    desktopPlatformRuntimeContext: AgentRuntimeContext;
  };
}

export interface AgentRuntimeEvent {
  sessionId: string;
  threadId?: string;
  turnId?: string;
  sequence: number;
  type:
    | 'started'
    | 'message.delta'
    | 'artifact.snapshot'
    | 'tool.call'
    | 'tool.result'
    | 'action.required'
    | 'turn.completed'
    | 'needs-setup'
    | 'blocked'
    | 'completed'
    | 'failed';
  payload: unknown;
  evidence?: Array<{
    label: string;
    ref: string;
  }>;
}
```

必须满足：

- 与 `agentapp` 的 capability、readiness 和 Host Bridge 语义对齐。
- 不泄露 Pi agent、Claude SDK、MCP SDK 的 provider-specific 类型。
- 缺模型、缺 OAuth、缺 billing entitlement、App Server client 未连接时只返回 `needs-setup` 或 `blocked`。
- 生产路径不能回退 mock backend、已删除的旧 `AgentExecutionService`、Pi sidecar 或 Claude SDK backend。
- 工具调用必须由 RuntimeCore 和平台 permission/readiness 策略裁决。
- App Server client 未配置、未连接或握手失败时，fail-closed `blocked` event/result 仍必须携带同一份非敏感 `runtimeContext`，用于验证 Desktop Host handoff 形状；配置化 stdio sidecar 或注入测试 client 时可以进入 `started` 路径。
- `runtimeContext`、Host Snapshot、Product App 设置、runtime event 和 JSON-RPC payload 都不得出现 `apiKey`、`token`、`secret`、`refreshToken` 这类明文字段。

## 8. 存储契约

结论：平台需要独立托管存储层，但不要求每个业务 App 自己再维护一套平台状态库。存储按职责分三层：

- 平台公共状态：应用中心、模型 provider、OAuth 投影、billing、OEM、更新、diagnostics，由 `lime-desktop-platform` 统一保存和裁决。
- Product App 独特设置：轻量偏好、展示开关、业务设置表单值，由平台按 `appId + namespace + scope` 托管。
- Product App 业务数据：日记、草稿、客户事实和工作流状态通过 `lime.storage` 能力进入宿主管理的 per-app storage；领域表、索引和 migration 后续由 SQLite backend 承接，不能塞进 `product-settings` JSON。

### 8.1 工作区级

- `.lime-desktop/installed-apps.json`
- `.lime-desktop/app-projections.json`
- `.lime-desktop/runtime-snapshots.json`
- `.lime-desktop/runtime-events.json`
- `.lime-desktop/app-artifacts/`
- `.lime-desktop/app-storage/workspace/<appId>/<namespace>/<documentId>.json`
- `.lime-desktop/product-settings/<appId>/<namespace>.json`

### 8.2 用户级

- `userData` 下保存 OAuth 会话
- `userData` 下保存模型设置、OEM 选择和平台偏好
- `userData` 下保存下载缓存和更新状态
- `userData/state/product-settings/<appId>/<namespace>.json` 保存用户级业务 App 独特设置

### 8.3 原则

- 工作区只放可迁移的业务事实。
- 用户目录只放个人设置、会话和缓存。
- 不硬编码系统路径。
- 本地存储必须能被重新扫描和重建。
- 平台基础设置、业务 App 独特设置和业务 App 数据库必须分 namespace；业务 App 不能把平台基础设置复制成私有事实。
- `product-settings` 只保存小型 JSON 设置，不承接列表、草稿、历史记录、artifact、客户数据或可迁移业务表。
- `product-settings` 禁止保存 credential、secret、token、API Key 或 OAuth namespace / key；模型 Provider key 必须走 App Server provider store，其他敏感凭证必须走平台宿主凭证边界。
- `appId` 和 `namespace` 必须是稳定标识，不允许路径穿越或运行时生成的随机值。
- `lime.storage` 当前提供 workspace scope JSON document 最小后端，支持 `read` / `write` / `list` / `delete`，不支持任意表查询、索引和 migration。
- `lime.storage` 写事件只记录 namespace、documentId、scope 和 valueRedacted，不把业务 value 复制进 runtime event。
- `lime.storage` 禁止保存 credential、secret、token、API Key 或 OAuth namespace；模型 Provider key 必须走 App Server provider store，其他敏感凭证必须走平台宿主凭证边界。
- 桌面端后续默认升级为宿主管理的 per-app SQLite；普通用户不应为了运行桌面 Product App 额外安装 PostgreSQL。团队 / 云端共享数据再由 App Server / Cloud 使用 per-app schema、role 或 dedicated database。

## 9. 兼容性规则

- `manifest`、`projection` 和 `bridge` 版本必须显式声明。
- 新字段优先追加，不轻易删字段。
- 破坏性变更需要并行兼容一段时间。
- Electron 和 Tauri 只替换宿主实现，不改协议语义。
- `blocked` 必须可回溯到具体原因和修复动作。
