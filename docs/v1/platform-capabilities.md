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
| Agent Execution Runtime | agent session、provider backend 路由、事件归一化、权限握手、abort / resume | `agentapp` 标准 + 平台模型设置 + backend adapter | session snapshot / event log | Capability SDK / 运行页 | `needs-setup` / `blocked` |
| MCP / Session Tools | 工具 schema、权限 metadata、session context、MCP / backend tool wrapper | 平台 Tool Registry + Product App package | tool registry cache | Capability SDK / backend adapter | `blocked` |
| 模型设置 | provider、protocol、默认模型、覆盖策略、同步 | 本地配置 + 云端默认值 | `userData` 配置 | 设置中心 | `needs-setup` / `blocked` |
| OAuth / 会话 | 登录、token、租户身份、退出、刷新 | `limecore` identity | 安全存储 / 会话缓存 | 顶部状态栏 / 设置中心 | `unauthenticated` |
| OEM / 品牌 | 品牌名、logo、壳层文案、主题、渠道、品牌投影 | `limecore` OEM manifest | 本地品牌快照 | 顶部状态栏 / 壳层样式 | `needs-branding` |
| 充值 / 订阅 | 套餐、余额、开通、续费、状态展示 | `limecore` billing | 本地只读投影 | 设置中心 / 状态栏 | `needs-payment` |
| 更新 / 分发 | 检查更新、下载、安装、版本切换、回退提示 | `limecore` release metadata | 本地下载缓存 | 更新提示 / 应用中心 | `update-available` / `update-failed` |
| 平台设置 | 语言、代理、主题、工作区、默认能力开关 | 本地用户设置 | `userData` / workspace | 设置中心 | `needs-setup` |
| 运行可见性 | 运行状态、证据、错误、日志摘要、调用轨迹 | Host Runtime | 本地运行记录 | 运行页 / 开发者页 | `blocked` / `failed` |

当前实现中，应用目录、更新分发、OAuth session 投影、OEM 投影和 billing 投影已具备 `limecore` 最小接入链路；生产 OAuth 授权 UI、token 安全存储、真实服务错误码映射、签名验证和回滚包管理仍未完成。

Claude SDK / Pi / MCP 运行时策略已完成文档分析，`AgentExecutionService` 的最小 `BlockedBackend` 已进入代码 current surface。下一阶段应接 `ClaudeSdkExecutionBackend`、`PiExecutionBackend` 和 Tool Registry。在此之前，Product App 不能直接依赖 Claude SDK 或 Pi SDK 作为平台能力替代品。

平台级应用中心是 `lime-desktop-platform` 对 `agentapp` 标准的桌面宿主实现，用于目录、安装、更新、projection、readiness 和运行诊断。Product App 也可以实现自己的产品内应用中心；这些产品内入口必须复用 `agentapp` 的 manifest、install mode、entry、capability、projection 和 readiness 语义，底层 capability、会话、模型设置、billing、OEM 和更新投影由兼容宿主注入。

公共能力的实现边界必须固定在宿主侧：模型设置、OAuth / 会话、OEM / 品牌、充值 / 订阅、更新 / 分发和平台级应用中心由 `lime-desktop-platform` 实现并通过 Host Snapshot、Capability SDK 或 `PlatformNavigationIntent` 暴露。`content-studio`、`zhongcao` 和后续 Product App 只能调用、展示和响应这些投影，不允许复制设置页、支付账本、OAuth token 管理或平台安装表。平台 App 运行时 catalog 只允许中性 `samples/platform-conformance` fixture，不允许内置真实 Product App 同名样板。

## 3. 共享与不共享

### 3.1 必须共享

- 应用中心
- 模型设置
- OAuth / 会话
- OEM 壳层
- 充值 / 订阅
- 更新 / 分发
- Host Bridge
- Agent Execution Runtime
- Capability Tool Registry / MCP session tools
- 权限和 readiness
- 日志和运行证据

### 3.2 不共享

- 业务工作流
- 行业内容逻辑
- App 私有素材库
- App 私有页面状态
- 具体的 Prompt、SOP、内容结构和领域知识
- 某个 App 的临时实验实现

## 4. 数据主权

### 4.1 本地优先的数据

- App 安装状态
- Host Bridge 会话
- 用户设置
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
- OAuth 状态：云端给会话事实，本地给安全缓存。
- 应用启动状态：云端只看目录，本地只看实际安装和 readiness。
- 品牌投影：云端给品牌事实，本地给壳层表现。

## 5. 平台边界

- 不把业务 App 的内容流程塞进平台底座。
- 不把 `limecore` 的云端控制逻辑复制到桌面壳。
- 不把 Agent Runtime 的执行事实改写成 UI 状态。
- 不让单个 App 自己维护一套独立登录、计费和品牌逻辑。
- 不把模型设置、OAuth、充值、OEM、更新或平台级应用中心下放到 Product App 私有实现。
- 不把 Claude SDK、Pi SDK 或 MCP session manager 下放到 Product App 私有实现。
- 不把一个 App 的私有页面状态提升成公共能力。

## 6. 开发优先级

1. 先做 Host Runtime 和应用中心。
2. 再做模型设置和 OAuth。
3. 再做 Agent Execution Runtime 的最小 blocked / needs-setup / event 契约。
4. 再接 Claude SDK backend、Pi sidecar backend 和 Tool Registry。
5. 再做 OEM、充值、更新、诊断和运行可见性。
6. 最后做跨 App 复用和 Tauri 适配。
