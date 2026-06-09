# Lime Desktop Platform Docs

本目录按 GitHub Pages / VitePress 文档库组织。

## 本地预览

```bash
npm exec --yes --package vitepress@1.6.4 -- vitepress dev docs
```

## 构建

```bash
npm exec --yes --package vitepress@1.6.4 -- vitepress build docs
```

当前 `package.json` 尚未把 VitePress 写入 devDependencies；GitHub Pages workflow 使用 `npm exec --package vitepress@1.6.4` 构建，避免在未确认依赖策略前修改 `package-lock.json`。

Mermaid 图表在静态站点中通过运行时 ESM CDN 渲染；Markdown 源文件仍保留标准 `mermaid` 代码块，GitHub 和本地阅读器也能直接查看源码。正式产品化文档站如需离线渲染，再单独确认是否把 `vitepress` 和 `mermaid` 纳入仓库 devDependencies。

## 事实源关系

- `agentapp` 是 Agent App / 应用中心标准事实源。
- `lime-desktop-platform` 是该标准的桌面宿主实现之一，并拥有应用中心、通用设置、模型 provider 设置、OAuth、OEM、充值、更新、Product App 独特设置托管和 Host Bridge 等公共能力。
- `content-studio`、`zhongcao` 和后续 OEM App 是独立 Product App，只消费宿主投影、Capability SDK 和 `PlatformNavigationIntent`。
- Agent Runtime current 路线是 Lime App Server JSON-RPC / RuntimeCore；Pi agent 和 Claude SDK 不再作为 current/proposed 后端路线，也不是 Product App 的直接依赖。
- `samples/platform-conformance` 是中性 reference fixture，用来验证协议和示例文档，不是平台核心产品对象。
- 平台 App 运行时 catalog 不内置真实 Product App 同名样板。
- 平台基础设置写入 `userData/state`，工作区运行事实写入 `.lime-desktop/`；业务 App 独特设置只能通过 `appId + namespace + scope` 进入独立 `product-settings` namespace，且不能保存凭证、token、API Key 或 OAuth 数据；业务 App 草稿、工作流状态等本地数据通过 `lime.storage` 进入 `.lime-desktop/app-storage`。
