---
title: zhongcao 接入指南
status: draft
repo: lime-desktop-platform
---

# zhongcao 接入指南

## 1. 接入目标

`zhongcao` 是 `lime-desktop-platform` 的首批业务消费者之一。
它不实现平台级登录、模型、OEM、billing、更新和 Host Bridge，而是直接消费平台投影。
平台核心不 hard code `lime.zhongcao`，开发态目录只从 `samples/zhongcao/manifest.example.json`
和 `samples/zhongcao/catalog.example.json` 读取样板配置。

## 2. 必须消费的平台能力

### 2.1 必需

- `lime.cloudSession`
- `lime.modelSettings`
- `lime.branding`
- `lime.billing`
- `lime.appUpdates`
- `lime.diagnostics`

### 2.2 可选

- `lime.download`
- `lime.permissions`

## 3. zhongcao 业务边界

业务代码只负责：

- 种草日记
- 选题计划
- 素材引用
- 发布计划
- 任务轨迹
- 业务诊断

不负责：

- OAuth token 管理
- 模型 provider 选择
- 租户 billing 真相
- OEM 品牌和渠道
- 应用更新下载和回滚

## 4. 推荐启动顺序

```text
应用中心安装 lime.zhongcao
-> settings 补齐会话、模型和 billing 投影
-> readiness 进入 ready
-> 生成 Host Snapshot
-> 启动 runtime-backed zhongcao Electron App
-> 通过 LIME_HOST_SNAPSHOT 注入非敏感 runtime projection
-> 通过 LIME_RUNTIME_BRIDGE 注入 127.0.0.1 本地桥 descriptor
-> zhongcao 经本地桥请求平台裁决 capability
-> zhongcao 渲染 GEO 工作台 / 需要配置 / 已阻断状态
```

第一阶段不是完整嵌入式 WebView Host Bridge。平台会拉起本地 `zhongcao` runtime，并用环境投影传递 Host Snapshot；同时提供仅绑定 `127.0.0.1` 的 runtime bridge，用一次性 token 接受 `capability/invoke`。这些投影不包含 bearer token、secret、billing 原始账本或宿主内部对象。后续 P2 再升级为受控 WebView/Bridge 双向消息。

## 5. 建议的数据边界

- 平台共享设置由 `window.limeDesktop` 提供。
- 公共类型从 `@limecloud/desktop-platform-contracts` 引入。
- zhongcao 业务数据写入自身 workspace。
- 业务快照不得反写平台会话真相。
- 业务页面只读 platform bootstrap，不直接访问主进程实现。
- 平台状态变化通过 `window.limeDesktop.platform.onChanged(...)` 订阅，不在业务侧维护第二套平台状态。
- 安装、禁用、卸载和更新均由平台执行；zhongcao 只响应当前投影和 readiness。

## 6. 参考 manifest

```json
{
  "appId": "lime.zhongcao",
  "displayName": "种草日记",
  "version": "0.1.0",
  "installMode": "runtime_backed",
  "entries": [
    { "key": "diary-workbench", "kind": "workflow", "route": "/" },
    { "key": "topic-plan", "kind": "page", "route": "/topics" },
    { "key": "materials", "kind": "page", "route": "/materials" },
    { "key": "publishing", "kind": "page", "route": "/publishing" },
    { "key": "diagnostics", "kind": "diagnostics", "route": "/diagnostics" }
  ],
  "requires": {
    "sdkVersion": "1.0.0",
    "capabilities": [
      "lime.cloudSession",
      "lime.modelSettings",
      "lime.branding",
      "lime.billing",
      "lime.appUpdates",
      "lime.diagnostics"
    ],
    "hostKinds": ["electron", "tauri"]
  }
}
```

## 7. 验收建议

- 能在平台壳层里展示 `zhongcao` projection。
- 能从应用中心启动 `lime.zhongcao` 的 runtime-backed Electron App。
- 能通过 runtime bridge 请求平台裁决 `lime.modelSettings`。平台只返回通用 capability 结果；GEO 草稿生成和写回发生在 `zhongcao` 业务 App 内，并记录 `runtime-projection` 来源。
- 应用中心详情能展示 STREAM 五维、Schema JSON-LD、模型生成和发布 readiness。
- ready / needs-setup / blocked 能正确区分。
- 业务页面不需要自己实现登录、模型、品牌和 billing。
- 业务页面能订阅平台变化事件，并在登录、模型、billing、卸载或更新后重新计算自身 UI。
- 卸载后平台清除安装记录和 runtime snapshot；业务数据默认保留，安全删除另走显式流程。
- 可以用同一套 Host Bridge 语义后续迁移到 Tauri。
