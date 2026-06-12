# Lime Desktop Platform

当前版本：`0.2.0`。

`lime-desktop-platform` 是 Lime 组织桌面产品线的公共底座，不是单一业务 App。
它负责承接 Agent App 宿主、应用中心、通用设置、模型 provider 设置、OAuth、OEM、充值、更新、Product App 独特设置托管和跨 App 复用协议，
并为后续 `content-studio`、`zhongcao` 和其他 OEM Electron App 提供统一宿主能力。这些 Product App
都在各自仓库独立运行，不是平台 App 的子 App，也不会作为平台仓库内置同名 App 出现在应用中心。

平台核心目录不 hard code 任何具体业务 App。开发态内置 catalog 只加载 `catalogScope:
platform-conformance` 的中性 fixture；真实 Product App 的接入说明可以保留在 docs/reference 中，
但不能进入平台 App 的运行时应用中心，也不能进入 `src/main`、`src/shared` 或 contracts 的通用运行时逻辑。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 文档

- [v1 路线图索引](docs/v1/README.md)
- [Agent Runtime 策略](docs/v1/agent-runtime-strategy.md)
- [平台方法论](docs/v1/platform-methodology.md)
- [宿主运行手册](docs/v1/host-runtime-playbook.md)
- [zhongcao 独立产品接入提示词](docs/v1/zhongcao-handoff-prompt.md)
- [发布说明](RELEASE_NOTES.md)

## 当前实现切片

v1 第一刀已经落到 `src/`：

- `src/shared/types.ts`：Manifest、projection、readiness、Host Bridge、runtime bridge、release artifact、IPC、设置和诊断契约。
- `src/main/services/`：本地状态存储、中性 conformance fixture 加载、limecore catalog 适配、release artifact 下载校验、projection/readiness/snapshot、reference runtime fixture 和 runtime bridge 服务。
- `src/main/ipc.ts`：平台公共 IPC 面和 `platform:changed` 状态变化事件。
- `src/preload/index.ts`：`window.limeDesktop` 安全桥，含 `platform.onChanged(...)` 订阅。
- `src/renderer/src/App.tsx`：应用中心、设置中心、运行页、卸载生命周期和开发者诊断页。
- `packages/contracts/`：业务 App 可消费的公开协议类型包。
- `samples/platform-conformance/`：平台自用中性 conformance fixture。其他真实产品名样板只允许作为 `external-product-reference` 文档参照，不进入平台运行时 catalog。

Agent Runtime current 主链是 Product App -> Capability SDK 调用 `lime.agent` -> Desktop Host / Host Bridge -> Lime App Server JSON-RPC -> RuntimeCore：旧 `lime.agentExecution` 仅作为 compat alias。Pi agent 和 Claude SDK 不再作为 current/proposed 后端路线，也不是 Product App 的直接依赖。模型设置保存时会通过 App Server JSON-RPC `modelProvider*` / `modelProviderKey/create` 做受控 provider/key provisioning；运行时 turn 只传 App Server provider id、model id 和非敏感 `AgentRuntimeContext`，不传明文 key。

`0.1.5` 已物理删除旧 `src/main/services/agentExecution/**` 和 `agentExecutionService.ts`，并通过 `governance:hardcode-scan` 阻止 Pi sidecar、Claude SDK backend router 和旧 AgentExecutionService 回流。业务 App 的平台入口应使用 `@limecloud/desktop-platform-react`、`@limecloud/desktop-platform-contracts` 和 `@limecloud/desktop-platform-host-core`，不要复制平台基础设置或直接接入 provider SDK。

