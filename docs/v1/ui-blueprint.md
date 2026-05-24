---
title: UI 蓝图
status: draft
repo: lime-desktop-platform
---

# UI 蓝图

## 1. 成套布局

`lime-desktop-platform` 的 UI 不是营销页，也不是通用后台，而是桌面壳层 + 公共 UI modules 的组合。这些模块可以在平台 reference shell 中直接渲染，也可以被 `zhongcao`、`content-studio` 和后续 OEM Product App 挂载。

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 顶部状态栏：品牌 / 租户 / 搜索 / 更新 / 用户                      │
├───────────────┬─────────────────────────────────────────────────────┤
│ 左侧导航       │ 中间主工作区                                       │
│ 平台能力总览   │ 列表 / 卡片 / 页面 / 运行详情                      │
│ 平台应用中心   │                                                     │
│ 云端会话       │                                                     │
│ 模型设置       │                                                     │
│ 品牌 / 充值    │                                                     │
│ 更新 / 运行    │                                                     │
│ Host Bridge    │                                                     │
│ 诊断           │                                                     │
├───────────────┴─────────────────────────────────────────────────────┤
│ 底部状态栏：当前版本 / 会话 / readiness / blocked / 日志           │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. 一级页面

### 2.1 应用中心

主任务：

- 看见云端应用。
- 看见本地已安装应用。
- 看见需要处理的应用。
- 安装、更新、启用、禁用、启动。

信息结构：

- App 名称
- 来源
- 当前版本
- 状态
- 需要处理事项
- 最近更新时间
- 主操作按钮

### 2.2 应用详情

主任务：

- 看清 manifest、版本、安装模式、capability 要求。
- 看清 readiness 结果。
- 看清修复动作和阻断原因。
- 启动指定入口。

右侧面板：

- 入口列表
- capability 列表
- 权限和设置缺口
- 版本历史

### 2.3 公共 UI Modules

公共 UI modules 是平台能力的可复用 UI 事实源。Product App 不应该重写 OAuth、模型设置、充值、品牌、更新或 Host Bridge 页面，而是挂载这些模块并传入平台 bootstrap、action handlers 和 Product App manifest。

模块：

- 平台能力总览
- 平台应用中心
- 云端会话
- 模型设置
- 品牌 / OEM
- 充值 / 订阅
- 更新 / 分发
- Agent Runtime
- Host Bridge
- 诊断

实现事实源：

- 现阶段代码事实源：`src/renderer/src/platformModules.tsx`
- reference shell：`src/renderer/src/App.tsx` 只负责 shell、状态和 action handler 装配。
- 后续包形态：拆为 `@limecloud/desktop-platform-react` 或同等 workspace package，供 Product App 直接依赖。

### 2.4 运行页

运行页只做三件事：

- 展示 host snapshot。
- 展示 capability 调用和事件流。
- 展示 blocked / needs-setup / error。

### 2.5 开发者页

用于内部调试和验收：

- manifest 预览
- projection 预览
- readiness 诊断
- bridge 事件日志
- 本地安装状态

## 3. 视觉原则

- 以扫描为主，不做营销化排版。
- 操作按钮要清晰，主次分明。
- blocked 和 needs-setup 必须显眼。
- 状态标签要稳定，不靠颜色单独表达。
- 长文本不能挤压按钮和表格列。

## 4. 关键空状态

| 场景 | 文案意图 |
| --- | --- |
| 没有安装 agentapp package | 提示去应用中心安装 package。 |
| agentapp package 需要设置 | 指引补齐 OAuth / 模型 / OEM / billing。 |
| agentapp entry 被阻断 | 说明不可运行的原因。 |
| 没有更新 | 告知当前已是最新版本。 |
| 无会话 | 引导登录。 |

## 5. 路由建议

- `/apps`
- `/apps/:appId`
- `/apps/:appId/runtime`
- `/platform`
- `/platform/apps`
- `/platform/cloud-session`
- `/platform/model-settings`
- `/platform/branding`
- `/platform/billing`
- `/platform/updates`
- `/platform/runtime`
- `/platform/host-bridge`
- `/debug`

## 6. 页面颗粒度

| 页面 | 主任务 | 主按钮 | 关键状态 | 恢复路径 |
| --- | --- | --- | --- | --- |
| 应用中心 | 找到可装、已装和需要处理的 App | 安装 / 启动 | 已安装、更新可用、被阻断 | 返回应用详情或设置页 |
| 应用详情 | 读清 manifest、版本和 readiness | 启动 / 修复 | ready、needs-setup、blocked | 去设置中心或重新安装 |
| 平台能力总览 | 看到所有公共能力 readiness | 打开模块 | ready、needs-setup、blocked | 进入具体模块 |
| 云端会话 | 管理租户登录和会话投影 | 登录 / 退出 | 已登录、未登录、过期 | 回到应用中心或业务页面 |
| 模型设置 | 配置 provider 和默认模型 | 保存 / 启用 | 已配置、缺凭证、禁用 | 回到应用中心或运行页 |
| 品牌 | 查看 OEM / 品牌投影 | 刷新 / 切换 | branded、customized、unbranded | 回到业务页面 |
| 充值 | 查看订阅、余额和 entitlement | 刷新 / 充值 | active、needs-payment、suspended | 回到运行页 |
| 更新 | 管理 agentapp package 更新 | 检查 / 下载 / 应用 | 无更新、更新可用、已下载 | 回到应用中心 |
| 运行页 | 查看当前 App 的 host snapshot 和调用轨迹 | 返回 App / 重试 | 运行中、调用失败、blocked | 查看诊断页 |
| 开发者页 | 诊断 manifest、projection、bridge 和本地记录 | 导出日志 | ready、needs-setup、blocked | 复制证据或修复配置 |

## 7. 关键页面细节

### 7.1 应用中心

- 顶部显示品牌、租户、搜索、更新和用户状态。
- 左侧显示应用分类和筛选。
- 中间显示云端目录、本地安装和需要处理的条目。
- 右侧显示选中 App 的 manifest 摘要、readiness、最近更新和主动作。

### 7.2 公共 UI Modules

- 模型设置单独成页，不和 App 私有配置混在一起。
- OAuth 和 billing 必须显示租户级状态。
- OEM 设置负责品牌投影，不负责业务逻辑。
- 平台设置负责代理、语言、主题和工作区。
- Product App 只挂载这些模块，不在业务仓库重做公共页面。
- `PlatformNavigationIntent` 只负责打开模块或定位到模块，不传递 token、模型 Key、账本或 OEM 权威数据。

### 7.3 运行页

- 只展示当前 App 的 host snapshot、调用流和错误。
- blocked 和 needs-setup 必须可见。
- 不把运行页做成工程日志堆叠页。

### 7.4 开发者页

- 可查看 manifest 原文、projection 结果、readiness 计算和 bridge 事件。
- 适合做接入样板和问题定位。
- 不向普通用户默认暴露。

## 8. 视觉原则补充

- 默认桌面端，不做移动端优先。
- 不把页面做成营销页。
- 顶部状态栏必须提供第一眼的品牌和会话信号。
- 长文本优先换行，不挤压按钮和标签。
- blocked 和 needs-setup 必须靠文字明确，而不是只靠颜色。
- 卡片、面板和列表要保持稳定边界，不做漂浮式大卡片布局。
