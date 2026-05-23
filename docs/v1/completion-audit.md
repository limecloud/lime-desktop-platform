---
title: 完成度审计
status: draft
repo: lime-desktop-platform
---

# 完成度审计

## 1. 目的

这份清单用于判断 `lime-desktop-platform` 是否已经从文档阶段进入可开发、可联调、可接 App 的状态。

## 2. v1 完成门槛

### 2.1 文档门槛

- [x] `prd.md`
- [x] `platform-capabilities.md`
- [x] `host-contracts.md`
- [x] `architecture-diagrams.md`
- [x] `workflow-model.md`
- [x] `ui-blueprint.md`
- [x] `implementation-plan.md`
- [x] `platform-methodology.md`
- [x] `host-runtime-playbook.md`
- [x] `user-story-flow-map.md`
- [x] `completion-audit.md`

### 2.2 协议门槛

- [x] manifest 结构稳定
- [x] projection 输入输出稳定
- [x] readiness 状态稳定
- [x] Host Bridge v1 稳定
- [x] IPC 公共面稳定
- [x] 本地存储分层稳定

### 2.3 平台门槛

- [x] 应用中心可用
- [x] 模型设置可用
- [x] OAuth / 会话可用
- [x] OEM / 品牌可用
- [x] 充值 / 订阅可用
- [ ] 更新 / 分发可用
- [x] 运行页可用

### 2.4 复用门槛

- [ ] `content-studio` 可作为首个样板接入
- [ ] `zhongcao` 可作为第二个样板接入
- [ ] 业务 App 不需要重复实现登录、模型和计费
- [ ] Tauri 适配可以共用同一协议

## 3. 必须阻断的风险

| 风险 | 处理方式 |
| --- | --- |
| 平台变成业务 App | 拆回共享能力和业务能力边界。 |
| 云端逻辑下沉到壳层 | 保持 `limecore` 为权威来源。 |
| 状态伪成功 | blocked / needs-setup 直接可见。 |
| 路径写死 | 全部改为 workspace / userData 抽象。 |
| 单 App 特化污染底座 | 抽到样板接入层，不进平台核心。 |

## 4. 开发验收建议

1. 先跑通文档到代码的映射。
2. 再跑通应用中心和设置中心。
3. 再跑通一个完整 App 的安装、启动和更新。
4. 再验证第二个 App 的复用。
5. 最后验证 Tauri 同协议对接。

## 5. 发布前门槛

### 5.1 文档门槛

- [ ] PRD 完整
- [ ] 平台能力边界完整
- [ ] 宿主契约完整
- [ ] 架构图完整
- [ ] 工作流模型完整
- [ ] UI 蓝图完整
- [ ] 实施计划完整
- [ ] 用户故事流程完整
- [ ] 完成度审计完整
- [ ] 方法论和运行手册齐全

### 5.2 协议门槛

- [ ] manifest 结构稳定
- [ ] projection 输入输出稳定
- [ ] readiness 状态稳定
- [ ] Host Bridge v1 稳定
- [ ] IPC 公共面稳定
- [ ] 本地存储分层稳定

### 5.3 平台门槛

- [ ] 应用中心可用
- [ ] 模型设置可用
- [ ] OAuth / 会话可用
- [ ] OEM / 品牌可用
- [ ] 充值 / 订阅可用
- [ ] 更新 / 分发可用
- [ ] 运行页可用
- [ ] 开发者页可用

### 5.4 复用门槛

- [ ] `content-studio` 可作为首个样板接入
- [ ] `zhongcao` 可作为第二个样板接入
- [ ] 业务 App 不需要重复实现登录、模型和计费
- [ ] Tauri 适配可以共用同一协议

## 6. 必须阻断的风险

| 风险 | 处理方式 |
| --- | --- |
| 平台变成业务 App | 拆回共享能力和业务能力边界。 |
| 云端逻辑下沉到壳层 | 保持 `limecore` 为权威来源。 |
| 状态伪成功 | `blocked` / `needs-setup` 直接可见。 |
| 路径写死 | 全部改为 workspace / userData 抽象。 |
| 单 App 特化污染底座 | 抽到样板接入层，不进平台核心。 |

## 7. 开发证据

完成平台底座至少要能留下以下证据：

- manifest 和 projection 的真实样例。
- readiness 的真实阻断样例。
- 应用中心安装与启动样例。
- 设置同步样例。
- `content-studio` 或 `zhongcao` 的接入样例。
- Tauri 同契约适配样例。

## 8. 当前代码切片证据

已落地：

- `src/shared/types.ts` 提供 manifest、projection、readiness、Host Bridge、IPC、模型设置、OAuth、OEM、billing、diagnostics 契约。
- `src/main/services/seedCatalog.ts` 提供 `content-studio`、`zhongcao` 和 OEM 样板应用目录。
- `src/main/services/platformService.ts` 提供安装、启用、禁用、readiness、snapshot、capability invoke 和设置同步的最小实现。
- `src/main/services/platformStore.ts` 将工作区级事实写入 `.lime-desktop/`，将用户级配置写入 Electron `userData/state`。
- `src/preload/index.ts` 暴露 `window.limeDesktop`，renderer 不直接访问主进程实现。
- `src/renderer/src/App.tsx` 已有应用中心、设置中心、运行页和开发者诊断页。

未完成：

- 真实云端目录、OAuth、billing、更新下载仍是本地投影和开发态模拟。
- `content-studio`、`zhongcao` 还未作为真实 bundle 接入运行。
- Tauri adapter 还未创建。

已验证：

- `npm install` 完成，生成 `package-lock.json`。
- `npm run verify:local` 通过，覆盖 `typecheck`、`build` 和 `smoke:electron`。
- Electron smoke 覆盖平台 bootstrap、`content-studio` 安装、登录投影、模型设置、billing 刷新、入口启动、host snapshot 和 capability invoke。
