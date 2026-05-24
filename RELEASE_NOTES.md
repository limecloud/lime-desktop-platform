# Release Notes

## 0.1.2

### 已补强

- 增加 `limecoreControlPlane`，支持通过 `LIMECORE_CATALOG_URL` 或 `LIMECORE_BASE_URL` 拉取云端 catalog。
- 增加 `ReleaseArtifact`、`UpdateCandidate`、`DownloadedUpdateArtifact` 和 `ControlPlaneStatus` 契约。
- 增加 `releaseDownloader`，真实下载 release artifact 并校验 sha256 和可选 size。
- `updates:check` 可强制同步 catalog，`updates:download` 和 `updates:apply` 对带 artifact 的更新执行下载、校验和应用门槛。
- 增加 `PlatformNavigationIntent`，runtime-backed App 可请求打开平台设置入口，不复制平台设置 UI。
- Electron smoke 增加本地 mock `limecore`，覆盖云端目录、更新发现、artifact 下载、sha256 校验和安装记录切换。

### 仍未完成

- OAuth、billing、OEM 真实 `limecore` 端点。
- release 签名验证、回滚包管理和差分更新。
- Tauri adapter。

## 0.1.1

### 已补强

- 增加 `lime.zhongcao` runtime-backed 启动链路，平台可通过应用中心拉起本地 `zhongcao` Electron App。
- 增加 127.0.0.1 `RuntimeBridgeServer`，通过短期 token 向 runtime-backed App 提供 `/snapshot` 和 `/capability/invoke`。
- 增加 `RuntimeBridgeDescriptor`、`platform.onChanged(...)`、`apps.uninstall(...)` 等公开契约。
- 增加 `platform:changed` 事件，登录、模型、billing、安装、启动、卸载、更新和 capability 调用后可向 renderer/业务 App 广播最新 bootstrap。
- 增加平台卸载生命周期：停止 runtime-backed 子进程、撤销 runtime bridge session、移除安装记录、清理 runtime snapshot，默认保留业务数据。
- 统一 `zhongcao` 平台身份为 `lime.zhongcao`，入口为 `diary-workbench`。
- 扩展 `zhongcao` 样板 manifest，覆盖日记工作台、选题计划、素材库、发布计划和诊断页。
- 增加 `docs/v1/zhongcao-handoff-prompt.md`，作为另一个开发进程继续开发 zhongcao 的交接提示词。
- Electron smoke 覆盖 `zhongcao` 子进程启动、runtime bridge capability 调用、平台变化事件和卸载生命周期。

### 验证

- `npm run typecheck`
- `npm run build`
- `npm run smoke:electron`

## 0.1.0

首次可交付平台底座版本。

### 已包含

- Electron + React + TypeScript 桌面宿主骨架
- manifest / projection / readiness / Host Bridge / IPC 契约
- 应用中心、设置中心、运行页、开发者诊断页
- 本地工作区与用户级状态分层
- `content-studio`、`zhongcao`、OEM 样板应用目录
- 更新投影与开发态应用更新 API
- `npm run verify:local`，包含 typecheck、build 和 Electron smoke
- `@limecloud/desktop-platform-contracts` 契约包
- `samples/zhongcao/manifest.example.json` 和 `docs/v1/zhongcao-integration.md`

### 面向 zhongcao 的使用方式

- 业务 App 使用同一套 host capability 语义。
- 登录、模型设置、OEM、billing、更新都由平台提供。
- 业务 App 只保留自身内容工作流、草稿、素材和发布计划。
