# Lime Desktop Platform Agent 指南

本文件只用于开发 `limecloud/lime-desktop-platform` 仓库本身。它是 Lime 桌面产品线公共底座，不是 `content-studio`、`zhongcao` 或任一 OEM App 的业务仓库。

## 基本原则

1. 始终中文沟通，新增文档默认使用简体中文。
2. 先读后写，修改前先阅读目标文件、相邻模块和当前 `git status --short`。
3. 代码仓库是事实源，平台协议、运行边界和路线图必须落到 repo 内文档。
4. 少问但不越权，只有需求歧义、不可逆操作、凭证缺失或生产影响时才停下来问。
5. 默认不主动提交，用户没有明确要求时不做 `git commit`、`git tag`、`git push` 或分支操作。
6. 避免无关变更，不顺手重构、不改无关文案、不删除用户未确认的文件。
7. KISS / YAGNI 优先，只实现当前平台底座明确需要的宿主能力。

## 高风险操作确认

执行以下操作前必须先用中文明确确认：

- `git commit`、`git tag`、`git push`、Release 创建或更新。
- 删除文件、批量移动、覆盖用户数据或清理未跟踪文件。
- 修改包管理锁文件、升级核心依赖、全局安装工具。
- 发送凭证、调用生产 API、修改系统级签名或证书配置。

确认格式：

```text
⚠️ 危险操作检测！
操作类型：[具体操作]
影响范围：[详细说明]
风险评估：[潜在后果]

请确认是否继续？[需要明确的“是 / 确认 / 继续”]
```

## 架构边界

- `agentapp` 是标准事实源，`lime-desktop-platform` 是标准桌面宿主实现之一。
- `limecore` 是云端控制面事实源，负责租户、OAuth、应用目录、发布元数据、OEM 和 billing。
- `lime-desktop-platform` 负责本地宿主、应用中心、模型设置、OAuth 投影、OEM 投影、billing 投影、更新投影和 Host Bridge。
- 平台公共 UI 事实源必须在 `packages/react/src/**` 和 `@limecloud/desktop-platform-react`：平台能力总览、平台应用中心、云端会话、通用设置、账号设置、模型设置、品牌、充值、更新、运行和 Host Bridge 诊断都在这里实现。`packages/react/src/index.tsx` 只负责公共导出、装配和轻量组件，新增大型设置页必须拆到相邻子目录，避免继续膨胀单文件。
- 业务 App 只消费平台能力，不在本仓库实现业务工作流；业务 App 也不得复制平台公共 UI，只能挂载平台 React 组件、传入 Host Snapshot / bootstrap 投影和 `PlatformNavigationIntent` handler。
- 如果 `zhongcao`、`content-studio` 或 OEM App 需要通用设置、账号、OAuth、充值、模型设置等公共页面，先在本仓库平台 React 包实现，再由业务 App 调用渲染。
- Electron first，但 manifest、projection、readiness、Host Bridge 和 Capability SDK 语义必须能迁移到 Tauri + React + Rust。

## 模块职责

1. `src/shared/types.ts` 是跨进程契约事实源。
2. `src/main/ipc.ts` 只注册 IPC，不写业务分支。
3. `src/main/services/platformStore.ts` 只处理工作区级和用户级本地状态。
4. `src/main/services/platformService.ts` 负责平台编排、projection、readiness、snapshot 和 capability invoke。
5. `src/main/services/seedCatalog.ts` 只放开发态目录样本，真实目录后续来自 `limecore`。
6. `src/preload/index.ts` 暴露 `window.limeDesktop`，renderer 不直接访问主进程实现。
7. `packages/react/src/**` 是公共 React UI modules 的事实源，Product App 通过 `@limecloud/desktop-platform-react` 消费；大型页面按能力拆分到子目录，`index.tsx` 保持装配入口。
8. `src/renderer/src/App.tsx` 只做 reference shell、状态和 action handler 装配，不写业务 App 内部流程。

## 存储规则

- 工作区级事实写入 `.lime-desktop/`。
- 用户级配置写入 Electron `userData/state`。
- 不硬编码用户目录。
- OAuth snapshot 不得泄露 token，token 只能按需获取。
- `blocked` 和 `needs-setup` 必须可追溯，不得伪装成功。

## 常用命令

```bash
npm install
npm run typecheck
npm run build
npm run dev
npm run verify:local
```

注意：

- 仓库事实锁文件是 `package-lock.json`，首次依赖安装后必须保留并纳入后续验证。
- 未经用户确认，不主动执行会修改锁文件的依赖安装、升级或清理。
- GUI 相关改动应尽量用 Electron 本地运行或 Playwright 做真实路径验证。

## 收尾汇报

开发任务结束必须说明：

- 做了什么、涉及哪些路径。
- 验证命令和结果。
- 主线目标完成度百分比。
- 若仍有未完成阶段，说明下一刀。