存储采用独立但分层的本机持久化：平台基础设置写入 Electron `userData/state`，工作区运行事实写入 `.lime-desktop/`，业务 App 独特设置按 `appId + namespace + scope` 写入独立 `product-settings` namespace，且阻断凭证、token、API Key 和 OAuth 类 namespace / key / value。业务 App 的草稿、工作流状态等本地业务数据通过 `lime.storage` 写入宿主管理的 `.lime-desktop/app-storage` workspace document 后端；`lime.storage` 同样阻断凭证类 namespace / documentId / value。模型 Provider metadata 和 API Key 的 current 持久化事实源是 App Server JSON-RPC provider store；设置页输入的 API Key 只作为 `settings.saveModel` 瞬时字段转交 `modelProviderKey/create`。Desktop Credential Broker 仅作为旧 key 一次性迁移 source 和诊断状态，不再承接新 key 写入；App Server provider sync record 只保存非敏感 provider id / status 映射。
如果保存请求包含新 API Key 但 App Server provider store 不可用，平台必须 fail-closed 并拒绝保存，不能把 key 写入 Desktop Credential Broker 或普通 JSON；旧 broker key 迁移成功后会删除本地旧凭证文件。

当前仓库事实锁文件是 `package-lock.json`。首次开发先执行：

```bash
npm install
npm run test:unit
npm run typecheck
npm run governance:hardcode-scan
npm run build
npm run smoke:electron
```

当前本仓库已通过正式验证：

```bash
npm run governance:hardcode-scan
npm run test:unit
npm run build:packages
npm run verify:local
npm exec --yes --package vitepress@1.6.4 -- vitepress build docs
```

发布前本地验收入口：

```bash
npm run release:readiness
```

该入口会顺序运行 `governance:hardcode-scan`、`build:packages` 和 `verify:local`，不会提交、打 tag、推送或创建 GitHub Release。

跨仓 Product App runtime live fixture 需要显式运行，不进入默认 `verify:local`：

```bash
npm run smoke:product-app-runtime-live
npm run release:readiness:product-app-live
```

该入口会启动真实 `lime-desktop-platform` Electron、真实 Lime App Server JSON-RPC sidecar 和 App Server `--backend external` fixture，并通过 runtime bridge discovery 依次验证 `content-studio`、`zhongcao` 调用平台 `lime.agent`。它要求本仓库、`../content-studio`、`../zhongcao` 已有构建产物，并要求可用的 App Server binary；该 smoke 不调用正式 LLM Provider API，也不是生产 Provider live API 验收。它的守卫目标是证明 Product App 不保存 Provider Key、不直连 LLM、不使用 mock backend fallback，并且只能通过平台 discovery 与 App Server JSON-RPC runtime 获取 `artifact.snapshot` / `turn.completed` 结果。

正式 Provider live API smoke 同样需要显式授权，不进入默认 `verify:local` 或 `release:readiness`：

```bash
LIME_DESKTOP_ALLOW_LIVE_PROVIDER=1 \
LIME_DESKTOP_LIVE_PROVIDER_API_KEY=... \
LIME_DESKTOP_LIVE_PROVIDER_MODEL=... \
npm run smoke:live-provider-runtime

LIME_DESKTOP_ALLOW_LIVE_PROVIDER=1 \
LIME_DESKTOP_LIVE_PROVIDER_API_KEY=... \
LIME_DESKTOP_LIVE_PROVIDER_MODEL=... \
npm run release:readiness:live-provider
```

该入口会启动真实 `lime-desktop-platform` Electron、真实 Lime App Server JSON-RPC sidecar 和 App Server `--backend runtime`，通过 `settings.saveModel -> modelProvider* / modelProviderKey/create` 写入 App Server provider store，再用 `lime.agent` 触发真实 RuntimeBackend 调用上游 LLM API。它只读取 `LIME_DESKTOP_LIVE_PROVIDER_*` 平台专用环境变量，不读取通用 Provider 环境变量；未传 `--allow-live-provider` 或 `LIME_DESKTOP_ALLOW_LIVE_PROVIDER=1` 时会在启动 Electron 前 fail-closed。live API 通过标准要求 runtime event 至少包含 `message.delta`、`turn.completed` 或 `completed`，单纯 `started` 不算通过；可用 `LIME_DESKTOP_LIVE_PROVIDER_TIMEOUT_MS` 调整单步超时，默认 120 秒。
