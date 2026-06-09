---
title: 实施计划
status: draft
repo: lime-desktop-platform
---

# 实施计划

## 1. 当前判断

这个仓库一开始就应该按“平台底座”组织，而不是按单一 App 组织。最小可交付形态是：Electron 宿主 + 平台核心 + 应用中心 + 设置中心 + Host Runtime + 云端控制面对接。

## 2. 建议仓库结构

```text
docs/v1/
src/main/
src/preload/
src/renderer/
src/shared/
packages/contracts/
packages/host-core/
packages/electron-adapter/
packages/tauri-adapter/
samples/platform-conformance/
```

说明：

- `packages/contracts` 放 manifest、projection、readiness、bridge、platform settings、Product App settings 和 `lime.storage` capability 声明的公共类型。
- `packages/host-core` 放平台无关宿主接口、settings action handler 和 Product App 设置托管边界。
- Agent Runtime current 走 Lime App Server JSON-RPC / RuntimeCore；Electron 只实现 host-mediated bridge，不在平台仓库内新建 Pi agent 或 Claude SDK 后端。
- `packages/electron-adapter` 放 Electron 主进程、preload 和 WebView 桥接。
- `packages/tauri-adapter` 只保留后续兼容层，不阻塞 v1。
- `samples/platform-conformance` 用来承接中性 reference fixture；真实 Product App 名称只能出现在接入文档或外部仓库，不进入平台运行时 catalog。

## 3. 开发切片

### P0: 契约先行

任务：

- 定义 manifest / package identity / host profile。
- 定义 projection / readiness / bridge message。
- 定义本地存储分层。
- 定义应用中心和设置的数据模型。
- 定义 Product App 业务存储与 Product App 独特设置的边界，禁止把 `product-settings` 当业务数据库。

验收：

- 所有核心概念可写成 TypeScript 类型。
- Electron 与 Tauri 共享同一契约草案。

### P1: 平台骨架

任务：

- 建立桌面壳层。
- 建立左侧导航、顶部状态栏、底部状态栏。
- 建立应用中心空页面和设置页壳。
- 建立本地状态存储和安全配置存储。

验收：

- 能打开一个可用壳层。
- 能展示品牌和租户信息。
- 能切换到应用中心和设置中心。

### P2: 应用中心

任务：

- 接云端目录。
- 接本地 installed catalog。
- 做安装、更新、启用、禁用。
- 做应用详情和 blocked 处理。

验收：

- 能看到全部 / 已安装 / 需要处理。
- 能对单个 App 做安装与启动。

### P3: Host Runtime

任务：

- 解析 manifest。
- 生成 projection。
- 运行 readiness。
- 初始化 Host Bridge。
- 接 capability adapter。

验收：

- App 只有在 ready 后才能启动。
- blocked 不可伪装成成功。

### P4: 共享设置

任务：

- 模型设置页。
- provider 设置保存链路。
- OAuth / 会话页。
- OEM / 品牌页。
- 充值 / 订阅页。
- Product App 独特设置扩展入口和 `appId + namespace + scope` 存储。
- 明确 Product App 独特设置只保存小型 JSON 设置，不保存草稿、历史记录、客户事实或业务表。

验收：

- 设置能同步到平台壳层。
- 云端状态和本地状态边界清晰。
- 平台基础设置不能被业务 App 私有化复制。

### P5: Agent Runtime / App Server Bridge

任务：

- 对齐 `/Users/coso/Documents/dev/ai/aiclientproxy/lime/internal/roadmap/appserver` 的 Lime App Server JSON-RPC method mapping。
- 落 `AppServerRuntimeService`、`lime.agent` capability、bridge profile、App Server JSON-RPC client、配置化 stdio sidecar lifecycle 和 fail-closed normalized event。
- 用平台 provider 设置、OAuth、billing 和权限投影裁决 readiness。
- 把平台模型设置解析成 `AgentRuntimeContext`，provider / model 通过 `agentSession/turn/start.params.runtimeOptions.providerPreference` / `modelPreference` 传给 RuntimeCore，非敏感上下文通过 `runtimeOptions.hostOptions.desktopPlatformRuntimeContext` 传递。
- 旧 `lime.agentExecution` 仅作为 compat alias；Pi agent / Claude SDK backend 路线和旧 `AgentExecutionService` 实现标记为 dead，不再继续实现或保留代码入口。

验收：

- Product App 只通过 Capability SDK 调用 `lime.agent`。
- 缺模型、缺 OAuth、缺 billing、App Server client 未配置或未连接都返回 `needs-setup` 或 `blocked`。
- 生产路径不能回退 mock backend、Pi agent 或 Claude SDK。
- Electron 和 Tauri 都可以用同一套 JSON-RPC contract。
- packaged resources manifest 解析、sha256 校验和 mock backend 阻断已有单测；packaged-resource staging sidecar smoke 已通过，external fixture event-stream smoke 已验证 `message.delta` / `turn.completed` 通过真实 App Server JSON-RPC `agentSession/event` 推送到客户端，并验证同一 session 的 `agentSession/read` read model 能读回本轮 turn 和用户消息。Electron packaged artifact smoke 和真实 provider / RuntimeBackend live streaming 单独作为后续验收。

