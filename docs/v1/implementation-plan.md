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
packages/host-runtime/
packages/electron-adapter/
packages/tauri-adapter/
samples/content-studio/
samples/zhongcao/
```

说明：

- `packages/contracts` 放 manifest、projection、readiness、bridge 和 store 的公共类型。
- `packages/host-runtime` 放平台无关宿主逻辑。
- `packages/electron-adapter` 放 Electron 主进程、preload 和 WebView 桥接。
- `packages/tauri-adapter` 只保留后续兼容层，不阻塞 v1。
- `samples/*` 用来承接首批 App 接入样板。

## 3. 开发切片

### P0: 契约先行

任务：

- 定义 manifest / package identity / host profile。
- 定义 projection / readiness / bridge message。
- 定义本地存储分层。
- 定义应用中心和设置的数据模型。

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
- OAuth / 会话页。
- OEM / 品牌页。
- 充值 / 订阅页。

验收：

- 设置能同步到平台壳层。
- 云端状态和本地状态边界清晰。

### P5: 首批 App 接入

任务：

- 接入 `content-studio`。
- 接入 `zhongcao`。
- 验证相同壳层下的差异化入口。

验收：

- 两个 App 都能安装、启动、更新和被设置。
- 业务逻辑不需要重写平台能力。

### P6: Tauri 兼容层

任务：

- 把 Host Bridge 协议抽成可跨宿主层。
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

### 4.2 中层

- 应用中心安装/更新测试
- 设置同步测试
- OAuth 登录/退出测试
- billing / OEM 状态投影测试

### 4.3 高层

- `content-studio` 运行测试
- `zhongcao` 运行测试
- 开启/禁用/升级完整链路测试

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
6. 最后验证 `content-studio` 和 `zhongcao` 的样板接入。

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
- 第二个 App 可复用。

### P4

- Electron 适配稳定。
- Tauri 适配可以按同协议推进。
