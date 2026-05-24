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
- [x] 模型设置可用
- [x] OAuth / 会话可用
- [x] OEM / 品牌可用
- [x] 充值 / 订阅可用
- [x] 更新 / 分发最小链路可用
- [x] 运行页可用
- [x] Agent Execution Runtime 最小 blocked / needs-setup 契约可用
- [ ] Claude SDK backend 可用
- [ ] Pi sidecar backend 可用

### 2.4 复用门槛

- [x] `content-studio`、`zhongcao` 可作为独立 Product App 消费者接入文档边界
- [x] `samples/platform-conformance` 可作为中性 reference fixture 验证平台协议
- [x] 业务 App 不需要重复实现登录、模型和计费
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
- [x] Agent Execution Runtime 最小 `BlockedBackend` 可用
- [ ] Claude SDK / Pi backend 至少一个 smoke 通过

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
- `src/shared/types.ts` 和 contracts 包提供 `PlatformNavigationIntent`，Product App 可请求打开平台设置入口而不复制设置 UI。
- `src/main/services/seedCatalog.ts` 只负责加载 `catalogScope: platform-conformance` 的中性开发态 fixture，不在平台核心 hard code 具体业务 App；真实产品名样板标记为 `external-product-reference` 后不会进入平台运行时 catalog。
- `src/main/services/limecoreControlPlane.ts` 提供唯一 `limecore` catalog、OAuth、billing 和 OEM 投影适配边界，支持独立 endpoint、`LIMECORE_BASE_URL` 和 bearer token。
- `src/main/services/releaseDownloader.ts` 提供唯一 release artifact 下载、大小校验和 sha256 校验边界。
- `src/main/services/platformService.ts` 提供安装、启用、禁用、reference fixture 卸载保留数据、readiness、snapshot、capability invoke、runtime bridge 和设置同步的最小实现。
- `src/main/services/agentExecution/` 提供 `lime.agentExecution` 的最小 backend router、backend descriptor、Claude / Pi / Generic not-installed adapters、sidecar protocol skeleton、Tool Registry skeleton、blocked backend、请求归一化、模型 readiness、事件和可追溯阻断结果。
- `src/main/services/platformStore.ts` 将工作区级事实写入 `.lime-desktop/`，将用户级配置写入 Electron `userData/state`。
- `src/preload/index.ts` 暴露 `window.limeDesktop`，renderer 不直接访问主进程实现。
- `src/renderer/src/App.tsx` 已有应用中心、设置中心、运行页和开发者诊断页。
- `docs/v1/agent-runtime-strategy.md` 已完成对 `craft-agents-oss` Claude SDK、Pi sidecar、MCP session tools、LLM connection 和 token refresh 设计的分析，并明确它们在平台中只能作为 execution backend adapter。

未完成：

- OAuth、billing 和 OEM 已具备 `limecore` endpoint 适配和本地 mock 验证；生产 OAuth 授权 UI、token 安全存储和真实服务错误码映射仍未完成。
- 真实更新下载已具备 catalog + artifact + sha256 的最小链路，但还没有签名验证、包回滚和差分更新。
- `samples/platform-conformance` 当前作为中性 runtime-backed reference fixture，覆盖 Host Snapshot、平台 capability、PlatformNavigationIntent 和 runtime bridge 的协议边界；它不代表任何真实 Product App。
- `AgentExecutionService` 的 backend router、backend descriptor、Claude / Pi / Generic not-installed adapters、sidecar protocol skeleton、Tool Registry skeleton 和 blocked backend 已进入代码 current surface；Claude SDK backend、Pi sidecar backend、完整 Capability Tool Registry 和 Tauri sidecar adapter 的真实执行实现仍是 `proposed-current`。
- Tauri adapter 还未创建。

已验证：

- `npm install` 完成，生成 `package-lock.json`。
- `npm run verify:local` 通过，覆盖 `typecheck`、`build` 和 `smoke:electron`。
- Electron smoke 覆盖平台 bootstrap、中性 conformance fixture 安装、登录投影、模型设置、billing 刷新、入口启动、host snapshot、capability invoke、平台变化事件和 fixture 卸载生命周期。
- Electron smoke 覆盖 `lime.agentExecution` capability，确认当前返回 `blocked`、`backend=blocked` 和 normalized event，而不是伪成功。
- Electron smoke 启动本地 mock `limecore`，覆盖 `LIMECORE_CATALOG_URL` catalog 同步、OAuth session 投影、billing 投影、OEM 投影、agentapp package release artifact 下载、sha256 校验、package 更新和 packageHash 写入。
- Electron smoke 不再把 `content-studio`、`zhongcao` 或 OEM App 作为平台内置同名 App 安装或启动。
- `npm run governance:hardcode-scan` 用于阻止 `zhongcao`、GEO 或其他业务样板硬编码回流到平台核心目录，并阻止 Claude SDK / Pi SDK 泄露到公开 contracts。
