# zhongcao 样板

这是 `zhongcao` 的接入样板，不是平台核心实现。

用途：

- 让业务团队快速理解平台要求的 manifest
- 作为未来 zhongcao 仓库的起始参照
- 约束业务 App 只消费平台能力，不重复实现平台逻辑

建议同步实现：

- `appId: zhongcao`
- `displayName: 种草日记`
- `installMode: runtime_backed`
- 必需 capability: `lime.cloudSession`、`lime.modelSettings`、`lime.branding`、`lime.billing`、`lime.appUpdates`、`lime.diagnostics`

业务页面建议只保留：

- 日记工作台
- 选题计划
- 素材库
- 发布计划
- 业务诊断

