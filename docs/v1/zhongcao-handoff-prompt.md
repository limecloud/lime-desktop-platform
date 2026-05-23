---
title: zhongcao 开发交接提示词
status: draft
repo: lime-desktop-platform
---

# zhongcao 开发交接提示词

把下面提示词交给另一个开发进程，用于继续开发 `/Users/coso/Documents/dev/ai/limecloud/zhongcao`。

```text
你现在开发的是 Lime 组织下的 zhongcao 业务 App，不是平台底座。

平台事实源：
- 平台仓库：/Users/coso/Documents/dev/ai/limecloud/lime-desktop-platform
- 平台契约包：@limecloud/desktop-platform-contracts
- appId：lime.zhongcao
- 默认入口：diary-workbench
- manifest 样板：lime-desktop-platform/samples/zhongcao/manifest.example.json
- 接入指南：lime-desktop-platform/docs/v1/zhongcao-integration.md

硬性边界：
- 不要在 zhongcao 里重做 OAuth、模型设置、OEM、billing、应用更新和平台安装表。
- 不要把平台会话、模型配置、billing 账本或 OEM 权威状态持久化成 zhongcao 的业务事实源。
- zhongcao 只负责种草日记、选题计划、素材、草稿、Schema JSON-LD、发布计划、STREAM 五维预检和业务诊断。
- 外部发布第一阶段只做 readiness 和人工确认，不自动触发渠道发布。

运行态接入：
- 通过 LIME_HOST_SNAPSHOT 读取非敏感 Host Snapshot。
- 通过 LIME_RUNTIME_BRIDGE 读取 runtime bridge descriptor。
- 只能用 runtime bridge 调用平台 capability，不直接访问平台主进程、Electron 对象、Node 文件系统或平台内部 service。
- 支持的 runtime bridge 路径：
  - POST /snapshot
  - POST /capability/invoke
- capability 调用必须带业务 action 和 payload，失败要显示 blocked / needs-setup，不允许伪成功。

业务侧最低交付：
- 页面能显示 runtime projection、appId、entryKey、会话状态、billing 状态和模型设置版本。
- 页面能展示 STREAM 五维、Schema JSON-LD、发布 readiness。
- window.zhongcao.getWorkspaceSnapshot() 能返回 drafts、generationTasks、runtimeEvents。
- window.zhongcao.invokeCapability(...) 能通过 runtime bridge 调用 lime.modelSettings，并把生成任务记录为 succeeded / blocked。
- 未收到 LIME_HOST_SNAPSHOT 或 LIME_RUNTIME_BRIDGE 时，页面必须显示可诊断的 blocked 状态。

验证要求：
- 在 zhongcao 仓库运行 npm run build，确保 out/main/index.js 存在。
- 回到 lime-desktop-platform 仓库运行 npm run verify:local。
- Electron smoke 必须通过，并包含：
  - hasZhongcaoProjection: true
  - zhongcaoLaunched: true
  - zhongcaoRuntimeBridge: true
  - zhongcaoLifecycle: true

不要改 lime-desktop-platform 的平台契约，除非先同步更新：
- src/shared/types.ts
- packages/contracts/src/index.ts
- src/main/ipc.ts
- src/preload/index.ts
- docs/v1/host-contracts.md
```

## 接入验收

- `lime.zhongcao` 能从平台应用中心安装和启动。
- readiness 能根据 OAuth、模型设置、billing 和 host capability 正确区分 `ready`、`needs-setup`、`blocked`。
- 业务窗口能通过 `LIME_HOST_SNAPSHOT` 和 `LIME_RUNTIME_BRIDGE` 消费平台投影。
- 平台卸载 `lime.zhongcao` 后，安装记录和 runtime snapshot 被清理，业务数据默认保留。
