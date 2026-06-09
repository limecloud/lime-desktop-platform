---
title: 平台能力边界
status: draft
repo: lime-desktop-platform
---

# 平台能力边界

## 1. 核心判断

`lime-desktop-platform` 不是业务 App，也不是云端控制面。它的价值在于实现 `agentapp` 标准桌面宿主，把多个桌面 App 共同需要的安装、投影、readiness、Host Bridge、Capability SDK 和平台能力收敛成一套稳定底座。

## 2. 能力矩阵

| 模块 | 平台负责 | 权威来源 | 本地缓存 | 对外暴露 | 失败呈现 |
| --- | --- | --- | --- | --- | --- |
| Agent App 标准宿主 | `agentapp` manifest 校验、projection、readiness、Host Bridge、runtime bridge、Capability SDK 路由 | `agentapp` 标准 + 本地 host profile | runtime session / 运行快照 | 运行页 / 诊断页 / adapter API | `needs-setup` / `blocked` |
| Agent App 应用中心 | 目录、安装、更新、启用、禁用、启动 | `agentapp` package + `limecore` catalog / release | 本地 installed catalog | 应用中心 / 应用详情 | `needs-setup` / `blocked` |
| Agent Runtime | Lime App Server JSON-RPC bridge、RuntimeCore method mapping、事件归一化、权限握手、fail-closed readiness | `agentapp` 标准 + 平台模型设置 + App Server RuntimeCore | session snapshot / event log | Capability SDK / 运行页 | `needs-setup` / `blocked` |
| MCP / Session Tools | 工具 schema、权限 metadata、session context、RuntimeCore tool action | App Server RuntimeCore + 平台 permission/readiness 策略 | tool registry cache | Capability SDK / App Server bridge | `blocked` |
| 模型设置 | provider、protocol、authType、baseUrl、Responses API、默认模型、覆盖策略、同步 | 本地配置 + 云端默认值 | `userData` 配置 | 设置中心 | `needs-setup` / `blocked` |
| OAuth / 会话 | 登录、token、租户身份、退出、刷新 | `limecore` identity | 安全存储 / 会话缓存 | 顶部状态栏 / 设置中心 | `unauthenticated` |
| OEM / 品牌 | 品牌名、logo、壳层文案、主题、渠道、品牌投影 | `limecore` OEM manifest | 本地品牌快照 | 顶部状态栏 / 壳层样式 | `needs-branding` |
| 充值 / 订阅 | 套餐、余额、开通、续费、状态展示 | `limecore` billing | 本地只读投影 | 设置中心 / 状态栏 | `needs-payment` |
| 更新 / 分发 | 检查更新、下载、安装、版本切换、回退提示 | `limecore` release metadata | 本地下载缓存 | 更新提示 / 应用中心 | `update-available` / `update-failed` |
| 平台设置 | 语言、代理、主题、工作区、默认能力开关 | 本地用户设置 | `userData` / workspace | 设置中心 | `needs-setup` |
| Product App 独特设置 | 业务 App 自己的偏好、展示和领域开关，按 namespace 托管；不得保存凭证、token、API Key 或 OAuth 数据 | Product App extension + 平台 Store | `.lime-desktop/product-settings` / `userData/state/product-settings` | 设置中心业务设置分组 | `needs-setup` / `blocked` |
| Product App 业务存储 | app-local records、草稿、工作流状态、后续 schema / migration | Product App storage manifest + 宿主 storage service | `.lime-desktop/app-storage` JSON document / 后续 per-app SQLite | `lime.storage` Capability SDK | `blocked` |
| 运行可见性 | 运行状态、证据、错误、日志摘要、调用轨迹 | Host Runtime | 本地运行记录 | 运行页 / 开发者页 | `blocked` / `failed` |

当前实现中，应用目录、更新分发、OAuth session 投影、OEM 投影和 billing 投影已具备 `limecore` 最小接入链路；生产 OAuth 授权 UI、token 安全存储、真实服务错误码映射、签名验证和回滚包管理仍未完成。

