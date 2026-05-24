---
title: 平台能力边界
status: draft
repo: lime-desktop-platform
---

# 平台能力边界

## 1. 核心判断

`lime-desktop-platform` 不是业务 App，也不是云端控制面。它的价值在于把多个桌面 App 共同需要的宿主能力收敛成一套稳定底座。

## 2. 能力矩阵

| 模块 | 平台负责 | 权威来源 | 本地缓存 | 对外暴露 | 失败呈现 |
| --- | --- | --- | --- | --- | --- |
| Agent App Host Runtime | 安装、校验、projection、readiness、Host Bridge、capability 路由 | 本地 manifest + host profile | 本地安装目录 | 运行页 / 诊断页 | `needs-setup` / `blocked` |
| 应用中心 | 目录、安装、更新、启用、禁用、启动 | `limecore` catalog / release | 本地 installed catalog | 应用中心 / 应用详情 | `needs-setup` / `blocked` |
| 模型设置 | provider、protocol、默认模型、覆盖策略、同步 | 本地配置 + 云端默认值 | `userData` 配置 | 设置中心 | `needs-setup` / `blocked` |
| OAuth / 会话 | 登录、token、租户身份、退出、刷新 | `limecore` identity | 安全存储 / 会话缓存 | 顶部状态栏 / 设置中心 | `unauthenticated` |
| OEM / 品牌 | 品牌名、logo、壳层文案、主题、渠道、品牌投影 | `limecore` OEM manifest | 本地品牌快照 | 顶部状态栏 / 壳层样式 | `needs-branding` |
| 充值 / 订阅 | 套餐、余额、开通、续费、状态展示 | `limecore` billing | 本地只读投影 | 设置中心 / 状态栏 | `needs-payment` |
| 更新 / 分发 | 检查更新、下载、安装、版本切换、回退提示 | `limecore` release metadata | 本地下载缓存 | 更新提示 / 应用中心 | `update-available` / `update-failed` |
| 平台设置 | 语言、代理、主题、工作区、默认能力开关 | 本地用户设置 | `userData` / workspace | 设置中心 | `needs-setup` |
| 运行可见性 | 运行状态、证据、错误、日志摘要、调用轨迹 | Host Runtime | 本地运行记录 | 运行页 / 开发者页 | `blocked` / `failed` |

当前实现中，应用目录和更新分发已具备 `limecore` catalog 最小接入链路；OAuth、OEM 和 billing 仍是本地开发态投影，尚未接真实 `limecore` 端点。

## 3. 共享与不共享

### 3.1 必须共享

- 应用中心
- 模型设置
- OAuth / 会话
- OEM 壳层
- 充值 / 订阅
- 更新 / 分发
- Host Bridge
- 权限和 readiness
- 日志和运行证据

### 3.2 不共享

- 业务工作流
- 行业内容逻辑
- App 私有素材库
- App 私有页面状态
- 具体的 Prompt、SOP、内容结构和领域知识
- 某个 App 的临时实验实现

## 4. 数据主权

### 4.1 本地优先的数据

- App 安装状态
- Host Bridge 会话
- 用户设置
- 本地下载缓存
- 已校验 release artifact
- App 运行快照
- 运行日志和证据摘要

### 4.2 云端权威的数据

- 租户身份
- 应用目录
- 发布元数据
- OEM 品牌配置
- 充值和订阅状态

### 4.3 双写但不双权威的数据

- 模型设置：云端给默认值，本地给最终选择。
- OAuth 状态：云端给会话事实，本地给安全缓存。
- 应用启动状态：云端只看目录，本地只看实际安装和 readiness。
- 品牌投影：云端给品牌事实，本地给壳层表现。

## 5. 平台边界

- 不把业务 App 的内容流程塞进平台底座。
- 不把 `limecore` 的云端控制逻辑复制到桌面壳。
- 不把 Agent Runtime 的执行事实改写成 UI 状态。
- 不让单个 App 自己维护一套独立登录、计费和品牌逻辑。
- 不把一个 App 的私有页面状态提升成公共能力。

## 6. 开发优先级

1. 先做 Host Runtime 和应用中心。
2. 再做模型设置和 OAuth。
3. 再做 OEM 和充值。
4. 再做更新、诊断和运行可见性。
5. 最后做跨 App 复用和 Tauri 适配。
