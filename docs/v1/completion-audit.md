---
title: 完成度审计
status: draft
repo: lime-desktop-platform
---

# 完成度审计

## 1. 目的

这份清单用于判断 `lime-desktop-platform` 是否已经从文档阶段进入可开发、可联调、可接 App 的状态。

## 2. v1 完成门槛

### 2.1 文档门槛

- [x] `prd.md`
- [x] `platform-capabilities.md`
- [x] `host-contracts.md`
- [x] `architecture-diagrams.md`
- [x] `agent-runtime-strategy.md`
- [x] `workflow-model.md`
- [x] `ui-blueprint.md`
- [x] `implementation-plan.md`
- [x] `platform-methodology.md`
- [x] `host-runtime-playbook.md`
- [x] `user-story-flow-map.md`
- [x] `completion-audit.md`

### 2.2 协议门槛

- [x] manifest 结构稳定
- [x] projection 输入输出稳定
- [x] readiness 状态稳定
- [x] Host Bridge v1 稳定
- [x] IPC 公共面稳定
- [x] 本地存储分层稳定

### 2.3 平台门槛

- [x] 应用中心可用
- [x] 应用中心 UI 已按 Lime 卡片网格 / 详情弹窗形态迁移到平台 React 包，底层仍走平台 contracts / action handlers
- [x] 模型设置可用
- [x] 语音模型设置 UI 可用
- [x] 搜索服务设置 UI 可用
- [x] 网络设置 UI 可用
- [x] 关于设置 UI 可用
- [x] Product App 独特设置 namespace 可用
- [x] OAuth / 会话可用
- [x] OEM / 品牌可用
- [x] 充值 / 订阅可用
- [x] 更新 / 分发最小链路可用
- [x] 运行页可用
- [x] App Server JSON-RPC Agent Runtime 最小 blocked / needs-setup 契约可用
- [x] 模型设置到 Agent Runtime 的非敏感 `AgentRuntimeContext` / `AgentRuntimeModelProfile` handoff 契约可用
- [x] 模型设置到 App Server provider/key store 的受控 provisioning 可用
- [x] App Server JSON-RPC client 协议边界可用
- [x] App Server sidecar lifecycle 配置化启动边界可用
- [x] Credential Broker 最小本地实现可用
- [ ] OS keychain、OAuth token 轮换和生产级 credential injection 可用

### 2.4 复用门槛

- [x] `content-studio`、`zhongcao` 可作为独立 Product App 消费者接入文档边界
- [x] `samples/platform-conformance` 可作为中性 reference fixture 验证平台协议
- [x] 业务 App 不需要重复实现登录、模型和计费
- [x] `zhongcao` 已通过 `@limecloud/desktop-platform-react` 挂载 `PlatformModuleOutlet`，平台应用中心、公共设置、运行和 Host Bridge UI 由平台包提供
- [x] 业务 App 不需要重复实现语音模型设置 UI；真实 ASR 能力后续由平台 host-core action handler 承接
- [x] 业务 App 不需要重复实现搜索服务设置 UI；真实 WebSearch provider 凭证和路由后续由平台 host-core action handler 承接
- [x] 业务 App 不需要重复实现网络代理设置 UI；真实系统代理检测、代理保存和 AI 子进程环境变量注入后续由平台 host-core settings / network action handler 承接
- [x] 业务 App 不需要重复实现关于页 UI；真实更新检查、更新日志和打开日志目录后续由平台 updater / diagnostics action handler 承接
- [x] 业务 App 独特设置可通过平台设置弹窗 extension 写入独立 `product-settings` namespace
- [ ] Tauri 适配可以共用同一协议

## 3. 必须阻断的风险

| 风险 | 处理方式 |
| --- | --- |
| 平台变成业务 App | 拆回共享能力和业务能力边界。 |
| 云端逻辑下沉到壳层 | 保持 `limecore` 为权威来源。 |
| 状态伪成功 | blocked / needs-setup 直接可见。 |
| 路径写死 | 全部改为 workspace / userData 抽象。 |
| 单 App 特化污染底座 | 抽到样板接入层，不进平台核心。 |

## 4. 开发验收建议

1. 先跑通文档到代码的映射。
2. 再跑通应用中心和设置中心。
3. 再跑通一个完整 App 的安装、启动和更新。
4. 再验证第二个 App 的复用。
5. 最后验证 Tauri 同协议对接。

## 5. 发布前门槛

### 5.1 文档门槛

- [x] PRD 完整
- [x] 平台能力边界完整
- [x] 宿主契约完整
- [x] 架构图完整
- [x] Agent Runtime 策略完整
- [x] 工作流模型完整
- [x] UI 蓝图完整
- [x] 实施计划完整
- [x] 用户故事流程完整
- [x] 完成度审计完整
- [x] 方法论和运行手册齐全

