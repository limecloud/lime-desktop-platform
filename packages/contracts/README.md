# @limecloud/desktop-platform-contracts

`content-studio`、`zhongcao` 和后续 OEM App 用这个包读取 Lime Desktop Platform 的公共契约。`samples/platform-conformance` 只作为中性 reference fixture 验证这些契约，不是平台核心产品对象。

它只包含类型和协议常量，不包含 Electron 主进程实现，也不包含业务 App 逻辑。

Pi agent、Claude SDK 和 MCP SDK 不属于公开 contracts，也不再作为平台 current/proposed 后端路线。Agent Runtime 能力必须先归一化为平台 `lime.agent` / App Server JSON-RPC / Capability SDK 语义，再进入 contracts。

## 使用

```ts
import type {
  DesktopAppManifest,
  HostSnapshot,
  PlatformNavigationIntent,
  PlatformCapability,
  AgentRuntimeContext,
  AgentRuntimeModelProfile,
  AgentRuntimeRequest,
  AgentRuntimeResult,
  ProductAppSettingsRecord,
  ReleaseArtifact,
  RuntimeBridgeDescriptor,
  UpdateCandidate,
} from '@limecloud/desktop-platform-contracts';
```

业务 App 仍然通过宿主注入的 `window.limeDesktop`、后续平台 SDK 或 Tauri adapter 消费能力，不直接访问平台内部服务。

公共 React UI 不在业务 App 仓库内复制。`zhongcao`、`content-studio` 和后续 OEM App 应通过 `@limecloud/desktop-platform-react` 消费平台模块清单、标签、`PlatformModuleOutlet` 和 action handler 类型。

## 平台事件

业务 App 可以订阅平台变化，但不能把平台状态复制成自己的事实源：

```ts
const stop = window.limeDesktop.platform.onChanged((event) => {
  if (event.reason === 'settings-updated' || event.reason === 'billing-updated') {
    // 重新计算业务页面 readiness。
  }
});
```

## 生命周期边界

- agentapp package 的安装、启用、禁用、卸载、更新由宿主负责。
- Product App 自身安装包更新由产品安装器、Electron updater、Tauri updater 或系统包管理器负责，不复用 agentapp installed catalog。
- 业务 App 通过 `apps.getRuntimeSnapshot(...)` 读取非敏感 Host Snapshot，并把 `theme` 与 `appearance` 投影到自身壳层样式；不要再维护第二套基础外观设置事实源。
- Host Snapshot 可以包含 `tenantName` 和 `accountEmail` 这类账号展示投影，但不得包含 token、refresh token、secret 或 billing 原始账本。
- `referenceRuntime` / runtime-backed fixture 只消费 `RuntimeBridgeDescriptor`，不直接访问 Electron、Node 或平台内部服务。
- `devRuntime` 是早期 smoke fixture 的兼容 alias，新 catalog metadata 必须使用 `referenceRuntime`。
- `apps.uninstall({ appId, keepData: true })` 默认只移除 agentapp package 安装记录和 runtime snapshot，业务数据安全删除另走显式流程。
- `ReleaseArtifact`、`UpdateCandidate` 和 `DownloadedUpdateArtifact` 只描述 `targetKind: 'agentapp-package'` 的 package 更新事实；业务 App 不直接下载、校验或应用 release 包。
- `PlatformNavigationIntent` 只表达“请宿主打开某个设置/诊断入口”，业务 App 不复制平台设置 UI。
- 平台基础设置由 `lime-desktop-platform` 实现；业务 App 独特设置只能通过 `ProductAppSettingsRecord` 的 `appId + namespace + scope` 进入独立 namespace。
- `ProductAppSettingsRecord` 只承接轻量设置值，不是业务数据库。Product App 的日记、草稿、客户事实和工作流状态通过 `lime.storage` 能力进入宿主管理的 per-app storage；当前桌面宿主提供 workspace scope JSON document 最小实现，schema migration / SQLite backend 后续接入。
- Agent Runtime 只允许通过 current `lime.agent` capability 调用；`lime.agentExecution` 仅是 compat alias。业务 App 不直接 import Pi agent、Claude SDK 或平台内部 session manager。
- 模型设置由平台设置中心保存，但执行时通过 Desktop Host 解析成 host-mediated `AgentRuntimeContext` / `AgentRuntimeModelProfile` 交给 Lime App Server JSON-RPC / RuntimeCore；业务 App 不直接传 provider 配置、billing、OAuth 或平台设置副本。
- `AgentRuntimeModelProfile` 只包含非敏感 provider/model 投影：`settingsVersion`、provider id / protocol / authType / baseUrl / useResponsesApi / capabilityKinds、modelId / requestedModelId、capability 和凭证配置状态。
- 密钥只允许通过 `credentialRef` 表达，current resolver 是 `app-server-provider-store`；`desktop-host-credential-broker` 仅作为旧凭证迁移源或未完成 App Server provisioning 时的诊断状态。设置页输入的 API Key 只能作为 `settings.saveModel` 瞬时字段转交 App Server `modelProviderKey/create`，不能写入普通 `ModelSettings` JSON、Host Snapshot、Product App 设置、runtime event 或 turn payload。
- `AgentRuntimeResult` 当前允许返回 `blocked` / `needs-setup`，用于表达 App Server client 尚未连接、模型未配置或 entitlement 不满足；调用方不得把 blocked 伪装成成功。
- App Server client 未配置、未连接或握手失败时，fail-closed `blocked` result 仍携带同一份非敏感 `runtimeContext`，用于证明 JSON-RPC handoff 形状稳定。
