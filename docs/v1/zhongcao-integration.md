---
title: zhongcao 接入指南
status: draft
repo: lime-desktop-platform
---

# zhongcao 接入指南

## 1. 接入目标

`zhongcao` 是 `lime-desktop-platform` 的首批业务消费者之一。
它不实现平台级登录、模型、OEM、billing、更新和 Host Bridge，而是直接消费平台投影。

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
读取 host snapshot
-> 读取平台会话和品牌投影
-> 读取模型设置
-> 读取 billing 状态
-> 计算 zhongcao readiness
-> 渲染工作台 / 需要配置 / 已阻断状态
```

## 5. 建议的数据边界

- 平台共享设置由 `window.limeDesktop` 提供。
- 公共类型从 `@limecloud/desktop-platform-contracts` 引入。
- zhongcao 业务数据写入自身 workspace。
- 业务快照不得反写平台会话真相。
- 业务页面只读 platform bootstrap，不直接访问主进程实现。

## 6. 参考 manifest

```json
{
  "appId": "zhongcao",
  "displayName": "种草日记",
  "version": "0.1.0",
  "installMode": "runtime_backed",
  "entries": [
    { "key": "diary", "kind": "workflow", "route": "/diary" },
    { "key": "campaigns", "kind": "page", "route": "/campaigns" },
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
- ready / needs-setup / blocked 能正确区分。
- 业务页面不需要自己实现登录、模型、品牌和 billing。
- 可以用同一套 Host Bridge 语义后续迁移到 Tauri。