### P6: 首批 App 接入与 fixture

任务：

- 编写 `content-studio` 和 `zhongcao` 独立 Product App 接入文档。
- 用 `samples/platform-conformance` 验证 reference fixture。
- 验证相同平台底座下的不同 Product App 消费方式。

验收：

- `content-studio`、`zhongcao` 能按独立 Product App 消费平台能力。
- `samples/platform-conformance` 能作为 fixture 安装、启动、更新和被设置。
- 业务逻辑不需要重写平台能力。

### P6.5: Product App Storage

任务：

- 将 `lime.storage` 从 capability 声明推进到宿主最小实现。
- 当前桌面端先使用宿主管理的 workspace scope JSON document 后端，按 `appId + namespace + documentId` 隔离。
- 后续再升级 per-app SQLite，支持 app storage manifest、schema、migration、索引、备份清理和审计事件。
- Product App 只能通过 Capability SDK 读写自己的 namespace，不能拿到宿主 DB handle 或内部路径。

验收：

- 声明 `lime.storage` 的 App 能通过 `read` / `write` / `list` / `delete` 读写 workspace document。
- storage runtime event 不记录业务 value，凭证类 namespace 被阻断。
- 后续 storage manifest 可验证，migration 可重放；失败时不破坏已有业务数据。
- `product-settings` 仍只保存轻量设置，不承接草稿、历史记录、客户事实或业务表。
- `product-settings` 阻断凭证、token、API Key 和 OAuth 类 namespace / key；这类数据只能走 Credential Broker。

### P7: Tauri 兼容层

任务：

- 把 Host Bridge 协议抽成可跨宿主层。
- 复用 App Server JSON-RPC bridge profile、sidecar lifecycle contract 和 Host Bridge / Capability SDK contract。
- 提供 Tauri adapter 草案。
- 补充协议测试。

验收：

- 核心契约不依赖 Electron。
- Tauri 只需要换 adapter，不需要重写平台协议。

## 4. 验证策略

### 4.1 低层

- 类型检查
- 契约测试
- projection 测试
- readiness 测试
- bridge 消息测试
- agent runtime event schema 测试
- App Server JSON-RPC bridge profile / fail-closed 测试

### 4.2 中层

- 应用中心安装/更新测试
- 设置同步测试
- OAuth 登录/退出测试
- billing / OEM 状态投影测试
- AppServerRuntimeService blocked / needs-setup / provider readiness 测试
- Product App 设置 namespace 读写测试

### 4.3 高层

- Product App 接入文档审计
- `samples/platform-conformance` fixture 运行测试
- 开启/禁用/升级完整链路测试
- App Server JSON-RPC bridge smoke
- Product App 设置扩展保存 smoke

## 5. 风险控制

- 先定协议，再写 UI。
- 先做平台能力，再接业务 App。
- 云端控制面只做权威数据，不把逻辑下沉到本地壳。
- 不让单个 App 复制一套登录、计费和品牌实现。

## 6. 首个代码切片

第一刀不要先做业务页面，而要把平台骨架搭起来：

1. `src/shared/types.ts`
2. `src/main/index.ts`
3. `src/main/ipc.ts`
4. `src/preload/index.ts`
5. `src/renderer/src/main.tsx`
6. `src/renderer/src/App.tsx`
7. `src/renderer/src/components/`
8. `src/main/services/`

目标是先让平台壳层、应用中心、设置中心和开发者页能跑起来，再往里填具体能力。

## 7. 建议目录

```text
src/
  main/
    index.ts
    ipc.ts
    services/
  preload/
    index.ts
  renderer/
    src/
      App.tsx
      main.tsx
      components/
      pages/
      styles/
  shared/
    types.ts
    contracts/
docs/
  v1/
```

说明：

- `shared` 只放跨进程协议和稳定类型。
- `main` 只放宿主和本地事实源。
- `renderer` 只放界面和交互。
- `docs` 是项目事实源，不是临时笔记。

## 8. 验证顺序

1. 先验证类型和契约。
2. 再验证壳层和路由。
3. 再验证应用中心和设置中心。
4. 再验证 manifest、projection 和 readiness。
5. 再验证 Host Bridge 和 App 启动链路。
6. 最后验证 Product App 接入文档和 `samples/platform-conformance` fixture。

## 9. 里程碑

### P0

- 文档完整。
- 契约完整。
- 目录结构完整。

### P1

- 壳层可启动。
- 应用中心可浏览。
- 设置中心可打开。

当前代码切片已经覆盖：

- Electron 主进程入口：`src/main/index.ts`
- IPC 注册：`src/main/ipc.ts`
- 本地状态服务：`src/main/services/platformStore.ts`
- 平台编排服务：`src/main/services/platformService.ts`
- Preload 桥：`src/preload/index.ts`
- React 壳层：`src/renderer/src/App.tsx`
- 样板目录：`src/main/services/seedCatalog.ts`

### P2

- manifest 和 projection 可读。
- readiness 可判断。
- blocked 可显式展示。

### P3

- 首个 App 可接入。
- reference fixture 可证明第二个 Product App 复用路径。

### P4

- Electron 适配稳定。
- Tauri 适配可以按同协议推进。
