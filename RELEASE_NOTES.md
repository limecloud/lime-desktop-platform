# Release Notes

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
