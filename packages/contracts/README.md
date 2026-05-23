# @limecloud/desktop-platform-contracts

`zhongcao`、`content-studio` 和后续 OEM App 用这个包读取 Lime Desktop Platform 的公共契约。

它只包含类型和协议常量，不包含 Electron 主进程实现，也不包含业务 App 逻辑。

## 使用

```ts
import type { DesktopAppManifest, HostSnapshot, PlatformCapability } from '@limecloud/desktop-platform-contracts';
```

业务 App 仍然通过宿主注入的 `window.limeDesktop` 或后续 Tauri adapter 消费能力，不直接访问平台内部服务。
