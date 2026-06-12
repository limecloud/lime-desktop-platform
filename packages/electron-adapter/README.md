# @limecloud/desktop-platform-electron-adapter

Product App 的 Electron 主进程通过本包嵌入 Lime Desktop Platform host。

本包只负责 Electron 侧生命周期、App Server sidecar 启动参数归一化和 Host Snapshot / Capability 调用转发；Provider key、runtime 执行事实和平台设置仍由 `PlatformService` / App Server provider store 负责。
