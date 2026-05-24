---
layout: home
hero:
  name: Lime Desktop Platform
  text: Agent App 标准桌面宿主
  tagline: 平台级应用中心、公共设置、Host Bridge、Capability SDK 和多 Product App 复用底座。
  actions:
    - theme: brand
      text: 阅读中文文档
      link: /zh/
    - theme: alt
      text: v1 路线图
      link: /v1/
features:
  - title: 公共能力下沉
    details: 模型设置、OAuth、OEM、充值、更新和平台级应用中心由桌面宿主实现。
  - title: Agent App 宿主
    details: 遵循 agentapp 标准，提供 package 校验、projection、readiness、Host Bridge 和 Capability SDK adapter。
  - title: Product App 复用
    details: content-studio、zhongcao 和 OEM App 独立运行，只消费宿主投影和 capability，不复制公共平台能力。
---

## 事实源关系

- `/Users/coso/Documents/dev/ai/limecloud/agentapp` 是 Agent App / 应用中心标准协议事实源。
- `lime-desktop-platform` 是该标准的桌面宿主和平台级应用中心实现之一。
- Product App 可以实现自己的产品内 `agentapp` 应用中心，但公共能力必须来自兼容宿主。
- 平台 App 运行时 catalog 只内置中性 conformance fixture，不内置真实 Product App 同名样板。

## 文档入口

- [v1 路线图](./v1/)
- [架构与流程图](./v1/architecture-diagrams)
- [Agent Runtime 策略](./v1/agent-runtime-strategy)
- [平台能力边界](./v1/platform-capabilities)
- [zhongcao 独立产品提示词](./v1/zhongcao-handoff-prompt)
