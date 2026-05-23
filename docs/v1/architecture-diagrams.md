---
title: 架构与流程图
status: draft
repo: lime-desktop-platform
---

# 架构与流程图

## 1. 设计结论

平台的核心是四层：桌面壳层、平台底座、云端控制面、执行标准。`content-studio`、`zhongcao` 和后续 OEM App 只消费平台，不各自重造登录、模型设置、应用中心和更新逻辑。

## 2. 总体架构图

```mermaid
flowchart TB
  User[用户] --> Shell[桌面壳层]

  subgraph Desktop[lime-desktop-platform]
    PlatformCore[平台核心]
    AppCenter[应用中心]
    ModelSettings[模型设置]
    Auth[OAuth / 会话]
    OEM[OEM / 品牌]
    Billing[充值 / 订阅]
    Update[更新 / 分发]
    Runtime[Agent App Host Runtime]
    Bridge[Host Bridge]
    LocalStore[本地状态 / 缓存]
  end

  subgraph Cloud[limecore]
    Catalog[应用目录 / 发布元数据]
    Identity[OAuth / 租户身份]
    BillingCloud[充值 / 套餐]
    OEMCloud[OEM / 分发配置]
  end

  subgraph Apps[业务 App]
    CS[content-studio]
    ZC[zhongcao]
    OEMApp[OEM App]
  end

  subgraph RuntimeStd[执行标准]
    AR[agentruntime]
  end

  Shell --> PlatformCore
  PlatformCore --> AppCenter
  PlatformCore --> ModelSettings
  PlatformCore --> Auth
  PlatformCore --> OEM
  PlatformCore --> Billing
  PlatformCore --> Update
  PlatformCore --> Runtime
  PlatformCore --> Bridge
  PlatformCore --> LocalStore

  AppCenter --> Catalog
  Auth --> Identity
  Billing --> BillingCloud
  OEM --> OEMCloud
  Runtime --> AR

  PlatformCore --> CS
  PlatformCore --> ZC
  PlatformCore --> OEMApp
```

## 3. 启动时序图

```mermaid
sequenceDiagram
  autonumber
  participant User as 用户
  participant Shell as 桌面壳层
  participant Platform as 平台底座
  participant Cloud as limecore
  participant Host as Host Runtime
  participant App as 业务 App

  User->>Shell: 打开桌面 App
  Shell->>Platform: 初始化平台
  Platform->>Cloud: 拉取 bootstrap、目录、OAuth、OEM、billing
  Cloud-->>Platform: tenant / branding / auth / catalog / billing
  Platform->>Host: 校验包、解析 manifest、生成 projection
  Host-->>Platform: ready / needs-setup / blocked

  alt ready
    Platform->>App: 启动 App UI
    App->>Platform: host:ready
    Platform-->>App: snapshot / theme / locale / workspace
    App->>Host: capability invoke
    Host-->>App: result / event stream
  else needs-setup or blocked
    Platform-->>User: 展示修复动作和阻断原因
  end
```

## 4. 安装与更新流程图

```mermaid
flowchart TD
  Start([选择应用]) --> Catalog[拉取云端目录]
  Catalog --> Download{是否已安装?}
  Download -- 否 --> Fetch[下载包]
  Download -- 是 --> Verify[校验 packageHash / manifestHash]
  Fetch --> Verify
  Verify --> Project[projection]
  Project --> Ready{readiness 通过?}
  Ready -- 否 --> Fix[展示 needs-setup / blocked]
  Fix --> Project
  Ready -- 是 --> Activate[激活入口]
  Activate --> Launch[启动 App]
  Launch --> Run[运行中]
  Run --> UpdateCheck[检查更新]
  UpdateCheck --> Update{有新版本?}
  Update -- 是 --> Upgrade[下载并升级]
  Update -- 否 --> End([保持运行])
  Upgrade --> Verify
```

## 5. OAuth / OEM / 充值同步图

```mermaid
flowchart LR
  Cloud[云端控制面] --> OAuth[OAuth / 会话]
  Cloud --> OEMCfg[OEM / 品牌配置]
  Cloud --> Billing[充值 / 订阅]

  OAuth --> LocalAuth[本地安全缓存]
  OEMCfg --> LocalBrand[本地品牌投影]
  Billing --> LocalBilling[本地只读状态]

  LocalAuth --> Shell
  LocalBrand --> Shell
  LocalBilling --> Shell
```

## 6. 启动时序图

```mermaid
sequenceDiagram
  autonumber
  participant User as 用户
  participant Shell as 桌面壳层
  participant Core as 平台核心
  participant Cloud as limecore
  participant Host as Host Runtime
  participant App as 业务 App

  User->>Shell: 打开桌面 App
  Shell->>Core: 初始化平台
  Core->>Cloud: 拉取 bootstrap、会话、目录、OEM、billing
  Cloud-->>Core: tenant / branding / auth / catalog / billing
  Core->>Host: 校验包、解析 manifest、生成 projection
  Host-->>Core: ready / needs-setup / blocked

  alt ready
    Core->>App: 启动 App UI
    App->>Host: host:ready
    Host-->>App: snapshot / theme / locale / workspace
    App->>Host: capability invoke
    Host-->>App: result / event stream
  else needs-setup or blocked
    Core-->>User: 展示修复动作和阻断原因
  end
```

## 7. Host Bridge 生命周期图

```mermaid
flowchart TD
  Renderer[Renderer UI] --> Preload[Preload Bridge]
  Preload --> Main[Electron Main]
  Main --> Runtime[Host Runtime]
  Runtime --> AppView[App View]

  AppView --> Runtime
  Runtime --> Main
  Main --> Preload
  Preload --> Renderer

  Runtime --> Snapshot[Host Snapshot]
  Runtime --> Events[事件流]
  Snapshot --> Renderer
  Events --> Renderer
```

## 8. 适配关系

```mermaid
flowchart LR
  Electron[ELECTRON] --> Contract[共享契约]
  Tauri[TAURI] --> Contract
  Contract --> Manifest[manifest]
  Contract --> Projection[projection]
  Contract --> Readiness[readiness]
  Contract --> Bridge[Host Bridge]
```

## 9. 约束

- 图里的所有状态都必须能落到 `src/shared/types.ts`。
- 任何 UI 行为都要能回到 manifest / projection / readiness / bridge 之一。
- Electron 和 Tauri 可以不同实现，但不能不同语义。
- blocked、needs-setup 和 ready 不能在图里被画成同一个状态。
