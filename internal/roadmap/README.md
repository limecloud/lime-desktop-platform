# Desktop Platform 路线图索引

本目录记录 `lime-desktop-platform` 的平台底座升级计划。这里的文档是开发跟踪工件，不替代 `docs/v1/` 的对外产品文档。

## 当前计划

| 文档 | 作用 |
| --- | --- |
| [platform-host-kit-boundary-prd.md](./platform-host-kit-boundary-prd.md) | Desktop Platform 是否多余的边界决策：平台保留为 Host Kit / 公共平台 UX，不承接 Agent Runtime、Provider key 事实源或业务 workflow；包含架构图、Product App 启动时序、capability 流程、设置归属流程和平台侧开发计划。 |
| [provider-store-data-root-prd.md](./provider-store-data-root-prd.md) | Provider store 单事实源、App Server sidecar 数据根、新模型 key 去双写、旧 CredentialBroker 迁移和 zhongcao 等 Product App 运行边界。 |

## 事实源边界

- App Server provider store 是模型 Provider metadata 和 API Key 的 current 事实源。
- Desktop Platform 是设置 UI、sidecar owner、Host Bridge、Capability Gateway 和非敏感 projection 的 current 事实源。
- 平台模型设置读取会先从 App Server `modelProvider/list` 刷新 provider projection；本地 `model-settings.json` 只保留非敏感缓存和 UI 偏好。
- 新 API Key 只作为设置保存瞬时字段转交 `modelProviderKey/create`，不写 Desktop `CredentialBroker`。
- Product App 只通过 `lime.agent` 和平台 intent 使用模型能力，不保存 key、不读 App Server DB。
- Reference shell 只用于 conformance、smoke 和文档预览，不是生产 Product App 托管壳。
- 新增平台能力优先进入 `packages/contracts`、`packages/host-core`、`packages/react`、Electron/Tauri adapter；不要在业务 App 或 App Server 中复制公共设置 UI。

## 阅读顺序

1. 先读 [platform-host-kit-boundary-prd.md](./platform-host-kit-boundary-prd.md)，确认平台是 Host Kit / 公共 UX。
2. 再读 [provider-store-data-root-prd.md](./provider-store-data-root-prd.md)，确认 Provider/key/data root 迁移。
3. 最后回到 `docs/v1/` 和实现代码，按边界推进具体功能。
