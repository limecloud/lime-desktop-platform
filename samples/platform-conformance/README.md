# 平台一致性 Fixture

这是 `lime-desktop-platform` 自用的中性 reference fixture，用于验证平台应用中心、Host Snapshot、Capability SDK、公共设置、OAuth、billing、OEM、更新和 runtime bridge。

它不是业务 App，也不代表 `zhongcao`、`content-studio` 或任何 OEM Product App。正式 Product App 必须在自己的仓库和桌面壳里独立运行，并通过平台 contracts、host-core、UI modules 和 adapter 消费公共能力。

治理分类：

- `current`：作为平台一致性测试目录进入开发态 catalog。
- `compat`：`runtime_backed` 和 `referenceRuntime` 只允许用于 smoke / conformance。
- `dead`：用真实 Product App 名称作为平台内置同名 App。
