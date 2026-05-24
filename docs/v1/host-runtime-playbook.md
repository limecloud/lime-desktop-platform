---
title: 宿主运行手册
status: draft
repo: lime-desktop-platform
---

# 宿主运行手册

## 1. 用途

这份文档描述平台在真实运行中的常见动作，帮助开发者把“概念”落到“可执行流程”。

## 2. 常见运行场景

| 场景 | 平台负责 | 用户看到什么 | 失败时怎么呈现 |
| --- | --- | --- | --- |
| 首次启动 | 读取品牌 bootstrap、会话、目录和设置 | 进入壳层首页 | `needs-setup` / 登录页 / 品牌待配置 |
| Product App 自身更新 | 提供 release metadata 投影、更新入口和更新状态；实际替换由产品安装器 / Electron updater / Tauri updater 执行 | 系统更新提示或产品更新页 | `update-failed`，保留当前版本 |
| 安装 agentapp package | 下载、校验、投影、写入 package installed catalog | 应用中心显示安装进度 | `blocked` / `needs-setup` |
| 启动 agentapp entry | 做 readiness、初始化 Host Bridge、注入 snapshot | 进入对应入口或运行页 | 不能伪装成成功 |
| 启动 agentapp 宿主 adapter | 解析 agentapp package、注入 Host Snapshot、建立 Host Bridge；reference fixture 可建立 runtime bridge | Product App 或 reference shell 显示宿主投影 | 构建缺失或 adapter 缺失时返回 `needs-setup` |
| 切换 App | 保持共享设置不变，只切换当前 App 投影 | 当前入口和状态切换 | 入口禁用或阻断 |
| 更新 agentapp package | 检查 package 新版本、下载、校验、切换、保留旧版本回退面 | 显示 package 更新状态 | `update-failed`，保留旧 package |
| 卸载 reference fixture | 停止 reference runtime 进程、移除 fixture 安装记录、清理 runtime snapshot | fixture 回到未安装 / 待安装状态 | 未安装时返回 blocked 结果 |
| 修改模型设置 | 更新默认模型、provider 和覆盖规则 | 设置页即时反映 | 提示待补齐 / 待配置 |
| OAuth 登录 | 更新租户身份和会话 | 显示已登录状态 | 登录失败回到登录页 |
| OEM 变更 | 切换品牌、logo、主题和文案投影 | 壳层外观变化 | 品牌配置缺失 |
| 充值 / 订阅 | 投影套餐、余额和状态 | 显示租户级账单状态 | `needs-payment` |

## 3. 典型流程

### 3.1 首次启动

1. 读取工作区和用户级配置。
2. 拉取或恢复品牌、OAuth、应用目录和账单投影。
3. 初始化应用中心和宿主状态栏。
4. 如果缺少关键配置，展示恢复路径而不是空白页。

### 3.2 Agent App Package 安装

1. 选择 agentapp package 或入口。
2. 获取 manifest 和发布元数据。
3. 下载并校验包体。
4. 生成 projection。
5. 做 readiness 判断。
6. 允许打开入口、允许 capability 调用或显式阻断。

### 3.3 Agent App Entry 启动

1. 检查 package 安装状态。
2. 初始化 Host Bridge。
3. 注入 host snapshot。
4. 监听 capability 调用和事件。
5. 将运行状态写入本地记录。

### 3.4 agentapp 宿主 adapter 启动

1. Product App 或平台应用中心先按 `agentapp` 标准解析 package、install mode、entries、projection 和 readiness。
2. adapter 获取非敏感 Host Snapshot，包含 host kind、entry、workspace、会话、模型、billing 和 OEM 投影。
3. adapter 建立 Host Bridge；reference shell / smoke fixture 可退回 127.0.0.1 runtime bridge session。
4. 业务 App 只能通过 Host Bridge / Capability SDK 调用宿主 capability，不直接访问宿主主进程；reference fixture 才允许通过 runtime bridge 联调。
5. Product App 可以实现自己的 agentapp 应用中心，但只能消费 Host Snapshot 和 capability 裁决。
6. Product App 内部 package directory 是 current 路径；平台 `samples/platform-conformance` 和单文件 catalog 只用于开发态 fixture 或兼容 fallback。
7. reference shell 通过 `LIME_HOST_SNAPSHOT` 和 `LIME_RUNTIME_BRIDGE` 注入本地构建产物，仅用于联调和验证。
8. 平台退出、禁用或卸载 reference fixture 时关闭子进程并撤销 session。

### 3.5 设置同步

1. 共享设置从本地用户配置加载。
2. 云端默认值只做投影，不覆盖最终选择。
3. 运行中的 App 只接收快照更新，不直接操作本地设置事实。

### 3.6 平台变化事件

1. 任何会改变平台状态的 IPC 操作完成后发出 `platform:changed`。
2. 事件载荷包含 `reason`、`appId`、`entryKey`、`timestamp` 和最新 `bootstrap`。
3. 业务 App 通过 `window.limeDesktop.platform.onChanged(...)` 订阅。
4. 业务 App 收到事件后重新计算自身 UI/readiness，不写回平台事实源。

### 3.7 Reference Fixture 卸载

1. 校验 app 是否存在于本地安装记录。
2. 停止对应 reference runtime 子进程。
3. 撤销 runtime bridge session。
4. 移除 `.lime-desktop/installed-apps.json` 中的安装记录。
5. 移除 `.lime-desktop/runtime-snapshots.json` 中对应 app 的 runtime snapshot。
6. 重新生成 projection，状态回到 `needs-setup`。
7. 第一阶段默认 `keepData: true`，业务数据安全删除必须另走显式确认流程。

### 3.8 limecore catalog 与 agentapp package 更新

1. 平台启动或检查更新时，通过 `LIMECORE_CATALOG_URL` 或 `LIMECORE_BASE_URL` 拉取 catalog。
2. 未配置或同步失败时，回退到中性 `samples/platform-conformance`，并在 diagnostics 的 `controlPlane` 中标记来源和错误。
3. catalog 中的 `latestVersion` 高于本地安装记录时生成 `UpdateCandidate`。
4. 有 `releaseArtifact` 时，下载到 `.lime-desktop/app-artifacts/{appId}/{version}/`。
5. 下载后必须校验 `sha256`，可选校验 `sizeBytes`。
6. 只有已校验 artifact 才能应用更新；缺 artifact 或 hash 不匹配返回 `blocked`。
7. sample fallback 只能做开发态 projection，不能伪装成真实 release 下载成功。

### 3.9 Product App 自身更新

1. Product App updater 检查 `limecore` 的 Product App release metadata。
2. 有新版本时，由 Electron updater、Tauri updater、系统安装器或产品自有安装器下载并校验安装包。
3. 替换的是 Product App 安装包，不是 agentapp package installed catalog。
4. `lime-desktop-platform` 作为 Product App 依赖随安装包升级，不在运行时维护单独的平台模块安装表。
5. 更新失败必须保留当前可启动版本，并保留本地 workspace、OAuth 投影、模型设置和 billing 投影。

## 4. 约束

- 宿主不能偷偷改写业务数据。
- 业务 App 不能绕过 Host Bridge 直连宿主内部实现。
- reference runtime fixture 不能绕过 runtime bridge 直连主进程、Electron 对象或 Node 文件系统。
- Product App 更新器不能写 agentapp package installed catalog；Host Runtime 也不能替换 Product App 安装包。
- 失败状态必须留痕。
- 本地和云端权威边界不能互换。
- Tauri 适配只能替换宿主实现，不改契约语义。
