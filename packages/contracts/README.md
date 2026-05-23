# @limecloud/desktop-platform-contracts

`zhongcao`、`content-studio` 和后续 OEM App 用这个包读取 Lime Desktop Platform 的公共契约。

它只包含类型和协议常量，不包含 Electron 主进程实现，也不包含业务 App 逻辑。

## 使用

```ts
import type {
  DesktopAppManifest,
  HostSnapshot,
  PlatformCapability,
  RuntimeBridgeDescriptor,
} from '@limecloud/desktop-platform-contracts';
```

业务 App 仍然通过宿主注入的 `window.limeDesktop` 或后续 Tauri adapter 消费能力，不直接访问平台内部服务。

## 平台事件

业务 App 可以订阅平台变化，但不能把平台状态复制成自己的事实源：

```ts
const stop = window.limeDesktop.platform.onChanged((event) => {
  if (event.reason === 'settings-updated' || event.reason === 'billing-updated') {
    // 重新计算业务页面 readiness。
  }
});
```

## 生命周期边界

- 安装、启用、禁用、卸载、更新由宿主负责。
- 业务 App 通过 `apps.getRuntimeSnapshot(...)` 读取非敏感 Host Snapshot。
- runtime-backed App 只消费 `RuntimeBridgeDescriptor`，不直接访问 Electron、Node 或平台内部服务。
- `apps.uninstall({ appId, keepData: true })` 默认只移除平台安装记录和 runtime snapshot，业务数据安全删除另走显式流程。
