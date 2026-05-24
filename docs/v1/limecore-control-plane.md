---
title: limecore 控制面接入
status: draft
repo: lime-desktop-platform
---

# limecore 控制面接入

## 1. 事实源声明

`limecore` 是应用目录、发布元数据、租户身份、OEM 和 billing 的云端权威来源。
`lime-desktop-platform` 只负责本地投影、下载校验、安装记录和运行态裁决。

当前代码分类：

| 路径 | 分类 | 说明 |
| --- | --- | --- |
| `src/main/services/limecoreControlPlane.ts` | current | 唯一云端目录适配边界。 |
| `src/main/services/releaseDownloader.ts` | current | 唯一 release artifact 下载和 sha256 校验边界。 |
| `src/main/services/seedCatalog.ts` | compat | 未配置 `limecore` 或同步失败时的 samples fallback。 |
| `samples/*` | compat | 开发态 catalog fixture，不是云端事实源。 |

## 2. 环境变量

| 变量 | 用途 |
| --- | --- |
| `LIMECORE_CATALOG_URL` | 直接指定 catalog endpoint。优先级最高。 |
| `LIMECORE_BASE_URL` | 指定 limecore base URL。未设置 `LIMECORE_CATALOG_URL` 时使用。 |
| `LIMECORE_CATALOG_PATH` | catalog path，默认 `/desktop/v1/catalog`。 |
| `LIMECORE_AUTH_TOKEN` | 可选 bearer token。 |
| `LIMECORE_ACCESS_TOKEN` | `LIMECORE_AUTH_TOKEN` 的兼容别名。 |

未配置 catalog endpoint 时，平台只加载 `samples/*`。
已配置但请求失败时，平台回退到 `samples/*`，并在 diagnostics 的 `controlPlane.lastError` 留痕。

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

每个 `CatalogApp` 可携带 `releaseArtifact`：

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

## 4. 更新链路

1. `updates:check` 强制同步 `limecore` catalog。
2. 平台对比本地 `installed-apps.json` 和 catalog `latestVersion`。
3. 有 `releaseArtifact` 时，`updates:download` 下载 artifact 并校验 `sha256` 和可选 `sizeBytes`。
4. 校验通过的 artifact 写入 `.lime-desktop/app-artifacts/{appId}/{version}/`。
5. `updates:apply` 只接受已校验 artifact；缺失或 hash 不匹配时返回 `blocked`。
6. sample fallback 没有 artifact 时，仍可用于开发态 projection，但不得伪装成真实下载成功。

## 5. 验证

`npm run smoke:electron` 会启动本地 mock `limecore`：

- 通过 `LIMECORE_CATALOG_URL` 拉取 catalog。
- 安装 `oem-starter` 旧版本。
- 切换 mock catalog 到 `0.1.1`。
- 下载本地 HTTP release artifact。
- 校验 sha256。
- 应用更新并确认本地安装记录版本和 packageHash。

Smoke 输出中必须包含：

```json
{
  "controlPlaneSource": "limecore",
  "limecoreRelease": true
}
```

## 6. 未完成

- OAuth / billing / OEM 仍是本地开发态投影，尚未接入 `limecore` 真实端点。
- release artifact 只完成下载校验和本地安装记录切换，尚未完成回滚包管理和签名验证。
- Tauri adapter 尚未实现。
