---
title: 平台方法论
status: draft
repo: lime-desktop-platform
---

# 平台方法论

## 1. 核心判断

`lime-desktop-platform` 的第一责任不是“再做一个桌面应用”，而是把多个桌面 App 共用的宿主能力收敛成稳定底座。

这意味着：

- 云端控制面归 `limecore`。
- 执行事实标准归 `agentruntime`。
- 桌面宿主归 `lime-desktop-platform`。
- 业务流程归具体 App。

## 2. 事实源顺序

平台开发按以下顺序收敛事实源：

1. 产品文档先定义边界。
2. 宿主契约再定义稳定接口。
3. 运行时状态只做投影，不反写事实。
4. 具体 App 只消费平台能力，不重复实现平台能力。

## 3. 设计原则

- 先协议，后实现。
- 先共享能力，后个性化壳层。
- 先本地可追溯，后云端投影。
- `blocked` 和 `needs-setup` 必须显式可见，不能伪成功。
- 不硬编码用户目录，不把工作区路径写死到 App 代码里。
- Electron 先行，但协议必须天然可迁移到 Tauri。

## 4. 开发顺序

### 4.1 P0：契约先行

- `manifest`
- `projection`
- `readiness`
- `Host Bridge`
- `IPC` 公共面
- 本地存储分层

### 4.2 P1：宿主壳层

- 顶部状态栏
- 左侧导航
- 应用中心
- 设置中心
- 开发者诊断页

### 4.3 P2：共享能力

- 模型设置
- OAuth / 会话
- OEM / 品牌
- 充值 / 订阅
- 更新 / 分发

### 4.4 P3：首批 App 接入

- `content-studio`
- `zhongcao`
- 其他 OEM App

### 4.5 P4：跨宿主适配

- Electron adapter 先稳定
- Tauri adapter 再复用同一协议

## 5. 不做的事

- 不把平台做成业务内容工厂。
- 不把登录、计费和品牌逻辑散落到各 App。
- 不把宿主状态当成业务真相。
- 不把一个 App 的临时实现写成公共抽象。
- 不为未来不明确的扩展预留过多层级。

## 6. 开发验收标准

- 能明确说出谁是权威来源。
- 能区分共享能力和业务能力。
- 能用同一宿主协议接入第二个 App。
- 能在不改协议的前提下替换 Electron 实现。
- 能把 blocked、needs-setup 和 ready 区分清楚。
