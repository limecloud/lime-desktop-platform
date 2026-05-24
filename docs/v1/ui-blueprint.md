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

- 代码事实源：`packages/react/src/index.tsx`。
- 发布包：`@limecloud/desktop-platform-react`。
- reference shell：`src/renderer/src/App.tsx` 只负责 shell、状态和 action handler 装配。
- Product App 直接依赖 `@limecloud/desktop-platform-react` 的模块清单、标签、`PlatformModuleOutlet` 和 action handler 类型，不复制公共页面。
- 平台应用中心迁移 Lime 应用中心的产品形态：顶部统计、状态 / 来源筛选、卡片网格、分页、详情弹窗、常用入口、readiness、能力要求、框架能力、安装 / 打开 / 更新 / 启停 / 卸载动作。迁移只复用 UI 结构和交互模型，底层数据与动作继续由 `PlatformBootstrap`、`DesktopAppProjection` 和 `PlatformModuleActionHandlers` 驱动，不搬 Lime Tauri 私有命令。

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

### 7.5 设置弹窗

- 设置弹窗是 reference shell 的桌面壳层能力，采用居中模态、左侧分类导航和右侧详情页。
- `@limecloud/desktop-platform-react` 导出 `PlatformAccountEntry` 和 `PlatformSettingsDialog`，用于 Product App 左下角账号入口、通用设置页、模型设置页和账号设置页；Product App 只调用渲染，不复制公共设置 UI。
- 左侧设置分类必须完整可进入：通用、个性化、主题、每日回顾、模型、使用统计、语音模型、开放网关、机器人对话、搜索服务、网络、数据、账号和关于。当前未接真实保存的分类展示平台投影页，不在 Product App 内做私有设置事实源。
- 主题页复刻桌面参考设置结构：包含外观模式、颜色主题、对话字体大小和衬线体开关；当前先由平台 React 包维护 UI 草稿状态，后续由 host-core settings action handler 统一保存。
- 模型页复刻桌面参考设置结构：左侧为“启用的模型”二级列表，默认包含“默认 (Claude)”和 “DeepSeek”；右侧为当前 provider 配置卡，包含 API 密钥输入、模型优先级、添加模型、上移 / 下移 / 移除模型和测试连接。
- “添加模型”不是详情页下方的常驻目录。点击左侧 `+` 或“添加模型”后，右侧切换为独立供应商选择视图，包含推荐服务、国内服务、聚合平台、海外平台和本地模型 tabs；选择任一供应商后回到同一套 provider 配置卡。
- 模型 provider 图标来自 Lime 现有 `src/icons/providers` 图标体系并内联到平台 React 包；没有明确图标映射的 provider 不在 v1 设置弹窗里展示，避免用文字或占位符伪造品牌图标。
- 语音模型页由平台 React 包完整承载，不再使用投影占位页。页面复刻 Lime 参考结构：语音输入快捷键、Fn / 快捷键切换、启用开关、Fn 键说明、SenseVoice Small 本地模型、安装状态、删除 / 安装模型、选择音频文件测试、选择视频文件测试、实时录音测试和所有转录历史。
- 语音模型页当前只维护 UI 草稿状态，真实快捷键注册、模型下载 / 删除、文件选择、录音权限、SenseVoice / FunASR 转写和历史持久化必须由平台 host-core ASR action handler 接入。Product App 只能挂载该页面，不保存 ASR 模型、快捷键或转录历史事实源。
- 搜索服务页由平台 React 包完整承载，不再使用投影占位页。页面复刻桌面参考结构：提示说明、已启用（拖拽排序优先级）分区、可用服务分区、Tavily、Bing Search、秘塔搜索、Exa、Brave Search、SerpAPI、Serper、Google CSE 和 Firecrawl 列表、启用开关、API Key 输入、获取 Key 入口，以及 Google CSE 的 `Custom Search Engine ID (cx)` 输入。
- 搜索服务页当前只维护 UI 草稿状态，真实 API Key 加密保存、Google CSE CX、秘塔兼容端点、provider 健康检查、WebSearch 路由和失败自动回退必须由平台 host-core search action handler / Credential Broker 接入。Product App 只能挂载该页面，不保存搜索凭证、搜索优先级或 WebSearch 路由事实源。
- 网络页由平台 React 包完整承载，不再使用投影占位页。页面复刻桌面参考结构：系统代理检测提示、代理服务器开关、HTTP/HTTPS 与 SOCKS5 协议选择、服务器地址、端口、代理认证、代理白名单、模型供应商自动白名单展开项、代理地址预览和 AI 模型请求作用域说明。
- 网络页当前只维护 UI 草稿状态，真实系统代理检测、代理配置保存、`HTTP_PROXY` / `HTTPS_PROXY` 环境变量注入、Claude CLI 子进程代理隔离和证书 / 网关策略必须由平台 host-core settings / network action handler 接入。Product App 只能挂载该页面，不保存代理配置、不覆盖系统代理、不直接写 AI 子进程环境变量。
- 账号页显示头像、昵称、邮箱、退出登录和完成按钮；账号事实源仍来自 Host Snapshot / `PlatformBootstrap.authSession` 投影。
- 账号数据只读取 Host Session / `PlatformBootstrap.authSession` 投影，不保存 token，不复制 OAuth 权威状态。
- 退出登录只调用平台 auth action handler，由宿主刷新 session 投影。
- 关于页由平台 React 包完整承载，不再使用投影占位页。页面复刻桌面参考结构：品牌 / logo 预留位、版本号、自动检查更新开关、检查更新按钮、查看更新日志、打开日志目录和版权信息；Product App 只能传 `about` 投影或自定义 logo 节点，不复制关于页 UI。
- 关于页当前只维护 UI 草稿状态，真实自动检查更新保存、Product App 更新检查、agentapp package 更新检查、更新日志和打开日志目录必须由平台 updater / diagnostics action handler 接入。

## 8. 视觉原则补充

- 默认桌面端，不做移动端优先。
- 不把页面做成营销页。
- 顶部状态栏必须提供第一眼的品牌和会话信号。
- 长文本优先换行，不挤压按钮和标签。
- blocked 和 needs-setup 必须靠文字明确，而不是只靠颜色。
- 卡片、面板和列表要保持稳定边界，不做漂浮式大卡片布局。
