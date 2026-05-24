---
title: zhongcao 独立产品接入说明
status: draft
repo: lime-desktop-platform
---

# zhongcao 独立产品接入说明

## 1. 定位

`zhongcao` 是独立 Product App，仓库位于 `/Users/coso/Documents/dev/ai/limecloud/zhongcao`。它不属于 `lime-desktop-platform` 的运行时 catalog，不是平台 App 的子 App，也不应该在平台仓库里保留同名可运行样板。

`lime-desktop-platform` 只提供可复用底座：contracts、host-core、公共 UI modules、Electron adapter、Tauri adapter、Host Snapshot、Capability SDK、公共设置、OAuth、billing、OEM、更新和平台级应用中心。`zhongcao` 在自己的 Electron / Tauri 壳中引入这些能力。

平台仓库内置运行时 fixture 只允许使用中性 `samples/platform-conformance`。任何真实产品名样板只能作为 `external-product-reference` 文档参照，不能进入平台 App 的应用中心。

## 2. zhongcao 应该拥有的内容

- 独立 Electron / React / TypeScript 桌面壳。
- 自己的业务页面：日记工作台、选题计划、素材库、发布计划、诊断。
- 自己的业务 workspace 和本地 CRUD。
- 产品内 agentapp 应用中心，用来管理 GEO 草稿生成、STREAM 预检、Schema 增强、发布 readiness 等种草日记 AI Agent App。
- `agentapps/*/APP.md` + `app.manifest.json` package 事实源；`agentapps/catalog.json` 只能作为 compat fallback。

`zhongcao` 不拥有：

- OAuth token 管理。
- 全局模型 provider 设置。
- billing 账本或支付状态事实源。
- OEM 权威配置。
- 平台级应用中心安装表。
- 平台更新器和 release artifact 校验事实源。

## 3. 接入方式

```mermaid
flowchart TB
  subgraph Platform[lime-desktop-platform packages]
    Contracts[contracts]
    HostCore[host-core]
    UI[@limecloud/desktop-platform-react]
    Adapter[Electron / Tauri adapter]
  end

  subgraph Zhongcao[zhongcao 独立 App]
    Shell[Product Shell]
    Business[业务页面]
    AgentCenter[产品内 agentapp 应用中心]
    Workspace[业务 workspace]
  end

  Contracts --> Shell
  HostCore --> Shell
  UI --> Shell
  Adapter --> Shell
  Shell --> Business
  Shell --> AgentCenter
  Business --> Workspace
  AgentCenter --> HostCore
  Business --> HostCore
```

## 4. 推荐启动顺序

```text
用户打开 zhongcao 独立 App
-> zhongcao main/preload 初始化平台 adapter
-> adapter 初始化 host-core
-> host-core 同步 limecore catalog、session、billing、OEM、release metadata
-> zhongcao renderer 接收 Host Snapshot、Capability SDK handles 和 @limecloud/desktop-platform-react 模块清单
-> zhongcao 产品内应用中心扫描 agentapps/* package
-> 按 agentapp 标准生成业务 Agent App projection / readiness
-> zhongcao 平台模块页挂载 @limecloud/desktop-platform-react 的 PlatformModuleOutlet
-> 业务页面通过 Capability SDK 调用 lime.modelSettings、lime.billing 等平台能力
-> 需要设置、登录、充值或更新时发送 PlatformNavigationIntent
```

## 5. 最小 manifest 建议

`zhongcao` 自身是独立产品，正式 install mode 应为 `standalone`：

```json
{
  "appId": "lime.zhongcao",
  "displayName": "种草日记",
  "version": "0.1.0",
  "installMode": "standalone",
  "entries": [
    { "key": "diary-workbench", "kind": "workflow", "route": "/" },
    { "key": "topic-plan", "kind": "page", "route": "/topics" },
    { "key": "materials", "kind": "page", "route": "/materials" },
    { "key": "publishing", "kind": "page", "route": "/publishing" },
    { "key": "diagnostics", "kind": "diagnostics", "route": "/diagnostics" }
  ],
  "requires": {
    "sdkVersion": "1.0.0",
    "capabilities": [
      "lime.cloudSession",
      "lime.modelSettings",
      "lime.branding",
      "lime.billing",
      "lime.appUpdates",
      "lime.diagnostics"
    ],
    "hostKinds": ["electron", "tauri"]
  }
}
```

## 6. 验收建议

- `zhongcao` 可独立启动，不依赖平台 App 从应用中心拉起。
- `ZHONGCAO_MANIFEST.installMode` 为 `standalone`。
- `zhongcao` 从 `agentapps/*/APP.md` + `app.manifest.json` 读取种草日记相关 AI Agent App，并把左侧“Agent 应用中心”直接挂载到 `@limecloud/desktop-platform-react` 的 `PlatformModuleOutlet(moduleKey="app-center")`。
- 平台模块页同样实际挂载 `@limecloud/desktop-platform-react` 的 `PlatformModuleOutlet`；平台应用中心、公共设置、运行和 Host Bridge 页面来自平台包。Product App 只实现 bootstrap adapter、action handler 和独立运行时的本地投影状态更新。
- ready / needs-setup / blocked 能根据 Host Snapshot、模型设置、会话和 billing 投影正确区分。
- 业务页面不实现 OAuth、模型设置、billing、OEM 或更新设置页，只发送 `PlatformNavigationIntent`。
- 未连接 host-core / adapter 时显示 `dev-projection` 或 `blocked`，不伪造成功。
- 接入平台包时优先通过公开 contracts、`@limecloud/desktop-platform-react` 和 adapter，不直接访问平台内部 service 或 renderer 内部文件。

## 7. 治理分类

- `current`：`zhongcao` 独立 Product App、产品内 agentapp package directory、平台公开 contracts、`@limecloud/desktop-platform-react`、host-core / adapter。
- `compat`：`agentapps/catalog.json` fallback、开发态 Host Snapshot fallback。
- `deprecated`：把真实产品名样板放在平台仓库 `samples/*` 并进入运行时 catalog。
- `dead`：平台 App 内置 `lime.zhongcao` 同名 App，或生产路径由平台应用中心托管启动 `zhongcao` 子进程。
