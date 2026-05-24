# zhongcao 外部产品参考

这是 `zhongcao` 消费 `agentapp` 标准和 `lime-desktop-platform` 公共能力的外部产品参考，不是平台核心实现，也不是把 `zhongcao` 定义为平台子 App。

用途：

- 让业务团队快速理解平台要求的 manifest
- 作为 zhongcao 仓库实现独立桌面壳和产品内 agentapp 应用中心的起始参照
- 约束业务 App 只消费平台能力，不重复实现平台逻辑

正式 `zhongcao` 仓库建议实现：

- `appId: lime.zhongcao`
- `displayName: 种草日记`
- `installMode: standalone`
- 必需 capability: `lime.cloudSession`、`lime.modelSettings`、`lime.branding`、`lime.billing`、`lime.appUpdates`、`lime.diagnostics`
- 默认入口: `diary-workbench`
- Product App 可以有自己的应用中心，但必须复用 `agentapp` 的 package、install mode、entry、projection、readiness 和 capability 语义。
- 底层 capability、会话、模型、billing、OEM 和更新投影通过兼容宿主消费。
- 正式 Product App 的安装包更新由 zhongcao 自己的 Electron / Tauri updater 或系统安装器处理。
- 产品内 agentapp package 的安装、更新、禁用、卸载复用平台 Host Runtime 语义。

本目录不进入平台运行时 catalog，也不携带 `referenceRuntime`。平台 smoke / conformance 只使用中性 `samples/platform-conformance`。

业务页面建议只保留：

- 日记工作台
- 选题计划
- 素材库
- 发布计划
- 业务诊断