### 5.2 协议门槛

- [x] manifest 结构稳定
- [x] projection 输入输出稳定
- [x] readiness 状态稳定
- [x] Host Bridge v1 稳定
- [x] IPC 公共面稳定
- [x] 本地存储分层稳定
- [x] Runtime Bridge v1 开发态稳定

### 5.3 平台门槛

- [x] 应用中心可用
- [x] 模型设置可用
- [x] OAuth / 会话开发态投影可用
- [x] OEM / 品牌开发态投影可用
- [x] 充值 / 订阅开发态投影可用
- [x] 更新 / 分发最小链路可用
- [x] 运行页可用
- [x] 开发者页可用
- [x] 卸载生命周期可用
- [x] App Server JSON-RPC Agent Runtime 最小 fail-closed bridge 可用
- [x] fail-closed runtime result 可携带同一份非敏感 runtime context，用于证明后续 JSON-RPC handoff 形状
- [x] App Server JSON-RPC client 单元测试通过
- [x] App Server sidecar lifecycle 单元测试通过
- [x] App Server packaged resources manifest 解析与 sha256 校验单元测试通过
- [x] Credential Broker 单元测试通过
- [x] App Server dev live sidecar smoke 通过
- [x] App Server packaged-resource staging sidecar smoke 通过
- [ ] Electron packaged artifact sidecar smoke 通过
- [ ] OS keychain / token rotation credential smoke 通过

### 5.4 复用门槛

- [x] `content-studio`、`zhongcao` 可作为独立 Product App 消费者接入文档边界
- [x] `samples/platform-conformance` 可作为中性 reference fixture 验证平台协议
- [x] 业务 App 不需要重复实现登录、模型和计费
- [ ] Tauri 适配可以共用同一协议

## 6. 必须阻断的风险

| 风险 | 处理方式 |
| --- | --- |
| 平台变成业务 App | 拆回共享能力和业务能力边界。 |
| 云端逻辑下沉到壳层 | 保持 `limecore` 为权威来源。 |
| 状态伪成功 | `blocked` / `needs-setup` 直接可见。 |
| 路径写死 | 全部改为 workspace / userData 抽象。 |
| 单 App 特化污染底座 | 抽到样板接入层，不进平台核心。 |

## 7. 开发证据

完成平台底座至少要能留下以下证据：

- manifest 和 projection 的真实样例。
- readiness 的真实阻断样例。
- 应用中心安装与启动样例。
- 设置同步样例。
- `content-studio` / `zhongcao` 接入文档，或 `samples/platform-conformance` reference fixture。
- Tauri 同契约适配样例。

## 8. 当前代码切片证据

已落地：

- `src/shared/types.ts` 提供 manifest、projection、readiness、Host Bridge、IPC、模型设置、OAuth、OEM、billing、diagnostics 契约。
- `src/shared/types.ts` 提供 `ReleaseArtifact`、`UpdateCandidate`、`DownloadedUpdateArtifact` 和 `ControlPlaneStatus` 契约。
- `src/shared/types.ts` 和 contracts 包提供 `ProductAppSettingsRecord`、`ProductAppSettingsReadInput` 和 `ProductAppSettingsWriteInput`，按 `appId + namespace + scope` 托管业务 App 独特设置。
- `src/shared/types.ts` 和 contracts 包已声明 `lime.storage` capability，并提供 workspace scope document 最小业务存储契约，Product App 草稿、客户事实和工作流状态不能退回 `product-settings`。
- `src/shared/types.ts` 和 contracts 包提供 `PlatformNavigationIntent`，Product App 可请求打开平台设置入口而不复制设置 UI。
- `src/main/services/seedCatalog.ts` 只负责加载 `catalogScope: platform-conformance` 的中性开发态 fixture，不在平台核心 hard code 具体业务 App；真实产品名样板标记为 `external-product-reference` 后不会进入平台运行时 catalog。
- `src/main/services/limecoreControlPlane.ts` 提供唯一 `limecore` catalog、OAuth、billing 和 OEM 投影适配边界，支持独立 endpoint、`LIMECORE_BASE_URL` 和 bearer token。
- `src/main/services/releaseDownloader.ts` 提供唯一 release artifact 下载、大小校验和 sha256 校验边界。
- `src/main/services/platformService.ts` 提供安装、启用、禁用、reference fixture 卸载保留数据、readiness、snapshot、capability invoke、runtime bridge、设置同步和 Product App 设置读写的最小实现。
- `src/main/services/appServerRuntimeService.ts` 提供 `lime.agent` current capability 的 App Server JSON-RPC bridge profile、method mapping、请求归一化、provider readiness、非敏感 `AgentRuntimeContext` / `AgentRuntimeModelProfile` 投影、diagnostics 和可追溯 fail-closed 结果；`lime.agentExecution` 只作为 compat alias。
- `src/main/services/credentialBroker.ts` 和 `src/main/services/modelSettingsCredentials.ts` 只保留旧 key 迁移 / 诊断能力：新 `settings.saveModel` 临时 API Key 不再写 broker，而是由 Desktop Host 转交 App Server `modelProviderKey/create`；普通 `model-settings.json` 只保留 `apiKeyConfigured` 投影。
- 旧 `src/main/services/agentExecution/**` 和 `src/main/services/agentExecutionService.ts` 已作为 dead surface 物理删除；Pi sidecar、Claude SDK backend router 和旧 `AgentExecutionService` 不再保留代码入口。
- `src/main/services/platformStore.ts` 将工作区级事实写入 `.lime-desktop/`，将用户级配置写入 Electron `userData/state`，按 `product-settings/<appId>/<namespace>.json` 分层保存业务 App 独特设置，并阻断凭证、token、API Key 和 OAuth 类 namespace / key；`lime.storage` 由 `app-storage/workspace/<appId>/<namespace>/<documentId>.json` 托管 workspace document。
- `src/preload/index.ts` 暴露 `window.limeDesktop`，renderer 不直接访问主进程实现。
- `packages/react/src/index.tsx` 已提供平台设置弹窗、provider 设置保存 UI 和 Product Settings extension 分组。
- `src/renderer/src/App.tsx` 已有应用中心、设置中心、运行页、开发者诊断页，并作为 reference shell 接入 provider 保存和示例业务设置 namespace。
- `docs/v1/agent-runtime-strategy.md` 已切换为 Lime App Server JSON-RPC / RuntimeCore current 路线，并明确 Pi agent / Claude SDK backend 和旧 AgentExecution backend router 为 dead / deleted。

