# @limecloud/desktop-platform-react

`@limecloud/desktop-platform-react` 是 Lime Desktop Platform 的公共 React UI modules 包。`zhongcao`、`content-studio` 和后续 OEM Product App 挂载这个包，而不是在各自仓库重写 OAuth、模型设置、充值、品牌、更新、运行、Host Bridge 或平台应用中心页面。

平台应用中心模块已迁移 Lime 的应用中心产品形态：顶部统计、状态 / 来源筛选、卡片网格、分页、详情弹窗、常用入口、readiness、能力要求、框架能力、安装 / 打开 / 更新 / 启停 / 卸载动作。迁移只复用 UI 和交互结构，数据源与操作仍走 `PlatformBootstrap`、`DesktopAppProjection` 和 `PlatformModuleActionHandlers`，不引入 Lime Tauri 私有命令或业务状态。

## 边界

- 本包只提供公共平台页面组件、模块清单和导航 intent helper。
- 本包不持久化 token、模型 Key、billing 账本、OEM 权威配置或平台安装表。
- 宿主 App 必须传入 `PlatformBootstrap` 和 `PlatformModuleActionHandlers`。
- 类型契约来自 `@limecloud/desktop-platform-contracts`。

## 最小用法

```tsx
import {
  PlatformAccountEntry,
  PlatformSettingsDialog,
  PlatformModuleOutlet,
  platformModules,
  type PlatformModuleActionHandlers,
  type PlatformModuleKey,
} from '@limecloud/desktop-platform-react';

function PlatformPage(props: {
  moduleKey: PlatformModuleKey;
  actions: PlatformModuleActionHandlers;
}) {
  return (
    <PlatformModuleOutlet
      moduleKey={props.moduleKey}
      bootstrap={bootstrap}
      actions={props.actions}
      selectedAppId={selectedAppId}
      loginTenant={loginTenant}
      loginEmail={loginEmail}
      onSelectApp={setSelectedAppId}
      onRuntimeResult={setRuntimeResult}
      onCapabilityResult={setCapabilityResult}
      onLoginTenantChange={setLoginTenant}
      onLoginEmailChange={setLoginEmail}
      onBusyActionChange={setBusyAction}
    />
  );
}
```

左下角账号入口、通用设置、模型设置和账号设置同样由本包提供。Product App 只传入 Host Snapshot / bootstrap 的非敏感账号投影、模型设置投影与平台 intent handler，不在业务仓库复制设置 UI。

主题页由本包完整承载：外观模式、颜色主题、对话字体大小和衬线体开关先维护 UI 草稿状态，真实保存后续接入宿主 host-core settings action handler。

模型设置页由本包完整承载：左侧展示启用模型列表，右侧展示当前 provider 配置卡；点击“添加模型”会切换到独立供应商选择视图，覆盖推荐服务、国内服务、聚合平台、海外平台和本地模型。选择供应商后回到同一套配置卡。provider 图标参考 Lime 现有 `src/icons/providers` 图标体系并内联到本包；没有图标映射的 provider 暂不展示。当前组件只维护 UI 草稿状态，真实 provider、API Key 和默认模型保存必须由宿主 host-core action handler 接入，不能落到 Product App。

语音模型页由本包完整承载：包含语音输入快捷键、Fn / 自定义快捷键切换、启用开关、SenseVoice Small 本地模型、安装状态、删除 / 安装模型、音频 / 视频 / 实时录音测试入口和所有转录历史。当前组件只维护 UI 草稿状态，真实快捷键注册、模型下载 / 删除、文件选择、录音权限、SenseVoice / FunASR 转写和历史持久化必须由宿主 host-core ASR action handler 接入，不能落到 Product App。

搜索服务页由本包完整承载：按“已启用（拖拽排序优先级）”和“可用服务”分区展示 Tavily、Bing Search、秘塔搜索、Exa、Brave Search、SerpAPI、Serper、Google CSE 和 Firecrawl；启用卡片内直接提供 API Key 输入、获取 Key 入口，Google CSE 额外提供 `Custom Search Engine ID (cx)` 输入。当前组件只维护 UI 草稿状态，真实 API Key 加密保存、provider 健康检查、WebSearch 路由和失败回退必须由宿主 host-core search action handler / Credential Broker 接入，不能落到 Product App。

网络页由本包完整承载：包含系统代理检测提示、代理服务器开关、协议 / 地址 / 端口输入、代理认证、代理白名单、模型供应商自动白名单展开项和代理地址预览。当前组件只维护 UI 草稿状态，真实系统代理检测、代理配置保存、`HTTP_PROXY` / `HTTPS_PROXY` 环境变量注入和 Claude CLI 子进程网络隔离必须由宿主 host-core settings / network action handler 接入，Product App 不能保存代理配置或覆盖系统代理。

关于页由本包完整承载：包含品牌 / logo 预留位、版本号、自动检查更新开关、检查更新、查看更新日志、打开日志目录和版权信息。Product App 只能传入 `about` 投影或自定义 logo 节点；真实更新检查、更新日志和日志目录打开由宿主 updater / diagnostics action handler 接入，不能落到 Product App。
