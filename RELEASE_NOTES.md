# Release Notes

## 0.2.1

### 已补强

- 新增 `@limecloud/desktop-platform-electron-adapter` workspace，Product App 可通过 embedded Electron host 复用平台 Host Bridge、`lime.settings` 和 `lime.agent` capability。
- 平台启动期支持预热自管理 App Server JSON-RPC sidecar，并向 Product App 投影 sidecar 连接状态，避免业务 App 自行管理 Provider key 或 App Server data root。
- Runtime Bridge 增加 `/agent/events` 读取入口和 discovery descriptor 定期刷新，支持 Content Studio 等 Product App 在真实平台宿主下获得流式 runtime events。
- Release readiness 增加平台 package 构建、跨仓 Product App runtime live smoke 和正式 Provider live smoke 的显式入口；默认发布门禁仍不调用外部 LLM Provider。
- 模型设置页继续收敛到 App Server provider store：新 key 只作为短程保存输入，普通 JSON 和 Product App 输出不暴露明文凭证。

### 验证

- `npm run release:readiness`

## 0.2.0

### 已补强

- 新增 `lime.settings` capability，平台设置契约扩展 `appearance` 和 `general` 投影，支持主题色、字体比例、衬线模式、通知、运动减弱、快捷窗、命令白名单、权限模式、思考模式和工具调用展示等通用设置。
- `HostProfile` / `HostSnapshot` 增加外观设置和非敏感 `ModelSettingsSnapshot`，业务 App 可读取 provider / model projection，但不会收到 API Key、token、secret 或 credential payload。
- Runtime Bridge 增加 discovery descriptor、`/attach` 入口和本机 discovery 文件发布，外部 Product App 可通过发现文件获取短期 attach token，再换取 scoped runtime bridge session；`/snapshot` 改为实时生成，避免启动时旧 snapshot 滞留。
- 模型设置 current 持久化边界收敛到 App Server provider store：新 API Key 只作为瞬时输入转交 `modelProviderKey/create`；App Server provider store 不可用时 fail-closed，不再把新 key 写入 Desktop Credential Broker 或普通 JSON。旧 broker key 仅作为一次性迁移 source。
- `@limecloud/desktop-platform-react` 拆出模型设置模块，新增 `PlatformModelSelector`、`PlatformRuntimeModelMenu`、模型 projection helper 和设置主题 token；`PlatformSettingsDialog` 支持宿主传入平台设置保存、预览和视觉 token。
- 默认模型 provider 从硬编码样板改为显式配置，`settingsGetModel` 读取 fresh projection，保存逻辑会归一化 provider、默认 provider / model 和平台设置输入。
- 文档同步更新 App Server provider store、模型设置 capability、Runtime Bridge discovery、平台设置 UI 复用边界和 Product App 禁止复制平台基础设置的规则。
- 单元测试和 smoke 覆盖补齐模型 snapshot 脱敏、`lime.settings` 保存、App Server provider/key 同步、离线 fail-closed、Runtime Bridge discovery attach、React 模型设置和事件流 fixture。

### 仍未完成

- OAuth token 轮换、过期刷新和生产级 credential injection 策略。
- release 签名验证、回滚包管理和差分更新。
- Electron adapter / Tauri adapter 正式拆包。
