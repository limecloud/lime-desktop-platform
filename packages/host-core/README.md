# @limecloud/desktop-platform-host-core

`@limecloud/desktop-platform-host-core` 固定 Lime Desktop Platform 的平台无关宿主核心消费面。

它不是 Electron 主进程实现，也不是 Product App 业务 runtime。当前包先提供 `PlatformHostCore` 接口、Host Snapshot 来源、readiness helper 和平台变化事件 helper，让 `zhongcao`、`content-studio` 和后续 OEM App 能围绕同一组 contracts 接入。

## 边界

- current：`PlatformHostCore`、Host Snapshot、Capability invoke、`PlatformNavigationIntent`、`PlatformBootstrap`。
- compat：当前 reference shell 仍由 `src/main/services/PlatformService` 承载具体实现，后续迁入 host-core。
- dead：Product App 直接访问 Electron 主进程、平台内部 service、token、模型 Key 或 billing 账本。

## 最小用法

```ts
import type { PlatformHostCore } from '@limecloud/desktop-platform-host-core';

async function mountPlatform(host: PlatformHostCore) {
  const bootstrap = await host.getBootstrap();
  return bootstrap.hostProfile;
}
```

真实 Electron / Tauri adapter 只应负责 IPC、preload / command bridge 和宿主安全边界；平台业务事实继续通过这个 host-core 契约暴露。