未完成：

- OAuth、billing 和 OEM 已具备 `limecore` endpoint 适配和本地 mock 验证；生产 OAuth 授权 UI、token 安全存储和真实服务错误码映射仍未完成。
- 真实更新下载已具备 catalog + artifact + sha256 的最小链路，但还没有签名验证、包回滚和差分更新。
- `samples/platform-conformance` 当前作为中性 runtime-backed reference fixture，覆盖 Host Snapshot、平台 capability、PlatformNavigationIntent 和 runtime bridge 的协议边界；它不代表任何真实 Product App。
- App Server Runtime 当前在未配置 `APP_SERVER_BIN` 时仍 fail-closed；App Server JSON-RPC client 协议边界、provider/key provisioning、配置化 stdio sidecar lifecycle、packaged resources manifest 解析、binary sha256 校验、资源相对路径约束和 mock backend 阻断已可单测。开发态 live sidecar smoke、packaged-resource staging smoke 和 external fixture event-stream smoke 已通过真实 App Server stdio / app policy / RuntimeCore backend 边界验证；external fixture event-stream smoke 还覆盖 `agentSession/read` read model，能读回本轮 session / turn / 用户消息。现有 Electron resources / package dir 的 sidecar verifier 已有 `smoke:app-server-sidecar:package-resources` 入口。真实 Electron packaged artifact sidecar smoke、真实 provider / RuntimeBackend live streaming 和 Tauri adapter 还未完成。
- Provider/key current 主链已收敛到 App Server provider store：Desktop Host 用 `modelProvider/list/read/create/update` 同步 provider metadata，并用 `modelProviderKey/create` 写入 App Server provider key；新 API Key 只作为 `settings.saveModel` 瞬时字段存在。Credential Broker 不再承接新 key 写入，只在旧 broker key 缺少 `credentialSyncedAt` marker 时作为一次性迁移 source。diagnostics / runtimeContext 已输出非敏感 credential readiness、storage kind、rotation 状态、`broker-reference-only` / `app-server-provider-ready` handoff 状态和 App Server provider id。OAuth token 轮换、过期刷新和生产级 credential injection 仍未完成。
- `lime.storage` 当前是 workspace scope JSON document 最小后端，已阻断凭证类 namespace、documentId 和 value key；per-app SQLite、storage manifest、schema migration、索引、备份清理和完整审计事件还未实现。
- Tauri adapter 还未创建。

已验证：

