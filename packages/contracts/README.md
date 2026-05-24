# @limecloud/desktop-platform-contracts

`content-studio`、`zhongcao` 和后续 OEM App 用这个包读取 Lime Desktop Platform 的公共契约。`samples/platform-conformance` 只作为中性 reference fixture 验证这些契约，不是平台核心产品对象。

它只包含类型和协议常量，不包含 Electron 主进程实现，也不包含业务 App 逻辑。

Claude SDK、Pi SDK 和 MCP SDK 不属于公开 contracts。后续 agent execution 能力必须先归一化为平台 `AgentExecutionService` / Capability SDK 语义，再进入 contracts。

## 使用

```ts
import type {
  DesktopAppManifest,
  HostSnapshot,
  PlatformNavigationIntent,
  PlatformCapability,
  AgentExecutionRequest,
  AgentExecutionResult,
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
- 业务 App 通过 `apps.getRuntimeSnapshot(...)` 读取非敏感 Host Snapshot。
- Host Snapshot 可以包含 `tenantName` 和 `accountEmail` 这类账号展示投影，但不得包含 token、refresh token、secret 或 billing 原始账本。
- `referenceRuntime` / runtime-backed fixture 只消费 `RuntimeBridgeDescriptor`，不直接访问 Electron、Node 或平台内部服务。
- `devRuntime` 是早期 smoke fixture 的兼容 alias，新 catalog metadata 必须使用 `referenceRuntime`。
- `apps.uninstall({ appId, keepData: true })` 默认只移除 agentapp package 安装记录和 runtime snapshot，业务数据安全删除另走显式流程。
- `ReleaseArtifact`、`UpdateCandidate` 和 `DownloadedUpdateArtifact` 只描述 `targetKind: 'agentapp-package'` 的 package 更新事实；业务 App 不直接下载、校验或应用 release 包。
- `PlatformNavigationIntent` 只表达“请宿主打开某个设置/诊断入口”，业务 App 不复制平台设置 UI。
- Agent execution 只允许通过 `lime.agentExecution` capability 调用；业务 App 不直接 import Claude SDK、Pi SDK 或平台内部 session manager。
- `AgentExecutionResult` 当前允许返回 `blocked` / `needs-setup`，用于表达 backend 尚未安装、模型未配置或 entitlement 不满足；调用方不得把 blocked 伪装成成功。
