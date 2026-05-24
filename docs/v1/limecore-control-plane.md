---
title: limecore 控制面接入
status: draft
repo: lime-desktop-platform
---

# limecore 控制面接入

## 1. 事实源声明

`limecore` 是应用目录、发布元数据、租户身份、OEM 和 billing 的云端权威来源。
`lime-desktop-platform` 只负责本地投影、agentapp package 下载校验、package 安装记录和运行态裁决。

当前代码分类：

| 路径 | 分类 | 说明 |
| --- | --- | --- |
| `src/main/services/limecoreControlPlane.ts` | current | 唯一云端目录、OAuth、billing 和 OEM 投影适配边界。 |
| `src/main/services/releaseDownloader.ts` | current | 唯一 agentapp package release artifact 下载和 sha256 校验边界。 |
| `src/main/services/seedCatalog.ts` | compat | 未配置 `limecore` 或同步失败时的 samples fallback。 |
| `samples/*` | compat | 开发态 catalog fixture，不是云端事实源。 |

## 2. 环境变量

| 变量 | 用途 |
| --- | --- |
| `LIMECORE_CATALOG_URL` | 直接指定 catalog endpoint。优先级最高。 |
| `LIMECORE_BASE_URL` | 指定 limecore base URL。未设置 `LIMECORE_CATALOG_URL` 时使用。 |
| `LIMECORE_CATALOG_PATH` | catalog path，默认 `/desktop/v1/catalog`。 |
| `LIMECORE_SESSION_URL` | 直接指定 OAuth / session endpoint。 |
| `LIMECORE_SESSION_PATH` | session path，默认 `/desktop/v1/session`。 |
| `LIMECORE_BILLING_URL` | 直接指定 billing endpoint。 |
| `LIMECORE_BILLING_PATH` | billing path，默认 `/desktop/v1/billing`。 |
| `LIMECORE_OEM_URL` | 直接指定 OEM projection endpoint。 |
| `LIMECORE_OEM_PATH` | OEM path，默认 `/desktop/v1/oem`。 |
| `LIMECORE_AUTH_TOKEN` | 可选 bearer token。 |
| `LIMECORE_ACCESS_TOKEN` | `LIMECORE_AUTH_TOKEN` 的兼容别名。 |

未配置 catalog endpoint 时，平台只加载 `samples/*`。
已配置但请求失败时，平台回退到 `samples/*`，并在 diagnostics 的 `controlPlane.lastError` 留痕。

OAuth、billing 和 OEM 端点可独立配置。请求失败时保留本地开发态投影，并分别在：

- `controlPlane.sessionLastError`
- `controlPlane.billingLastError`
- `controlPlane.oemLastError`

中留痕。

## 3. Catalog 响应

Endpoint 可以返回 `CatalogApp[]`，也可以返回对象包裹：

```json
{
  "catalog": []
}
```

也兼容：

```json
{
  "apps": []
}
```

每个 `CatalogApp` 可携带 agentapp package `releaseArtifact`：

```json
{
  "manifest": {
    "appId": "oem-starter",
    "displayName": "OEM 样板应用",
    "version": "0.1.0",
    "installMode": "in_lime",
    "entries": [],
    "requires": {
      "sdkVersion": "1.0.0",
      "capabilities": ["lime.appUpdates"]
    }
  },
  "sourceKind": "cloud",
  "description": "示例",
  "categories": ["OEM"],
  "latestVersion": "0.1.1",
  "updatedAt": "2026-05-24T00:00:00.000Z",
  "releaseNotes": ["示例更新"],
  "releaseArtifact": {
    "url": "https://limecore.example/releases/oem-starter-0.1.1.tgz",
    "sha256": "hex-encoded-sha256",
    "sizeBytes": 12345,
    "fileName": "oem-starter-0.1.1.tgz"
  }
}
```

## 4. 更新链路边界

### 4.1 Agent App Package 更新

1. `updates:check` 强制同步 `limecore` catalog。
2. 平台对比本地 `installed-apps.json` 和 catalog `latestVersion`。
3. 有 `releaseArtifact` 时，`updates:download` 下载 agentapp package artifact 并校验 `sha256` 和可选 `sizeBytes`。
4. 校验通过的 artifact 写入 `.lime-desktop/app-artifacts/{appId}/{version}/`。
5. `updates:apply` 只接受已校验 artifact；缺失或 hash 不匹配时返回 `blocked`，并保留旧 package。
6. sample fallback 没有 artifact 时，仍可用于开发态 projection，但不得伪装成真实下载成功。

### 4.2 Product App 自身更新

Product App 自身更新不写 `installed-apps.json`，也不复用 agentapp package installed catalog。

职责边界：

- `limecore` 可以提供 Product App release metadata、channel、签名、公钥指纹和下载地址。
- Product App updater 负责下载、校验、替换安装包和重启。
- `lime-desktop-platform` 在 v1 只提供更新投影、设置入口、诊断和 `lime.appUpdates` capability。
- `lime-desktop-platform` 作为 Product App 依赖随安装包发布，不在运行时单独下载或替换自身模块。

如果未来需要平台底座热更新，必须新增独立 ADR 和签名 / 回滚 / 兼容策略，不能复用 agentapp package 安装表。

## 5. OAuth / billing / OEM 投影

### 5.1 Session

默认 endpoint：`/desktop/v1/session`

- `GET` 返回 `CloudSessionSnapshot`
- `POST` 接收 `LoginInput`，返回 `CloudSessionSnapshot`
- `DELETE` 退出会话，返回空响应或退出后的 `CloudSessionSnapshot`

平台只保存 session 投影，不把 OAuth token 暴露给业务 App。

### 5.2 Billing

默认 endpoint：`/desktop/v1/billing`

- `GET` 返回 `BillingSnapshot`
- 返回值会标记 `source: "limecore"`
- 请求失败时继续使用本地只读投影，并标记 `source: "local-dev"`

### 5.3 OEM

默认 endpoint：`/desktop/v1/oem`

- `GET` 返回 `OEMProjection`
- 平台使用它投影品牌名、产品名、渠道、主题、主色和 logo 文案
- 业务 App 只能消费投影，不反写品牌事实

## 6. 验证

`npm run smoke:electron` 会启动本地 mock `limecore`：

- 通过 `LIMECORE_CATALOG_URL` 拉取 catalog。
- 通过 `LIMECORE_SESSION_URL` 建立 OAuth session 投影。
- 通过 `LIMECORE_BILLING_URL` 拉取 billing 投影。
- 通过 `LIMECORE_OEM_URL` 拉取 OEM 投影。
- 安装 `oem-starter` 旧版本。
- 切换 mock catalog 到 `0.1.1`。
- 下载本地 HTTP release artifact。
- 校验 sha256。
- 应用 agentapp package 更新并确认本地 package 安装记录版本和 packageHash。

Smoke 输出中必须包含：

```json
{
  "controlPlaneSource": "limecore",
  "loginSource": "limecore",
  "billingSource": "limecore",
  "oemSource": "limecore",
  "limecoreRelease": true
}
```

## 7. 未完成

- OAuth / billing / OEM 已具备端点适配和 smoke 验证；生产 OAuth 授权 UI、token 安全存储和真实服务错误码映射仍未完成。
- agentapp package release artifact 只完成下载校验和本地安装记录切换，尚未完成回滚包管理和签名验证。
- Product App 自身更新目前只定义了职责边界，真实 updater 接入仍未完成。
- Tauri adapter 尚未实现。