- `npm install` 完成，生成 `package-lock.json`。
- `npm run test:unit` 通过 31 项，覆盖 `AppServerJsonRpcClient` 的 initialize / initialized / `agentSession/start` / `agentSession/turn/start` method 顺序、providerPreference / modelPreference / hostOptions handoff、provider/key provisioning 顺序、App Server provider id 映射、`modelProviderKey/create` 唯一明文 key setup envelope、禁止调用 `modelProviderKey/next`、notification event 敏感 payload redaction、`APP_SERVER_BIN` sidecar 配置解析、packaged resources manifest 解析、binary sha256 校验、资源相对路径约束、mock backend 阻断、stdio sidecar spawn / client 复用，`AppServerRuntimeService` 的 runtimeContext / modelProfile 交接、App Server provider id 覆盖 providerPreference、credentialRef 非敏感 metadata、credential readiness / productionInjectionReady、缺模型 readiness、diagnostics 非敏感上下文、connected client `ready` readiness 和 injected client `started` 路径，Credential Broker legacy 写入 / 解析 / rotation readiness、普通 `ModelSettings` 剔除明文 API Key、模型设置页短程 API Key 入 `settings.saveModel`、PlatformService 保存模型设置触发 App Server provider/key sync 但 runtime invoke 不触发 key provisioning、新 key 不写 broker、旧 broker key 只迁移一次、`lime.agentExecution` compat alias 委托 current App Server bridge、`lime.agent` capability runtime event payload 摘要化 / redaction，以及 PlatformService / PlatformStore 的业务 App 设置隔离、Product App settings 凭证 namespace / key 阻断、`lime.storage` workspace document 后端、凭证类 namespace / documentId / value 阻断和 package resources sidecar verifier。
- `APP_SERVER_BIN=/path/to/app-server npm run smoke:app-server-sidecar` 通过，覆盖真实 App Server stdio `initialize` / `initialized`、`capability/list` app policy 可见性、`agentSession/start` 和 `agentSession/turn/start` 到 RuntimeCore backend 边界；当前用 `--backend unavailable` 明确证明 policy 不再 `capability denied`，且 backend 未配置错误是预期 fail-closed，不把 mock backend 当生产证据。
- `APP_SERVER_BIN=/path/to/app-server npm run smoke:app-server-sidecar:packaged` 通过，先在临时 resources 目录 staging `app-server/manifest.json` 和带 sha256 的 binary，再从该 packaged-resource manifest 启动真实 App Server stdio；该验证覆盖资源 manifest、binary sha256 和 app policy 到 RuntimeCore backend 边界，但还不是 Electron 安装包产物 smoke。
- `APP_SERVER_BIN=/path/to/app-server npm run smoke:app-server-sidecar:event-stream` 通过，使用真实 App Server 的 `--backend external` 和 Node external fixture，验证 `message.delta` / `turn.completed` 以 `agentSession/event` notification 推到客户端，随后调用 `agentSession/read` 读回同一 session 的 turn 和用户消息 read model，并确认 `runtimeOptions.hostOptions.desktopPlatformRuntimeContext` 可见、payload 不含明文 `apiKey` / `token` / `secret`；该验证不是 mock backend，也不等同于真实 provider / RuntimeBackend live streaming。
- `APP_SERVER_RESOURCE_DIR=/path/to/resources/app-server npm run smoke:app-server-sidecar:package-resources` 可验证现有 Electron resources / package dir 中的 `app-server/manifest.json`、binary sha256、相对路径约束、mock backend 阻断和真实 stdio 启动；它是 packaged artifact smoke 的入口，不等同于已经生成并验证了 Electron 安装包产物。
- `npm run verify:local` 通过，覆盖 `test:unit`、`typecheck`、`build` 和 `smoke:electron`。
- Electron smoke 覆盖平台 bootstrap、中性 conformance fixture 安装、登录投影、模型设置、billing 刷新、入口启动、host snapshot、capability invoke、平台变化事件和 fixture 卸载生命周期。
- Electron smoke 覆盖 `lime.agent` / App Server bridge profile，确认当前返回 `blocked` 或 `needs-setup` normalized event，而不是伪成功。
- Electron smoke 覆盖 runtimeContext / modelProfile 非敏感投影，确认 provider/model/protocol 能进入 blocked result，同时不包含 `apiKey`、`token`、`secret` 或 `refreshToken`。
- Electron smoke 覆盖 Product App 设置 namespace 写入 / 读回、非法 `appId` 路径穿越阻断、`lime.storage` 写入 / 读回 / 列表 / 删除、凭证 namespace 阻断和写事件 value redaction。
- Electron smoke 启动本地 mock `limecore`，覆盖 `LIMECORE_CATALOG_URL` catalog 同步、OAuth session 投影、billing 投影、OEM 投影、agentapp package release artifact 下载、sha256 校验、package 更新和 packageHash 写入。
- Electron smoke 不再把 `content-studio`、`zhongcao` 或 OEM App 作为平台内置同名 App 安装或启动。
- `npm run governance:hardcode-scan` 用于阻止 `zhongcao`、GEO 或其他业务样板硬编码回流到平台核心目录，并阻止 Pi agent / Claude SDK 泄露到公开 contracts 或 current runtime。
