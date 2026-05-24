---
title: Lime Desktop Platform v1 Roadmap
status: draft
repo: lime-desktop-platform
---

# Lime Desktop Platform v1 路线图

## 1. 一句话目标

把 `lime-desktop-platform` 做成 `agentapp` 标准的 Lime 桌面宿主实现，统一承接 Agent App 标准应用中心、projection、readiness、Host Bridge、Capability SDK adapter、模型设置、OAuth、OEM、充值、更新和跨 App 复用协议。

## 2. 适用范围

- `content-studio` 独立产品 App
- `zhongcao` 独立产品 App
- `samples/platform-conformance` 中性 reference fixture
- 后续所有 OEM Electron App
- 未来的 Tauri + React + Rust 适配实现

事实源关系：

- `/Users/coso/Documents/dev/ai/limecloud/agentapp` 是 Agent App / 应用中心标准协议事实源。
- `lime-desktop-platform` 是该标准的桌面宿主和平台级应用中心实现之一。
- `content-studio`、`zhongcao` 和后续 OEM App 不是 `lime-desktop-platform` 的子 App；它们是独立 Agent App / Product App，可以在各自产品内实现自己的应用中心。
- `samples/platform-conformance` 是本仓库的中性 reference fixture，用于验证标准宿主、runtime bridge、Host Snapshot、Capability SDK 和 `PlatformNavigationIntent`，不是平台核心产品对象。
- 平台 App 运行时 catalog 不内置真实 Product App 的同名样板。
- Product App 内部应用中心仍必须消费 `agentapp` 标准的 manifest、projection、readiness、Host Bridge 和 Capability SDK 语义，不能重造第二套协议。

## 3. 文档索引

| 文档 | 用途 |
| --- | --- |
| [`prd.md`](./prd.md) | 产品定义、目标、范围、里程碑和验收。 |
| [`platform-capabilities.md`](./platform-capabilities.md) | 平台能力边界、共享模块和数据主权。 |
| [`host-contracts.md`](./host-contracts.md) | Manifest、projection、readiness、Host Bridge、IPC 和存储契约。 |
| [`architecture-diagrams.md`](./architecture-diagrams.md) | 系统架构图、启动时序、安装与更新流程。 |
| [`agent-runtime-strategy.md`](./agent-runtime-strategy.md) | 参考 craft-agents-oss 后的 Claude SDK / Pi / MCP execution backend 策略。 |
| [`workflow-model.md`](./workflow-model.md) | App 安装、启动、更新、禁用和设置同步的状态模型。 |
| [`ui-blueprint.md`](./ui-blueprint.md) | 桌面壳层、应用中心、设置页和运行页蓝图。 |
| [`implementation-plan.md`](./implementation-plan.md) | 研发切片、目录建议、验证方式和落地顺序。 |
| [`platform-methodology.md`](./platform-methodology.md) | 平台方法论、事实源顺序和开发原则。 |
| [`host-runtime-playbook.md`](./host-runtime-playbook.md) | 宿主运行手册、常见动作和故障恢复路径。 |
| [`limecore-control-plane.md`](./limecore-control-plane.md) | limecore catalog、release artifact 和更新校验接入边界。 |
| [`user-story-flow-map.md`](./user-story-flow-map.md) | 角色、路径、页面和主动作映射。 |
| [`completion-audit.md`](./completion-audit.md) | v1 完成门槛、风险和开发验收清单。 |
| [`zhongcao-handoff-prompt.md`](./zhongcao-handoff-prompt.md) | 交给独立 zhongcao 开发进程的提示词和验收边界。 |

## 4. v1 开发顺序

1. 先对齐 `agentapp` 标准契约：manifest、projection、readiness、Host Bridge、Capability SDK、存储边界。
2. 再定壳层：应用中心、启动页、设置页、运行页。
3. 再定共享能力：模型设置、OAuth、OEM、充值、更新。
4. 再定 Agent Execution Runtime：Claude SDK、Pi 和 MCP 只作为 host-core 后端 adapter，不进入 Product App 公开依赖。
5. 再接首批消费者：`content-studio`、`zhongcao` 和 OEM App；用 `samples/platform-conformance` 作为中性 reference fixture 验证协议。
6. 最后做跨技术栈适配：Electron 先行，Tauri 同协议复用。

## 5. 设计原则

- 平台底座只做共享能力，不吞业务流程。
- 云端控制面归 `limecore`，本地宿主归 `lime-desktop-platform`。
- Agent Runtime 继续保持执行事实标准，不与桌面壳混淆。
- 所有状态都要可追溯，`blocked` 不能伪造成成功。
- 工作区级事实和用户级配置要分开存储。
- Electron 和 Tauri 必须共享同一套外部契约。
- Agent App / 应用中心标准以 `agentapp` 仓库为准；本仓库只实现桌面宿主侧 adapter。
- Product App 通过 `agentapp` 标准 package、Host Snapshot、Host Bridge 和 Capability SDK 调用消费 AI agent 能力；产品内应用中心的 package 目录属于 Product App，不属于平台核心。
- 模型设置、OAuth、OEM、充值 / 订阅、更新 / 分发和平台级应用中心属于 `lime-desktop-platform` 公共能力；Product App 只展示投影并发送 `PlatformNavigationIntent`。
- Claude SDK、Pi、MCP session tools 属于平台 Agent Execution Runtime 的 backend adapter；Product App 不直接 import provider SDK，也不复制 provider session manager。
- runtime-backed 只是 reference shell / smoke fixture 的兼容落地形态，不代表 Product App 必须由平台应用中心托管启动。
