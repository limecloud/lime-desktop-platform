# zhongcao 样板

这是 `zhongcao` 的接入样板，不是平台核心实现。

用途：

- 让业务团队快速理解平台要求的 manifest
- 作为未来 zhongcao 仓库的起始参照
- 约束业务 App 只消费平台能力，不重复实现平台逻辑

建议同步实现：

- `appId: lime.zhongcao`
- `displayName: 种草日记`
- `installMode: runtime_backed`
- 必需 capability: `lime.cloudSession`、`lime.modelSettings`、`lime.branding`、`lime.billing`、`lime.appUpdates`、`lime.diagnostics`
- 默认入口: `diary-workbench`
- 业务 App 通过 `window.limeDesktop.platform.onChanged(...)` 订阅平台会话、模型、billing、更新和卸载状态变化。
- 卸载由平台执行，业务 App 不维护独立安装表；第一阶段默认保留业务数据。

业务页面建议只保留：

- 日记工作台
- 选题计划
- 素材库
- 发布计划
- 业务诊断
