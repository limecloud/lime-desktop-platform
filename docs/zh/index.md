---
title: Lime Desktop Platform
description: Lime 桌面平台底座文档。
---

# Lime Desktop Platform

`lime-desktop-platform` 是 Lime 组织的 Agent App 标准桌面宿主实现之一。

它负责下沉公共能力：

- 平台级 Agent App 应用中心。
- App 安装、投影、readiness、启动、禁用、卸载和更新。
- 模型设置、OAuth / 会话、OEM / 品牌、充值 / 订阅、更新 / 分发。
- Host Bridge、Capability SDK adapter、Host Snapshot 和运行诊断。

`content-studio`、`zhongcao` 和后续 OEM App 是独立 Product App。它们可以有产品内 Agent App 应用中心，但只能消费宿主公共能力投影，不能复制模型设置、OAuth、充值、更新或平台安装表。平台 App 运行时 catalog 只内置中性 conformance fixture，不内置真实 Product App 同名样板。

## 快速入口

- [v1 路线图](../v1/)
- [架构与流程图](../v1/architecture-diagrams)
- [Agent Runtime 策略](../v1/agent-runtime-strategy)
- [平台能力边界](../v1/platform-capabilities)
- [Host 与数据契约](../v1/host-contracts)
- [zhongcao 独立产品提示词](../v1/zhongcao-handoff-prompt)

## 当前治理分类

- `current`：平台公共能力、Host Runtime、Agent Execution Runtime 文档边界、Host Bridge、Capability SDK、Product App 投影消费。
- `compat`：`samples/platform-conformance`、runtime-backed reference shell、`LIME_HOST_SNAPSHOT`、`LIME_RUNTIME_BRIDGE`。
- `deprecated`：业务 App 私有 OAuth、模型设置、充值、OEM、更新、平台安装表或直接依赖 provider SDK。
- `dead`：把 Product App 当成平台子 App，把真实 Product App 同名样板放进平台运行时 catalog，或把 Claude SDK / Pi 当作 Agent App 标准事实源。
