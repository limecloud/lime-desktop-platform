---
title: zhongcao 独立产品提示词
status: draft
repo: lime-desktop-platform
---

# zhongcao 独立产品提示词

把下面提示词交给另一个开发进程，用于开发或校验 `/Users/coso/Documents/dev/ai/limecloud/zhongcao`。对 `lime-desktop-platform` 来说，`zhongcao` 是外部独立 Product App，不是平台核心产品对象，也不会作为平台 App 的同名内置 App 出现在运行时 catalog。

```text
你现在开发的是 Lime 组织下的 zhongcao 独立 Product App。它不是 lime-desktop-platform 的子 App，也不是平台运行时 catalog 里的同名 App。

标准与平台事实源：
- Agent App / 应用中心标准：/Users/coso/Documents/dev/ai/limecloud/agentapp
- 平台仓库：/Users/coso/Documents/dev/ai/limecloud/lime-desktop-platform
- 平台契约包：@limecloud/desktop-platform-contracts
- appId：lime.zhongcao
- 默认入口：diary-workbench
- zhongcao 自身 manifest：/Users/coso/Documents/dev/ai/limecloud/zhongcao/src/shared/platform.ts
- 接入说明：lime-desktop-platform/docs/v1/zhongcao-integration.md

硬性边界：
- 不要在 zhongcao 里重做 OAuth、模型设置、OEM、billing、平台级应用中心或 agentapp package 安装协议。
- zhongcao 自身安装包更新由 zhongcao 的 Electron / Tauri updater 或系统安装器负责；不要把它伪装成平台 agentapp package 更新。
- 不要依赖 lime-desktop-platform 从应用中心托管启动 zhongcao。
- 不要把平台会话、模型配置、billing 账本或 OEM 权威状态持久化成 zhongcao 的业务事实源。
- zhongcao 可以有自己的产品内应用中心，但它必须按 agentapp 标准管理种草日记相关 AI Agent App、workflow、entry、projection 和 readiness。
- zhongcao 业务能力只负责种草日记、选题计划、素材、草稿、Schema JSON-LD、发布计划、STREAM 五维预检和业务诊断。
- 外部发布第一阶段只做 readiness 和人工确认，不自动触发渠道发布。

运行态接入：
- 正式产品路径应在 zhongcao 自己的 Electron / Tauri 壳里初始化 lime-desktop-platform 的 contracts、host-core、UI modules 和 adapter。
- 通过 agentapp 标准 Host Bridge / Capability SDK adapter 读取非敏感 Host Snapshot。
- 只能用公开 Capability SDK 调用平台 capability，不直接访问平台主进程、Electron 对象、Node 文件系统或平台内部 service。
- capability 调用必须带业务 action 和 payload，失败要显示 blocked / needs-setup，不允许伪成功。
- 产品内 agentapp package 的安装、更新、禁用和卸载必须使用 `targetKind: agentapp-package` 的平台语义，不写 Product App 安装包状态。

业务侧最低交付：
- 页面能显示 Host Snapshot、appId、entryKey、会话状态、billing 状态和模型设置版本。
- 产品内应用中心能展示 GEO 草稿 Agent、STREAM 预检、Schema 增强、发布 readiness 等 agentapp 标准目录项，并标明 installMode、entry、capability 和 readiness。
- 页面能展示 STREAM 五维、Schema JSON-LD、发布 readiness。
- window.zhongcao.getWorkspaceSnapshot() 能返回 drafts、generationTasks、runtimeEvents。
- window.zhongcao.invokeCapability(...) 能通过 Capability SDK 调用 lime.modelSettings，并把生成任务记录为 succeeded / blocked。
- window.zhongcao.openPlatformIntent(...) 能请求打开平台设置入口，例如 model-settings。
- 未连接 host-core / adapter / Capability SDK 时，页面必须显示可诊断的 blocked 或 dev projection 状态。

验证要求：
- 在 zhongcao 仓库运行 npm run typecheck / npm run build / 可用 smoke。
- 在 lime-desktop-platform 仓库运行 npm run typecheck、文档构建和平台自己的中性 conformance smoke。
- 不要求 lime-desktop-platform smoke 安装或启动 lime.zhongcao。

不要改 lime-desktop-platform 的平台契约，除非先同步更新：
- src/shared/types.ts
- packages/contracts/src/index.ts
- src/main/ipc.ts
- src/preload/index.ts
- docs/v1/host-contracts.md
```

## 接入验收

- `zhongcao` 能作为独立 Product App 启动，并实现 agentapp 标准轻宿主/应用中心。
- `zhongcao` 产品内应用中心能展示和运行种草日记相关 AI Agent App / 工作流能力。
- readiness 能根据 OAuth、模型设置、billing 和 host capability 正确区分 `ready`、`needs-setup`、`blocked`。
- 业务窗口能通过 agentapp 标准 Host Bridge / Capability SDK adapter 消费宿主投影。
- `ZHONGCAO_MANIFEST.installMode` 必须是 `standalone`。
