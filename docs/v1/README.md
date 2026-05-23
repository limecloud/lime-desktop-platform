---
title: Lime Desktop Platform v1 Roadmap
status: draft
repo: lime-desktop-platform
---

# Lime Desktop Platform v1 路线图

## 1. 一句话目标

把 `lime-desktop-platform` 做成 Lime 组织桌面产品线的公共底座，统一承接 Agent App 宿主、模型设置、OAuth、OEM、充值、应用中心、更新和跨 App 复用协议。

## 2. 适用范围

- `content-studio`
- `zhongcao`
- 后续所有 OEM Electron App
- 未来的 Tauri + React + Rust 适配实现

## 3. 文档索引

| 文档 | 用途 |
| --- | --- |
| [`prd.md`](./prd.md) | 产品定义、目标、范围、里程碑和验收。 |
| [`platform-capabilities.md`](./platform-capabilities.md) | 平台能力边界、共享模块和数据主权。 |
| [`host-contracts.md`](./host-contracts.md) | Manifest、projection、readiness、Host Bridge、IPC 和存储契约。 |
| [`architecture-diagrams.md`](./architecture-diagrams.md) | 系统架构图、启动时序、安装与更新流程。 |
| [`workflow-model.md`](./workflow-model.md) | App 安装、启动、更新、禁用和设置同步的状态模型。 |
| [`ui-blueprint.md`](./ui-blueprint.md) | 桌面壳层、应用中心、设置页和运行页蓝图。 |
| [`implementation-plan.md`](./implementation-plan.md) | 研发切片、目录建议、验证方式和落地顺序。 |
| [`platform-methodology.md`](./platform-methodology.md) | 平台方法论、事实源顺序和开发原则。 |
| [`host-runtime-playbook.md`](./host-runtime-playbook.md) | 宿主运行手册、常见动作和故障恢复路径。 |
| [`user-story-flow-map.md`](./user-story-flow-map.md) | 角色、路径、页面和主动作映射。 |
| [`completion-audit.md`](./completion-audit.md) | v1 完成门槛、风险和开发验收清单。 |
| [`zhongcao-integration.md`](./zhongcao-integration.md) | zhongcao 接入平台的能力边界、启动顺序和 manifest 样板。 |
| [`zhongcao-handoff-prompt.md`](./zhongcao-handoff-prompt.md) | 交给 zhongcao 开发进程的启动提示词和接入验收。 |

## 4. v1 开发顺序

1. 先定契约：manifest、projection、readiness、Host Bridge、存储边界。
2. 再定壳层：应用中心、启动页、设置页、运行页。
3. 再定共享能力：模型设置、OAuth、OEM、充值、更新。
4. 再接首批 App：`content-studio`、`zhongcao`。
5. 最后做跨技术栈适配：Electron 先行，Tauri 同协议复用。

## 5. 设计原则

- 平台底座只做共享能力，不吞业务流程。
- 云端控制面归 `limecore`，本地宿主归 `lime-desktop-platform`。
- Agent Runtime 继续保持执行事实标准，不与桌面壳混淆。
- 所有状态都要可追溯，`blocked` 不能伪造成成功。
- 工作区级事实和用户级配置要分开存储。
- Electron 和 Tauri 必须共享同一套外部契约。
- runtime-backed 只是第一阶段落地形态；业务 App 必须通过 Host Snapshot、runtime bridge 和平台事件消费宿主能力。
