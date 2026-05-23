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
| 安装 App | 下载、校验、投影、写入本地安装记录 | 应用中心显示安装进度 | `blocked` / `needs-setup` |
| 启动 App | 做 readiness、初始化 Host Bridge、注入 snapshot | App 进入运行页 | 不能伪装成成功 |
| 启动 runtime-backed App | 拉起业务 Electron/Tauri 进程、注入 Host Snapshot 和 runtime bridge 描述 | 业务窗口打开并显示平台投影 | 构建缺失时返回 `needs-setup` |
| 切换 App | 保持共享设置不变，只切换当前 App 投影 | 当前入口和状态切换 | 入口禁用或阻断 |
| 更新 App | 检查新版本、下载、切换、保留旧版本回退面 | 显示更新状态 | `update-failed` |
| 卸载 App | 停止 runtime-backed 进程、移除安装记录、清理 runtime snapshot | App 回到未安装 / 待安装状态 | 未安装时返回 blocked 结果 |
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

### 3.2 App 安装

1. 选择应用。
2. 获取 manifest 和发布元数据。
3. 下载并校验包体。
4. 生成 projection。
5. 做 readiness 判断。
6. 允许启动或显式阻断。

### 3.3 App 启动

1. 检查安装状态。
2. 初始化 Host Bridge。
3. 注入 host snapshot。
4. 监听 capability 调用和事件。
5. 将运行状态写入本地记录。

### 3.4 runtime-backed 启动

1. 通过 appId 解析业务 App 本地 runtime 目录。
2. 检查 `out/main/index.js` 等构建产物是否存在。
3. 创建 127.0.0.1 runtime bridge session，生成短期 token。
4. 通过 `LIME_HOST_SNAPSHOT` 注入非敏感 Host Snapshot。
5. 通过 `LIME_RUNTIME_BRIDGE` 注入 `endpoint`、`token`、`appId`、`entryKey` 和过期时间。
6. 业务 App 只能通过 runtime bridge 调用平台 capability，不直接访问平台主进程。
7. 平台退出、禁用或卸载时关闭子进程并撤销 session。

### 3.5 设置同步

1. 共享设置从本地用户配置加载。
2. 云端默认值只做投影，不覆盖最终选择。
3. 运行中的 App 只接收快照更新，不直接操作本地设置事实。

### 3.6 平台变化事件

1. 任何会改变平台状态的 IPC 操作完成后发出 `platform:changed`。
2. 事件载荷包含 `reason`、`appId`、`entryKey`、`timestamp` 和最新 `bootstrap`。
3. 业务 App 通过 `window.limeDesktop.platform.onChanged(...)` 订阅。
4. 业务 App 收到事件后重新计算自身 UI/readiness，不写回平台事实源。

### 3.7 App 卸载

1. 校验 app 是否存在于本地安装记录。
2. 停止对应 runtime-backed 子进程。
3. 撤销 runtime bridge session。
4. 移除 `.lime-desktop/installed-apps.json` 中的安装记录。
5. 移除 `.lime-desktop/runtime-snapshots.json` 中对应 app 的 runtime snapshot。
6. 重新生成 projection，状态回到 `needs-setup`。
7. 第一阶段默认 `keepData: true`，业务数据安全删除必须另走显式确认流程。

## 4. 约束

- 宿主不能偷偷改写业务数据。
- 业务 App 不能绕过 Host Bridge 直连宿主内部实现。
- runtime-backed App 不能绕过 runtime bridge 直连主进程、Electron 对象或 Node 文件系统。
- 失败状态必须留痕。
- 本地和云端权威边界不能互换。
- Tauri 适配只能替换宿主实现，不改契约语义。
