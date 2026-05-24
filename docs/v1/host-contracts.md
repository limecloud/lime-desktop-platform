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
  workspacePath?: string;
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

- `updates:check` 必须同步当前 catalog，并返回 `UpdateCandidate[]`。
- `updates:download` 只有在 catalog 提供 `releaseArtifact` 时才执行真实下载。
- artifact 必须校验 `sha256`，可选校验 `sizeBytes`。
- 校验失败必须返回 `blocked`，不得写成下载成功。
- 已校验 artifact 写入 `.lime-desktop/app-artifacts/`。
- `updates:apply` 对带 artifact 的更新必须先确认已下载且 verified。

### 7.2 平台变化事件

宿主必须暴露订阅式变化事件，业务 App 不应只靠轮询 bootstrap。

- 事件通道：`platform:changed`
- Preload API：`window.limeDesktop.platform.onChanged(listener)`
- 事件载荷：`reason`、`appId`、`entryKey`、`timestamp`、`bootstrap`
- 典型原因：`app-installed`、`app-updated`、`app-enabled`、`app-disabled`、`app-uninstalled`、`app-launched`、`settings-updated`、`auth-updated`、`billing-updated`、`updates-checked`

业务 App 只能消费事件中的平台投影，不得把 OAuth、billing、模型设置或 OEM 状态复制成自己的权威事实。

### 7.3 平台导航意图

runtime-backed App 不能直接打开宿主内部页面，也不能复制设置 UI。
业务 App 只能发送导航意图，例如打开模型设置、OAuth、billing、更新或诊断页。

第一阶段 Runtime Bridge 路径：

- `POST /intent/open`
- 输入：`PlatformNavigationIntent`
- 输出：`PlatformNavigationResult`
- 结果：当前 Electron 实现先写入 runtime event，后续 UI 路由聚焦在壳层补齐。

## 8. 存储契约

### 8.1 工作区级

- `.lime-desktop/installed-apps.json`
- `.lime-desktop/app-projections.json`
- `.lime-desktop/runtime-snapshots.json`
- `.lime-desktop/runtime-events.json`
- `.lime-desktop/app-artifacts/`

### 8.2 用户级

- `userData` 下保存 OAuth 会话
- `userData` 下保存模型设置、OEM 选择和平台偏好
- `userData` 下保存下载缓存和更新状态

### 8.3 原则

- 工作区只放可迁移的业务事实。
- 用户目录只放个人设置、会话和缓存。
- 不硬编码系统路径。
- 本地存储必须能被重新扫描和重建。

## 9. 兼容性规则

- `manifest`、`projection` 和 `bridge` 版本必须显式声明。
- 新字段优先追加，不轻易删字段。
- 破坏性变更需要并行兼容一段时间。
- Electron 和 Tauri 只替换宿主实现，不改协议语义。
- `blocked` 必须可回溯到具体原因和修复动作。