Agent Runtime current 主链已切换为 Product App -> Capability SDK 调用 `lime.agent` -> Desktop Host / Host Bridge -> Lime App Server JSON-RPC -> RuntimeCore。`AppServerRuntimeService` 负责 `lime.agent` capability、method mapping、provider readiness、JSON-RPC client handoff 和 fail-closed result；旧 `lime.agentExecution` 只作为 compat alias。Pi agent、Claude SDK 和旧 backend router 不再作为 current/proposed 路线，旧 `src/main/services/agentExecution/**` 代码入口已删除。App Server client 未配置、未连接或握手失败时，Product App 也不能直接依赖 Pi agent 或 Claude SDK 作为平台能力替代品。

模型设置虽然保存在 `lime-desktop-platform` 设置中心，但执行时必须进入 App Server / RuntimeCore。正确链路分两段：保存设置时 Desktop Host 把 provider metadata 通过 App Server JSON-RPC `modelProvider/list/read/create/update` 同步到 App Server provider store，并且只在这个设置同步边界从 Credential Broker 解析短程 API Key 后调用 `modelProviderKey/create`；运行时 Desktop Host 在 `lime.agent` 调用边界解析 `ModelSettings`，生成 host-mediated `AgentRuntimeContext` / `AgentRuntimeModelProfile`，再通过 `agentSession/turn/start.params.runtimeOptions.providerPreference` / `modelPreference` 传给 RuntimeCore。`providerPreference` 优先使用 App Server 返回的真实 provider id，非敏感 context 放入 `hostOptions.desktopPlatformRuntimeContext`。这个 context 只包含 `settingsVersion`、desktop provider id、App Server provider id、protocol、authType、baseUrl、useResponsesApi、capabilityKinds、modelId / requestedModelId、capability、permissionMode 和 `credentialPolicy`。密钥只能以 `credentialRef` 形式出现，`credentialRef.resolver` 固定为 `desktop-host-credential-broker`。当前最小 Credential Broker 已接入，普通 `ModelSettings` JSON 只保留 `apiKeyConfigured`，API Key / OAuth 凭证写入 broker；broker 会输出非敏感 storage kind、keychain-backed 状态、rotation 状态和 `runtimeStatus`。`app-server-provider-ready` 表示 App Server provider/key provisioning 已完成；`broker-reference-only` 表示 broker 已有凭证但尚未完成 App Server provider/key provisioning 或 host resolver 注入，live provider 会 fail-closed。`modelProviderKey/create` 是设置同步控制面，不是 runtime turn payload；`modelProviderKey/next` 会返回明文 key，Desktop Host 不在 Product App invoke 路径调用它。OS keychain、OAuth token 轮换和生产级注入策略仍未完成。任何时候都不允许把 API Key、OAuth token 或 refresh token 写入普通 JSON、Product App 设置、Host Snapshot、runtime event 或 runtime turn JSON-RPC payload。

平台级应用中心是 `lime-desktop-platform` 对 `agentapp` 标准的桌面宿主实现，用于目录、安装、更新、projection、readiness 和运行诊断。Product App 也可以实现自己的产品内应用中心；这些产品内入口必须复用 `agentapp` 的 manifest、install mode、entry、capability、projection 和 readiness 语义，底层 capability、会话、模型设置、billing、OEM 和更新投影由兼容宿主注入。

公共能力的实现边界必须固定在宿主侧：模型设置、provider 设置、OAuth / 会话、OEM / 品牌、充值 / 订阅、更新 / 分发、网络、搜索、数据、安全和平台级应用中心由 `lime-desktop-platform` 实现并通过 Host Snapshot、Capability SDK 或 `PlatformNavigationIntent` 暴露。`content-studio`、`zhongcao` 和后续 Product App 只能调用、展示和响应这些投影，不允许复制设置页、支付账本、OAuth token 管理、模型 provider 设置或平台安装表。业务 App 的独特设置只能通过 Product Settings extension 写入独立 namespace，且凭证类 namespace / key / value 会被宿主拒绝；业务 App 的真实业务数据必须声明 `lime.storage`，由宿主管理 per-app 存储，并阻断凭证类 namespace / documentId / value。当前实现是 workspace scope JSON document 后端，后续再升级 SQLite / migration。平台 App 运行时 catalog 只允许中性 `samples/platform-conformance` fixture，不允许内置真实 Product App 同名样板。

