# Release Notes

## 0.1.4

### 已补强

- 新增 `@limecloud/desktop-platform-react` workspace 包，公共平台 React UI modules 的代码事实源迁移到 `packages/react/src/index.tsx`。
- reference shell 改为消费 `@limecloud/desktop-platform-react`，`src/renderer/src/App.tsx` 只负责 bootstrap、状态和 action handler 装配。
- `@limecloud/desktop-platform-contracts` 补齐 `PlatformBootstrap`、`LaunchEntryResult`、`RuntimeEvent`、`UpdateActionResult`、`CapabilityInvokeResult` 等公共 UI 必需契约。
- `governance:hardcode-scan` 增加 renderer 内部 `platformModules` 回流扫描，阻止公共 UI modules 再回到 reference shell 内部。
- `zhongcao` 接入方式更新为消费 `@limecloud/desktop-platform-react` 的模块清单、标签和类型，不再维护独立平台模块清单。
- reference shell 增加设置弹窗和账号页，复刻桌面端左侧设置导航、头像、昵称、邮箱、退出登录和完成按钮布局；账号数据只读取 `PlatformBootstrap.authSession` 投影。

### 仍未完成

- 将 `host-core`、Electron adapter 和 Tauri adapter 拆成正式 workspace package。
- 将 Product App 运行时 action handlers 从示例式注入升级为稳定 SDK。

## 0.1.3

### 已补强

- `limecoreControlPlane` 增加 OAuth session、billing 和 OEM projection endpoint 适配。
- `CloudSessionSnapshot`、`BillingSnapshot` 和 `OEMProjection` 增加 `source` 字段，区分 `limecore` 与 `local-dev`。
- Electron smoke 的 mock `limecore` 覆盖 session 登录、billing 刷新和 OEM 投影。
- 开发态运行时 catalog 改为只加载中性 `platform-conformance` fixture；真实 Product App 名称不再作为平台内置同名 App 进入应用中心。
- 增加 Agent Runtime 策略文档，明确参考 `craft-agents-oss` 的 Claude SDK、Pi sidecar、MCP session tools、LLM connection 和 token refresh 模式，但只作为平台 execution backend adapter，不进入 Product App 公开依赖。
- 增加 `lime.agentExecution` capability 和最小 `AgentExecutionService` backend router / backend descriptor / Claude-Pi-Generic not-installed adapters / sidecar protocol skeleton / Tool Registry skeleton / blocked backend，当前可返回 normalized request、readiness、event 和可追溯阻断结果。
- `governance:hardcode-scan` 增加 provider SDK contract 泄露扫描，阻止 Claude SDK / Pi SDK 进入公开 contracts。
- 明确 Product App 自身更新、agentapp package 更新和平台底座版本三条生命周期；`UpdateCandidate` / `DownloadedUpdateArtifact` 增加 `targetKind: "agentapp-package"`。
- `samples/zhongcao` 和 `samples/content-studio` 收敛为 `standalone` 外部产品参考，不再携带 `runtime_backed` 或 `referenceRuntime`；只有中性 `samples/platform-conformance` 可进入平台 conformance catalog。
- `governance:hardcode-scan` 增加 external-product-reference 扫描，阻止真实 Product App 样例重新声明 runtime-backed / referenceRuntime。
- 增加 `src/renderer/src/platformModules.tsx`，把平台能力总览、平台应用中心、云端会话、模型设置、品牌、充值、更新、运行、Host Bridge 和诊断抽成公共 React UI modules。
- reference shell 的 `src/renderer/src/App.tsx` 改为只装配公共 UI modules、平台 bootstrap 和 action handlers，不再在壳层里重复维护公共设置页面。
- 明确 `zhongcao` 等 Product App 只挂载平台 UI modules 或发送 `PlatformNavigationIntent`，不在业务仓库重做 OAuth、模型设置、充值、品牌、更新和 Host Bridge 诊断页面。

### 仍未完成

- 生产 OAuth 授权 UI、token 安全存储和真实服务错误码映射。
- release 签名验证、回滚包管理和差分更新。
- Claude SDK backend、Pi sidecar backend、完整 Capability Tool Registry 和真实 agent event streaming。
- Tauri adapter。
- 将公共 UI modules 从 renderer 内部文件正式拆成 `@limecloud/desktop-platform-react` 或同等 workspace package。

## 0.1.2

### 已补强

- 增加 `limecoreControlPlane`，支持通过 `LIMECORE_CATALOG_URL` 或 `LIMECORE_BASE_URL` 拉取云端 catalog。
- 增加 `ReleaseArtifact`、`UpdateCandidate`、`DownloadedUpdateArtifact` 和 `ControlPlaneStatus` 契约。
- 增加 `releaseDownloader`，真实下载 release artifact 并校验 sha256 和可选 size。
- `updates:check` 可强制同步 catalog，`updates:download` 和 `updates:apply` 对带 artifact 的更新执行下载、校验和应用门槛。
- 增加 `PlatformNavigationIntent`，runtime-backed App 可请求打开平台设置入口，不复制平台设置 UI。
- Electron smoke 增加本地 mock `limecore`，覆盖云端目录、更新发现、artifact 下载、sha256 校验和安装记录切换。

### 仍未完成

- OAuth、billing、OEM 真实 `limecore` 端点。
- release 签名验证、回滚包管理和差分更新。
- Tauri adapter。

## 0.1.1

### 已补强

- 增加 runtime-backed reference fixture 启动链路，用于平台 smoke / conformance。
- 增加 127.0.0.1 `RuntimeBridgeServer`，通过短期 token 向 runtime-backed App 提供 `/snapshot` 和 `/capability/invoke`。
- 增加 `RuntimeBridgeDescriptor`、`platform.onChanged(...)`、`apps.uninstall(...)` 等公开契约。
- 增加 `platform:changed` 事件，登录、模型、billing、安装、启动、卸载、更新和 capability 调用后可向 renderer/业务 App 广播最新 bootstrap。
- 增加平台卸载生命周期：停止 runtime-backed 子进程、撤销 runtime bridge session、移除安装记录、清理 runtime snapshot，默认保留业务数据。
- Electron smoke 覆盖 reference fixture 生命周期、runtime bridge capability 调用、平台变化事件和卸载生命周期。

### 验证

- `npm run typecheck`
- `npm run build`
- `npm run smoke:electron`

## 0.1.0

首次可交付平台底座版本。

### 已包含

- Electron + React + TypeScript 桌面宿主骨架
- manifest / projection / readiness / Host Bridge / IPC 契约
- 应用中心、设置中心、运行页、开发者诊断页
- 本地工作区与用户级状态分层
- 中性平台 conformance fixture 与 Product App 接入文档
- 更新投影与开发态应用更新 API
- `npm run verify:local`，包含 typecheck、build 和 Electron smoke
- `@limecloud/desktop-platform-contracts` 契约包
- `samples/platform-conformance/manifest.example.json` 和 Product App 接入文档

### 面向 Product App 示例的使用方式

- 业务 App 使用同一套 host capability 语义。
- 登录、模型设置、OEM、billing、更新都由平台提供。
- 业务 App 只保留自身内容工作流、草稿、素材和发布计划。
