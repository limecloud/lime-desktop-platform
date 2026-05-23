# Lime Desktop Platform

`lime-desktop-platform` 是 Lime 组织桌面产品线的公共底座，不是单一业务 App。
它负责承接 Agent App 宿主、应用中心、模型设置、OAuth、OEM、充值、更新和跨 App 复用协议，
并为后续 `content-studio`、`zhongcao` 和其他 OEM Electron App 提供统一宿主能力。

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
- [平台方法论](docs/v1/platform-methodology.md)
- [宿主运行手册](docs/v1/host-runtime-playbook.md)
- [zhongcao 接入指南](docs/v1/zhongcao-integration.md)
- [发布说明](RELEASE_NOTES.md)

## 当前实现切片

v1 第一刀已经落到 `src/`：

- `src/shared/types.ts`：Manifest、projection、readiness、Host Bridge、IPC、设置和诊断契约。
- `src/main/services/`：本地状态存储、种子应用目录、projection/readiness/snapshot 服务。
- `src/main/ipc.ts`：平台公共 IPC 面。
- `src/preload/index.ts`：`window.limeDesktop` 安全桥。
- `src/renderer/src/App.tsx`：应用中心、设置中心、运行页和开发者诊断页。
- `packages/contracts/`：业务 App 可消费的公开协议类型包。
- `samples/zhongcao/`：zhongcao 样板 manifest 和接入说明。

当前仓库事实锁文件是 `package-lock.json`。首次开发先执行：

```bash
npm install
npm run typecheck
npm run build
npm run smoke:electron
```

当前本仓库已通过正式验证：

```bash
npm run verify:local
```
