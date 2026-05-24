# Lime Desktop Platform

`lime-desktop-platform` 是 Lime 组织桌面产品线的公共底座，不是单一业务 App。
它负责承接 Agent App 宿主、应用中心、模型设置、OAuth、OEM、充值、更新和跨 App 复用协议，
并为后续 `content-studio`、`zhongcao` 和其他 OEM Electron App 提供统一宿主能力。

平台核心目录不 hard code 任何具体业务 App。开发态应用中心目录从 `samples/*/manifest.example.json`
和 `samples/*/catalog.example.json` 加载；业务样板可以出现在 `samples/` 和专项 smoke 中，但不能进入
`src/main`、`src/shared` 或 contracts 的通用运行时逻辑。

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

- `src/shared/types.ts`：Manifest、projection、readiness、Host Bridge、runtime bridge、release artifact、IPC、设置和诊断契约。
- `src/main/services/`：本地状态存储、通用样板目录加载、limecore catalog 适配、release artifact 下载校验、projection/readiness/snapshot、runtime-backed 启动和 runtime bridge 服务。
- `src/main/ipc.ts`：平台公共 IPC 面和 `platform:changed` 状态变化事件。
- `src/preload/index.ts`：`window.limeDesktop` 安全桥，含 `platform.onChanged(...)` 订阅。
- `src/renderer/src/App.tsx`：应用中心、设置中心、运行页、卸载生命周期和开发者诊断页。
- `packages/contracts/`：业务 App 可消费的公开协议类型包。
- `samples/*/`：开发态应用中心 fixture，包含样板 manifest、catalog 元数据和业务接入说明。

当前仓库事实锁文件是 `package-lock.json`。首次开发先执行：

```bash
npm install
npm run typecheck
npm run governance:hardcode-scan
npm run build
npm run smoke:electron
```

当前本仓库已通过正式验证：

```bash
npm run verify:local
```