公共 React UI 的事实源是 `@limecloud/desktop-platform-react`。Product App 如果需要平台能力总览、平台应用中心、云端会话、模型设置、品牌、充值、更新、运行、Host Bridge 或公共设置弹窗，必须挂载 `PlatformModuleOutlet` / `PlatformSettingsDialog` 并传入 bootstrap projection 与 action handler。Product App 允许把自己的产品内 `agentapps/*` package 转成平台组件所需的 `PlatformBootstrap` 投影，但不得复制平台 UI 或维护第二套平台安装表。

## 3. 共享与不共享

### 3.1 必须共享

- 应用中心
- 模型设置
- provider 设置
- OAuth / 会话
- OEM 壳层
- 充值 / 订阅
- 更新 / 分发
- Host Bridge
- Agent Runtime
- Capability Tool Registry / MCP session tools
- 权限和 readiness
- 日志和运行证据
- Product App 独特设置托管入口
- Product App 业务数据存储隔离能力

### 3.2 不共享

- 业务工作流
- 行业内容逻辑
- App 私有素材库
- App 私有页面状态
- App 业务数据 schema 和 migration 语义
- 具体的 Prompt、SOP、内容结构和领域知识
- 某个 App 的临时实验实现

## 4. 数据主权

### 4.1 本地优先的数据

- App 安装状态
- Host Bridge 会话
- 用户设置
- Product App workspace scope 独特设置
- 本地下载缓存
- 已校验 release artifact
- App 运行快照
- 运行日志和证据摘要

### 4.2 云端权威的数据

- 租户身份
- 应用目录
- 发布元数据
- OEM 品牌配置
- 充值和订阅状态

### 4.3 双写但不双权威的数据

- 模型设置：云端给默认值，本地给最终选择。
- Product App 独特设置：平台负责 namespace、scope、版本和落盘；业务 App 只负责自己的 value schema。
- Product App 业务数据：业务 App 拥有 schema / migration / 领域语义；平台拥有物理落点、隔离、授权、备份清理和审计。
- OAuth 状态：云端给会话事实，本地给安全缓存。
- 应用启动状态：云端只看目录，本地只看实际安装和 readiness。
- 品牌投影：云端给品牌事实，本地给壳层表现。

## 5. 平台边界

- 不把业务 App 的内容流程塞进平台底座。
- 不把 `limecore` 的云端控制逻辑复制到桌面壳。
- 不把 Agent Runtime 的执行事实改写成 UI 状态。
- 不让单个 App 自己维护一套独立登录、计费和品牌逻辑。
- 不把模型设置、OAuth、充值、OEM、更新或平台级应用中心下放到 Product App 私有实现。
- 不让 Product App 把 provider key、OAuth token、billing 或平台设置副本作为 runtime 参数传给 App Server。
- 不让 App Server / RuntimeCore 反向读取桌面平台本地设置 JSON；执行所需模型上下文必须走 Host-mediated `AgentRuntimeContext`。
- 不把 provider 设置、网络、搜索、数据、安全等基础设置下放到 Product App 私有实现。
- 不把 `product-settings` 当作 Product App 业务数据库；草稿、历史记录和工作流状态必须走 `lime.storage`。
- 不把 Pi agent、Claude SDK 或 MCP session manager 下放到 Product App 私有实现。
- 不把一个 App 的私有页面状态提升成公共能力。

## 6. 开发优先级

1. 先做 Host Runtime 和应用中心。
2. 再做模型设置和 OAuth。
3. 再做 Agent Runtime 的 App Server JSON-RPC bridge、blocked / needs-setup / event 契约。
4. 再把最小 Credential Broker 和 `lime.storage` JSON document 后端推进到生产级安全存储、schema / migration、索引、备份清理和审计。
5. 再做 OEM、充值、更新、诊断和运行可见性。
6. 最后做跨 App 复用和 Tauri 适配。
