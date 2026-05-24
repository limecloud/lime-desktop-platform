import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
  BillingSnapshot,
  CatalogApp,
  DesktopAppProjection,
  InstalledAppRecord,
  LaunchEntryResult,
  ModelSettings,
  PlatformBootstrap,
  PlatformCapability,
  PlatformNavigationIntent,
  PlatformNavigationTarget,
  PlatformSettings,
  ReadinessResult,
  RuntimeEvent,
  UpdateActionResult,
  UpdateState,
} from '../../shared/types';

export type PlatformModuleKey =
  | 'overview'
  | 'app-center'
  | 'cloud-session'
  | 'model-settings'
  | 'branding'
  | 'billing'
  | 'updates'
  | 'runtime'
  | 'host-bridge'
  | 'diagnostics';

export type PlatformModuleSettingTarget = 'auth' | 'model' | 'branding' | 'billing' | 'platform';

export interface PlatformModuleActionHandlers {
  installApp: (appId: string) => Promise<DesktopAppProjection>;
  updateApp: (appId: string) => Promise<DesktopAppProjection>;
  enableApp: (appId: string) => Promise<DesktopAppProjection>;
  disableApp: (appId: string) => Promise<DesktopAppProjection>;
  uninstallApp: (appId: string) => Promise<unknown>;
  launchEntry: (appId: string, entryKey: string) => Promise<LaunchEntryResult>;
  invokeCapability: (capability: PlatformCapability) => Promise<unknown>;
  login: (tenantName: string, accountEmail: string) => Promise<unknown>;
  logout: () => Promise<unknown>;
  enableLocalModel: () => Promise<ModelSettings>;
  refreshBilling: () => Promise<BillingSnapshot>;
  savePlatformSettings: (settings: PlatformSettings) => Promise<PlatformSettings>;
  checkUpdates: () => Promise<UpdateState>;
  downloadUpdate: (appId: string) => Promise<UpdateActionResult>;
  applyUpdate: (appId: string) => Promise<UpdateActionResult>;
  openPlatformIntent?: (intent: PlatformNavigationIntent) => Promise<unknown>;
  selectModule?: (module: PlatformModuleKey) => void;
}

interface PlatformModuleProps {
  bootstrap: PlatformBootstrap;
  actions: PlatformModuleActionHandlers;
  selectedAppId?: string;
  runtimeResult?: LaunchEntryResult;
  capabilityResult?: unknown;
  busyAction?: string;
  loginTenant: string;
  loginEmail: string;
  onSelectApp: (appId: string) => void;
  onRuntimeResult: (result: LaunchEntryResult | undefined) => void;
  onCapabilityResult: (result: unknown) => void;
  onLoginTenantChange: (value: string) => void;
  onLoginEmailChange: (value: string) => void;
  onBusyActionChange: (value: string | undefined) => void;
}

export const platformModuleLabels: Record<PlatformModuleKey, string> = {
  overview: '平台能力总览',
  'app-center': '平台应用中心',
  'cloud-session': '云端会话',
  'model-settings': '模型设置',
  branding: '品牌',
  billing: '充值',
  updates: '更新',
  runtime: '运行',
  'host-bridge': 'Host Bridge',
  diagnostics: '诊断',
};

export const platformModules: Array<{
  key: PlatformModuleKey;
  label: string;
  target?: PlatformNavigationTarget;
  settingTarget?: PlatformModuleSettingTarget;
}> = [
  { key: 'overview', label: platformModuleLabels.overview },
  { key: 'app-center', label: platformModuleLabels['app-center'], target: 'app-center' },
  { key: 'cloud-session', label: platformModuleLabels['cloud-session'], target: 'auth-settings', settingTarget: 'auth' },
  { key: 'model-settings', label: platformModuleLabels['model-settings'], target: 'model-settings', settingTarget: 'model' },
  { key: 'branding', label: platformModuleLabels.branding, target: 'branding-settings', settingTarget: 'branding' },
  { key: 'billing', label: platformModuleLabels.billing, target: 'billing-settings', settingTarget: 'billing' },
  { key: 'updates', label: platformModuleLabels.updates, target: 'updates' },
  { key: 'runtime', label: platformModuleLabels.runtime, target: 'runtime' },
  { key: 'host-bridge', label: platformModuleLabels['host-bridge'], target: 'diagnostics' },
  { key: 'diagnostics', label: platformModuleLabels.diagnostics, target: 'diagnostics' },
];

export const platformModuleKeys = platformModules.map((module) => module.key);

export function createPlatformIntent(target: PlatformNavigationTarget, reason: string): PlatformNavigationIntent {
  return { target, reason };
}

export function PlatformModuleOutlet(props: PlatformModuleProps & { moduleKey: PlatformModuleKey }): ReactElement {
  if (props.moduleKey === 'overview') {
    return <PlatformOverviewModule {...props} />;
  }
  if (props.moduleKey === 'app-center') {
    return <PlatformAppCenterModule {...props} />;
  }
  if (props.moduleKey === 'cloud-session') {
    return <CloudSessionModule {...props} />;
  }
  if (props.moduleKey === 'model-settings') {
    return <ModelSettingsModule {...props} />;
  }
  if (props.moduleKey === 'branding') {
    return <BrandingModule {...props} />;
  }
  if (props.moduleKey === 'billing') {
    return <BillingModule {...props} />;
  }
  if (props.moduleKey === 'updates') {
    return <UpdatesModule {...props} />;
  }
  if (props.moduleKey === 'runtime') {
    return <RuntimeModule {...props} />;
  }
  if (props.moduleKey === 'host-bridge') {
    return <HostBridgeModule {...props} />;
  }
  return <DiagnosticsModule {...props} />;
}

function PlatformOverviewModule(props: PlatformModuleProps): ReactElement {
  const specs = createCapabilitySummaries(props.bootstrap);

  return (
    <div className="module-layout">
      <ModuleHead
        title="平台能力总览"
        description="这些公共能力由 lime-desktop-platform 提供，Product App 只挂载模块、传入 manifest / workspace / oem profile，并通过公开契约消费 Host Snapshot 和 Capability SDK。"
      />
      <div className="module-metrics">
        <Metric label="公共模块" value={platformModules.length} />
        <Metric label="Agent App" value={props.bootstrap.catalog.length} />
        <Metric label="已安装" value={props.bootstrap.installedApps.length} />
        <Metric label="事件" value={props.bootstrap.diagnostics.counts.runtimeEvents} />
      </div>
      <div className="platform-module-grid">
        {specs.map((spec) => (
          <article className="platform-module-card" key={spec.moduleKey}>
            <span className={`readiness-badge ${spec.state}`}>{readinessStateText(spec.state)}</span>
            <h2>{spec.label}</h2>
            <p>{spec.detail}</p>
            <div className="card-actions">
              <ActionButton variant="secondary" onClick={() => props.actions.selectModule?.(spec.moduleKey)}>
                打开模块
              </ActionButton>
              {spec.target ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    if (!spec.target) {
                      return;
                    }
                    void props.actions.openPlatformIntent?.(
                      createPlatformIntent(spec.target, `从平台能力总览打开 ${spec.label}。`),
                    );
                  }}
                >
                  发送 Intent
                </ActionButton>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PlatformAppCenterModule(props: PlatformModuleProps): ReactElement {
  const [filter, setFilter] = useState<'all' | 'installed' | 'needs-action'>('all');
  const installedAppIds = useMemo(
    () => new Set(props.bootstrap.installedApps.map((item) => item.appId)),
    [props.bootstrap.installedApps],
  );
  const visibleCatalog = props.bootstrap.catalog.filter((catalogApp) => {
    const appId = catalogApp.manifest.appId;
    const installed = installedAppIds.has(appId);
    const projection = props.bootstrap.projections.find((item) => item.appId === appId);

    if (filter === 'installed') {
      return installed;
    }
    if (filter === 'needs-action') {
      return projection?.readiness.state === 'needs-setup' || projection?.readiness.state === 'blocked';
    }
    return true;
  });
  const selectedCatalogApp =
    props.bootstrap.catalog.find((app) => app.manifest.appId === props.selectedAppId) ?? props.bootstrap.catalog[0];
  const selectedProjection = props.bootstrap.projections.find(
    (projection) => projection.appId === selectedCatalogApp?.manifest.appId,
  );
  const selectedInstalled = props.bootstrap.installedApps.find(
    (record) => record.appId === selectedCatalogApp?.manifest.appId,
  );

  return (
    <div className="split-view">
      <section className="primary-panel">
        <ModuleHead title="平台应用中心" description="管理 agentapp package 目录、本地安装、readiness、入口状态和 package 更新。" />
        <div className="table-filter">
          {[
            ['all', '全部'],
            ['installed', '已安装'],
            ['needs-action', '需要处理'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'filter-button active' : 'filter-button'}
              onClick={() => setFilter(key as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="app-table">
          <div className="table-row table-head">
            <span>应用</span>
            <span>来源</span>
            <span>版本</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {visibleCatalog.map((catalogApp) => {
            const appId = catalogApp.manifest.appId;
            const projection = props.bootstrap.projections.find((item) => item.appId === appId);
            const installed = installedAppIds.has(appId);
            const selected = selectedCatalogApp?.manifest.appId === appId;
            const firstEntry = projection?.entryCards[0];

            return (
              <button
                className={selected ? 'table-row app-row selected' : 'table-row app-row'}
                key={appId}
                onClick={() => props.onSelectApp(appId)}
              >
                <span>
                  <strong>{catalogApp.manifest.displayName}</strong>
                  <small>{catalogApp.description}</small>
                </span>
                <span>{catalogApp.sourceKind}</span>
                <span>{catalogApp.latestVersion}</span>
                <span>
                  <ReadinessBadge readiness={installed ? projection?.readiness : undefined} />
                </span>
                <span className="row-actions">
                  {!installed ? (
                    <ActionButton
                      busy={props.busyAction === `install:${appId}`}
                      onClick={() => void runModuleAction(props, `install:${appId}`, () => props.actions.installApp(appId))}
                    >
                      安装
                    </ActionButton>
                  ) : (
                    <ActionButton
                      busy={props.busyAction === `launch:${appId}:${firstEntry?.key}`}
                      disabled={!firstEntry?.enabled}
                      onClick={() =>
                        void runModuleAction(props, `launch:${appId}:${firstEntry?.key}`, async () => {
                          const result = await props.actions.launchEntry(appId, firstEntry?.key ?? 'home');
                          props.onRuntimeResult(result);
                          props.onCapabilityResult(undefined);
                          props.actions.selectModule?.('runtime');
                          return result;
                        })
                      }
                    >
                      启动
                    </ActionButton>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="detail-panel">
        {selectedCatalogApp && selectedProjection ? (
          <PlatformAppDetail
            catalogApp={selectedCatalogApp}
            projection={selectedProjection}
            installedAppIds={installedAppIds}
            selectedInstalled={selectedInstalled}
            actions={props.actions}
            busyAction={props.busyAction}
            run={(key, action) => runModuleAction(props, key, action)}
            onRuntimeResult={props.onRuntimeResult}
            onCapabilityResult={props.onCapabilityResult}
          />
        ) : (
          <div className="empty-state">请选择一个应用。</div>
        )}
      </aside>
    </div>
  );
}

function PlatformAppDetail(props: {
  catalogApp: CatalogApp;
  projection: DesktopAppProjection;
  installedAppIds: Set<string>;
  selectedInstalled?: InstalledAppRecord;
  actions: PlatformModuleActionHandlers;
  busyAction?: string;
  run: <T>(key: string, action: () => Promise<T>) => Promise<T | undefined>;
  onRuntimeResult: (result: LaunchEntryResult | undefined) => void;
  onCapabilityResult: (result: unknown) => void;
}): ReactElement {
  const installed = props.installedAppIds.has(props.catalogApp.manifest.appId);

  return (
    <div className="detail-content">
      <div className="detail-title">
        <div>
          <h2>{props.catalogApp.manifest.displayName}</h2>
          <p>{props.catalogApp.manifest.appId}</p>
        </div>
        <ReadinessBadge readiness={props.projection.readiness} />
      </div>
      <section className="detail-section">
        <h3>Readiness</h3>
        {props.projection.readiness.reasons.length === 0 ? (
          <p className="muted">当前入口可启动。</p>
        ) : (
          <ul className="reason-list">
            {props.projection.readiness.reasons.map((reason) => (
              <li key={`${reason.code}:${reason.message}`}>
                <strong>{reason.code}</strong>
                <span>{reason.message}</span>
                <em>{reason.fixable ? '可修复' : '不可自动修复'}</em>
              </li>
            ))}
          </ul>
        )}
        {props.projection.readiness.setupActions.length > 0 ? (
          <div className="setup-actions">
            {props.projection.readiness.setupActions.map((action) => (
              <ActionButton
                key={action}
                variant="secondary"
                onClick={() => props.actions.selectModule?.(actionToModuleKey(action))}
              >
                {action}
              </ActionButton>
            ))}
          </div>
        ) : null}
      </section>
      <section className="detail-section">
        <h3>入口</h3>
        <div className="entry-list">
          {props.projection.entryCards.map((entry) => (
            <button
              key={entry.key}
              disabled={!entry.enabled}
              onClick={() =>
                void props.run(`launch:${props.projection.appId}:${entry.key}`, async () => {
                  const result = await props.actions.launchEntry(props.projection.appId, entry.key);
                  props.onRuntimeResult(result);
                  props.onCapabilityResult(undefined);
                  props.actions.selectModule?.('runtime');
                  return result;
                })
              }
              className="entry-item"
            >
              <strong>{entry.label}</strong>
              <span>{entry.route}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-section">
        <h3>能力要求</h3>
        <div className="chip-list">
          {props.projection.capabilityPreview.map((capability) => (
            <span className="chip" key={capability}>{capabilityLabel(capability)}</span>
          ))}
        </div>
      </section>
      {props.catalogApp.frameworkHighlights && props.catalogApp.frameworkHighlights.length > 0 ? (
        <section className="detail-section">
          <h3>框架能力</h3>
          <div className="framework-list">
            {props.catalogApp.frameworkHighlights.map((item) => (
              <div className="framework-row" key={item.label}>
                <span className={`readiness-badge ${item.state}`}>{item.state}</span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <div className="detail-actions">
        {!installed ? (
          <ActionButton
            busy={props.busyAction === `install:${props.projection.appId}`}
            onClick={() => void props.run(`install:${props.projection.appId}`, () => props.actions.installApp(props.projection.appId))}
          >
            安装 Package
          </ActionButton>
        ) : props.selectedInstalled?.enabled ? (
          <>
            {props.projection.catalogCard.updateAvailable ? (
              <ActionButton
                busy={props.busyAction === `update:${props.projection.appId}`}
                onClick={() => void props.run(`update:${props.projection.appId}`, () => props.actions.applyUpdate(props.projection.appId))}
              >
                更新 Package
              </ActionButton>
            ) : null}
            <ActionButton
              variant="secondary"
              busy={props.busyAction === `disable:${props.projection.appId}`}
              onClick={() => void props.run(`disable:${props.projection.appId}`, () => props.actions.disableApp(props.projection.appId))}
            >
              禁用入口
            </ActionButton>
            <ActionButton
              variant="secondary"
              busy={props.busyAction === `uninstall:${props.projection.appId}`}
              onClick={() => void props.run(`uninstall:${props.projection.appId}`, () => props.actions.uninstallApp(props.projection.appId))}
            >
              卸载 Package
            </ActionButton>
          </>
        ) : (
          <ActionButton
            busy={props.busyAction === `enable:${props.projection.appId}`}
            onClick={() => void props.run(`enable:${props.projection.appId}`, () => props.actions.enableApp(props.projection.appId))}
          >
            启用入口
          </ActionButton>
        )}
      </div>
      <dl className="metadata-list">
        <div>
          <dt>安装模式</dt>
          <dd>{props.catalogApp.manifest.installMode}</dd>
        </div>
        <div>
          <dt>最近启动</dt>
          <dd>{formatTime(props.selectedInstalled?.lastLaunchedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function CloudSessionModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="module-layout">
      <ModuleHead title="云端会话" description="OAuth、租户身份和 token refresh 由平台管理；Product App 只消费非敏感会话投影。" />
      <Panel title="OAuth / 会话">
        <div className="settings-grid">
          <InfoRow label="状态" value={props.bootstrap.authSession.state} />
          <InfoRow label="租户" value={props.bootstrap.authSession.tenantName ?? '未登录'} />
          <InfoRow label="账号" value={props.bootstrap.authSession.accountEmail ?? '未登录'} />
          <InfoRow label="过期时间" value={formatTime(props.bootstrap.authSession.expiresAt)} />
          <InfoRow label="来源" value={props.bootstrap.authSession.source ?? 'local-dev'} />
          <InfoRow label="Token 暴露给 Product App" value="否" />
        </div>
        <div className="form-grid">
          <label>
            <span>租户名称</span>
            <input value={props.loginTenant} onChange={(event) => props.onLoginTenantChange(event.target.value)} />
          </label>
          <label>
            <span>账号邮箱</span>
            <input value={props.loginEmail} onChange={(event) => props.onLoginEmailChange(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <ActionButton
            busy={props.busyAction === 'auth:login'}
            onClick={() => void runModuleAction(props, 'auth:login', () => props.actions.login(props.loginTenant, props.loginEmail))}
          >
            建立本地开发会话
          </ActionButton>
          <ActionButton
            variant="secondary"
            busy={props.busyAction === 'auth:logout'}
            onClick={() => void runModuleAction(props, 'auth:logout', props.actions.logout)}
          >
            退出会话
          </ActionButton>
        </div>
      </Panel>
      <BoundaryPanel
        items={[
          'OAuth token、refresh token 和凭证安全存储只归平台 Credential Broker。',
          'Product App 不能持久化会话权威事实，只读取 Host Snapshot / bootstrap projection。',
          '需要登录时发送 PlatformNavigationIntent 或挂载本模块。',
        ]}
      />
    </div>
  );
}

function ModelSettingsModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="module-layout">
      <ModuleHead title="模型设置" description="统一保存 provider、默认模型、Key 配置状态和模型 capability；业务 App 不重复实现 provider 设置页。" />
      <Panel title="模型设置">
        <div className="settings-grid">
          <InfoRow label="配置版本" value={props.bootstrap.modelSettings.version} />
          <InfoRow label="默认文本模型" value={props.bootstrap.modelSettings.defaultTextModelId ?? '未设置'} />
          <InfoRow label="默认图片模型" value={props.bootstrap.modelSettings.defaultImageModelId ?? '未设置'} />
          <InfoRow label="最近更新" value={formatTime(props.bootstrap.modelSettings.updatedAt)} />
        </div>
        <div className="provider-list">
          {props.bootstrap.modelSettings.providers.map((provider) => (
            <div className="provider-row" key={provider.id}>
              <div>
                <strong>{provider.displayName}</strong>
                <span>{provider.protocol} / {provider.models.join(', ')}</span>
              </div>
              <StatusPill
                label={provider.enabled ? '已启用' : '未启用'}
                value={provider.apiKeyConfigured ? '凭证已配置' : '缺凭证'}
                tone={provider.enabled && provider.apiKeyConfigured ? 'good' : 'warn'}
              />
            </div>
          ))}
        </div>
        <ActionButton
          busy={props.busyAction === 'model:local'}
          onClick={() => void runModuleAction(props, 'model:local', props.actions.enableLocalModel)}
        >
          启用本地模型配置
        </ActionButton>
      </Panel>
      <BoundaryPanel
        items={[
          '模型 provider、Key、默认模型和策略由平台设置中心保存。',
          'Product App 只通过 capability invoke 请求模型能力。',
          '未配置模型时返回 needs-setup，不允许业务侧伪造生成成功。',
        ]}
      />
    </div>
  );
}

function BrandingModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="module-layout">
      <ModuleHead title="品牌" description="OEM / 品牌投影由平台和 limecore 管理，业务 App 只消费投影做视觉和文案适配。" />
      <Panel title="OEM / 品牌">
        <div className="settings-grid">
          <InfoRow label="状态" value={props.bootstrap.oemProjection.state} />
          <InfoRow label="品牌" value={props.bootstrap.oemProjection.brandName} />
          <InfoRow label="产品" value={props.bootstrap.oemProjection.productName} />
          <InfoRow label="渠道" value={props.bootstrap.oemProjection.channel} />
          <InfoRow label="主题" value={props.bootstrap.oemProjection.theme} />
          <InfoRow label="主色" value={props.bootstrap.oemProjection.primaryColor} />
          <InfoRow label="Logo 文本" value={props.bootstrap.oemProjection.logoText} />
          <InfoRow label="来源" value={props.bootstrap.oemProjection.source ?? 'local-dev'} />
        </div>
      </Panel>
      <BoundaryPanel
        items={[
          'OEM 权威状态来自 limecore / 平台 host-core。',
          'Product App 不保存品牌权威记录，只读取投影。',
          '品牌切换通过 Host Snapshot 和平台变化事件刷新界面。',
        ]}
      />
    </div>
  );
}

function BillingModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="module-layout">
      <ModuleHead title="充值" description="订阅、余额、entitlement 和充值记录由平台管理；业务 App 只显示投影并请求平台裁决。" />
      <Panel title="充值 / 订阅">
        <div className="settings-grid">
          <InfoRow label="状态" value={billingLabel(props.bootstrap.billingState.state)} />
          <InfoRow label="套餐" value={props.bootstrap.billingState.planName ?? '未开通'} />
          <InfoRow label="余额" value={formatBalance(props.bootstrap.billingState)} />
          <InfoRow label="最近检查" value={formatTime(props.bootstrap.billingState.lastCheckedAt)} />
          <InfoRow label="来源" value={props.bootstrap.billingState.source ?? 'local-dev'} />
          <InfoRow label="业务 App 本地账本" value="不保存" />
        </div>
        <ActionButton
          busy={props.busyAction === 'billing:refresh'}
          onClick={() => void runModuleAction(props, 'billing:refresh', props.actions.refreshBilling)}
        >
          刷新充值投影
        </ActionButton>
      </Panel>
      <BoundaryPanel
        items={[
          '套餐、余额、充值记录和 entitlement 只由平台与 limecore 管理。',
          'Product App 不能保存 billing 账本或绕过平台裁决。',
          '模型调用前平台合并 OAuth、billing、模型设置和权限策略。',
        ]}
      />
    </div>
  );
}

function UpdatesModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="module-layout">
      <ModuleHead title="更新" description="拆分 Product App 自身更新、agentapp package 更新和平台底座版本，避免三条生命周期混在一张安装表里。" />
      <Panel title="更新状态">
        <div className="settings-grid">
          <InfoRow label="最近检查" value={formatTime(props.bootstrap.updateState.checkedAt)} />
          <InfoRow label="可用 Package 更新" value={`${props.bootstrap.updateState.availableUpdates.length}`} />
          <InfoRow label="已下载 Artifact" value={`${props.bootstrap.updateState.downloadedUpdates?.length ?? 0}`} />
          <InfoRow label="Control Plane" value={props.bootstrap.updateState.controlPlane?.source ?? 'samples'} />
        </div>
        <div className="button-row">
          <ActionButton
            busy={props.busyAction === 'updates:check'}
            onClick={() => void runModuleAction(props, 'updates:check', props.actions.checkUpdates)}
          >
            检查更新
          </ActionButton>
        </div>
      </Panel>
      <Panel title="Package 更新候选">
        <div className="update-list">
          {props.bootstrap.updateState.availableUpdates.length === 0 ? (
            <p className="muted">暂无 agentapp package 更新。</p>
          ) : (
            props.bootstrap.updateState.availableUpdates.map((candidate) => (
              <div className="update-row" key={`${candidate.appId}:${candidate.nextVersion}`}>
                <div>
                  <strong>{candidate.appId}</strong>
                  <span>{`${candidate.currentVersion} -> ${candidate.nextVersion} / ${candidate.targetKind}`}</span>
                </div>
                <div className="button-row">
                  <ActionButton
                    variant="secondary"
                    busy={props.busyAction === `download:${candidate.appId}`}
                    disabled={!candidate.artifact}
                    onClick={() => void runModuleAction(props, `download:${candidate.appId}`, () => props.actions.downloadUpdate(candidate.appId))}
                  >
                    下载
                  </ActionButton>
                  <ActionButton
                    busy={props.busyAction === `apply:${candidate.appId}`}
                    onClick={() => void runModuleAction(props, `apply:${candidate.appId}`, () => props.actions.applyUpdate(candidate.appId))}
                  >
                    应用
                  </ActionButton>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
      <BoundaryPanel
        items={[
          'Product App 自身安装包更新由产品 updater 或系统安装器负责。',
          'agentapp package 更新写入 package installed catalog，targetKind 固定为 agentapp-package。',
          'lime-desktop-platform v1 随 Product App 构建发布，不设计运行时单独安装平台模块。',
        ]}
      />
    </div>
  );
}

function RuntimeModule(props: PlatformModuleProps): ReactElement {
  const runtimeEvents = props.runtimeResult?.runtimeEvents ?? props.bootstrap.runtimeEvents.slice(-20).reverse();
  const selectedProjection = props.bootstrap.projections.find((projection) => projection.appId === props.selectedAppId);

  return (
    <div className="runtime-layout">
      <ModuleHead title="运行" description="查看 Host Snapshot、bridge 消息、agent execution backend 和 capability 调用结果。" />
      {props.runtimeResult?.snapshot ? (
        <div className="runtime-grid">
          <Panel title="Host Snapshot">
            <JsonBlock value={props.runtimeResult.snapshot} />
          </Panel>
          <Panel title="Bridge Message">
            <JsonBlock value={props.runtimeResult.bridgeMessage} />
          </Panel>
        </div>
      ) : (
        <Panel title={selectedProjection?.displayName ?? '未选择应用'}>
          <p className="muted">尚未启动入口，或当前 readiness 不允许启动。</p>
          {props.runtimeResult ? <JsonBlock value={props.runtimeResult.readiness} /> : null}
        </Panel>
      )}
      {selectedProjection ? (
        <Panel title="Capability Invoke">
          <div className="chip-list">
            {selectedProjection.capabilityPreview.map((capability) => (
              <ActionButton
                key={capability}
                variant="secondary"
                disabled={!props.runtimeResult?.snapshot}
                busy={props.busyAction === `capability:${capability}`}
                onClick={() =>
                  void runModuleAction(props, `capability:${capability}`, async () => {
                    const result = await props.actions.invokeCapability(capability);
                    props.onCapabilityResult(result);
                    return result;
                  })
                }
              >
                {capabilityLabel(capability)}
              </ActionButton>
            ))}
          </div>
          {props.capabilityResult ? <JsonBlock value={props.capabilityResult} /> : <p className="muted">启动入口后可调用宿主能力。</p>}
        </Panel>
      ) : null}
      <EventList events={runtimeEvents} />
    </div>
  );
}

function HostBridgeModule(props: PlatformModuleProps): ReactElement {
  const latestRuntime = props.runtimeResult;

  return (
    <div className="module-layout">
      <ModuleHead title="Host Bridge" description="Host Bridge 只传递公开协议消息和非敏感 projection，Product App 不直接访问平台主进程或内部 service。" />
      <div className="runtime-grid">
        <Panel title="协议">
          <div className="settings-grid">
            <InfoRow label="Bridge Protocol" value="lime.agentApp.bridge" />
            <InfoRow label="Runtime Protocol" value="lime.runtimeBridge" />
            <InfoRow label="Host Kind" value={props.bootstrap.hostProfile.hostKind} />
            <InfoRow label="Host Version" value={props.bootstrap.hostProfile.hostVersion} />
          </div>
        </Panel>
        <Panel title="最近 Bridge Message">
          {latestRuntime?.bridgeMessage ? <JsonBlock value={latestRuntime.bridgeMessage} /> : <p className="muted">尚未启动入口。</p>}
        </Panel>
      </div>
      <BoundaryPanel
        items={[
          'Host Bridge payload 不包含 token、模型 Key、billing 账本或 OEM 权威数据。',
          'renderer 只使用公开 bridge / capability 协议。',
          'Host Bridge 失败必须以 blocked / needs-setup 可追溯返回。',
        ]}
      />
    </div>
  );
}

function DiagnosticsModule(props: PlatformModuleProps): ReactElement {
  return (
    <div className="debug-layout">
      <ModuleHead title="诊断" description="检查 manifest、projection、readiness、存储路径、control plane 和运行事件。" />
      <div className="runtime-grid">
        <Panel title="Diagnostics">
          <JsonBlock value={props.bootstrap.diagnostics} />
        </Panel>
        <Panel title="Projections">
          <JsonBlock value={props.bootstrap.projections} />
        </Panel>
      </div>
      <EventList events={props.bootstrap.runtimeEvents.slice(-20).reverse()} />
    </div>
  );
}

function ModuleHead(props: { title: string; description: string }): ReactElement {
  return (
    <div className="section-head module-head">
      <div>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
    </div>
  );
}

function BoundaryPanel(props: { items: string[] }): ReactElement {
  return (
    <Panel title="边界">
      <div className="boundary-list">
        {props.items.map((item) => (
          <div className="boundary-row" key={item}>
            <strong>✓</strong>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel(props: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="panel">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function Metric(props: { label: string; value: string | number }): ReactElement {
  return (
    <div className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function StatusPill(props: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }): ReactElement {
  return (
    <span className={`status-pill ${props.tone ?? ''}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </span>
  );
}

function ReadinessBadge(props: { readiness?: ReadinessResult }): ReactElement {
  if (!props.readiness) {
    return <span className="readiness-badge neutral">未安装</span>;
  }

  return (
    <span className={`readiness-badge ${props.readiness.state}`}>
      {readinessLabel(props.readiness)}
    </span>
  );
}

function InfoRow(props: { label: string; value: string }): ReactElement {
  return (
    <div className="info-row">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function JsonBlock(props: { value: unknown }): ReactElement {
  return <pre className="json-block">{JSON.stringify(props.value, null, 2)}</pre>;
}

function EventList(props: { events: RuntimeEvent[] }): ReactElement {
  return (
    <Panel title="运行事件">
      <div className="event-list">
        {props.events.length === 0 ? (
          <p className="muted">暂无事件。</p>
        ) : (
          props.events.map((event) => (
            <div className={`event-row ${event.level}`} key={event.id}>
              <time>{formatTime(event.timestamp)}</time>
              <strong>{event.level}</strong>
              <span>{event.message}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function ActionButton(props: {
  children: string;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className={props.variant === 'secondary' ? 'secondary-button' : 'primary-button'}
      disabled={props.disabled || props.busy}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.busy ? '处理中...' : props.children}
    </button>
  );
}

async function runModuleAction<T>(
  props: Pick<PlatformModuleProps, 'onBusyActionChange'>,
  key: string,
  action: () => Promise<T>,
): Promise<T | undefined> {
  try {
    props.onBusyActionChange(key);
    return await action();
  } finally {
    props.onBusyActionChange(undefined);
  }
}

function createCapabilitySummaries(bootstrap: PlatformBootstrap): Array<{
  moduleKey: PlatformModuleKey;
  label: string;
  state: ReadinessResult['state'] | 'dev-projection';
  detail: string;
  target?: PlatformNavigationTarget;
}> {
  return [
    {
      moduleKey: 'app-center',
      label: '平台应用中心',
      state: 'ready',
      detail: `${bootstrap.catalog.length} 个目录条目，${bootstrap.installedApps.length} 个已安装 package。`,
      target: 'app-center',
    },
    {
      moduleKey: 'cloud-session',
      label: '云端会话',
      state: bootstrap.authSession.state === 'authenticated' ? 'ready' : 'needs-setup',
      detail: bootstrap.authSession.tenantName ?? '未登录。',
      target: 'auth-settings',
    },
    {
      moduleKey: 'model-settings',
      label: '模型设置',
      state: bootstrap.modelSettings.defaultTextModelId ? 'ready' : 'needs-setup',
      detail: bootstrap.modelSettings.defaultTextModelId ?? '等待默认文本模型。',
      target: 'model-settings',
    },
    {
      moduleKey: 'branding',
      label: '品牌',
      state: bootstrap.oemProjection.state === 'branded' || bootstrap.oemProjection.state === 'customized' ? 'ready' : 'dev-projection',
      detail: `${bootstrap.oemProjection.brandName} / ${bootstrap.oemProjection.productName}`,
      target: 'branding-settings',
    },
    {
      moduleKey: 'billing',
      label: '充值',
      state: bootstrap.billingState.state === 'active' ? 'ready' : 'needs-setup',
      detail: `${billingLabel(bootstrap.billingState.state)} / ${formatBalance(bootstrap.billingState)}`,
      target: 'billing-settings',
    },
    {
      moduleKey: 'updates',
      label: '更新',
      state: bootstrap.updateState.availableUpdates.length > 0 ? 'needs-setup' : 'ready',
      detail: `${bootstrap.updateState.availableUpdates.length} 个 agentapp package 更新候选。`,
      target: 'updates',
    },
    {
      moduleKey: 'runtime',
      label: '运行',
      state: bootstrap.runtimeEvents.length > 0 ? 'ready' : 'dev-projection',
      detail: `${bootstrap.runtimeEvents.length} 条运行事件。`,
      target: 'runtime',
    },
    {
      moduleKey: 'host-bridge',
      label: 'Host Bridge',
      state: 'ready',
      detail: `${bootstrap.hostProfile.hostKind} / ${bootstrap.hostProfile.hostVersion}`,
      target: 'diagnostics',
    },
  ];
}

function actionToModuleKey(action: string): PlatformModuleKey {
  if (action.includes('auth')) {
    return 'cloud-session';
  }
  if (action.includes('model')) {
    return 'model-settings';
  }
  if (action.includes('billing')) {
    return 'billing';
  }
  if (action.includes('oem') || action.includes('brand')) {
    return 'branding';
  }
  return 'overview';
}

function readinessLabel(readiness: ReadinessResult): string {
  return readinessStateText(readiness.state);
}

function readinessStateText(state: ReadinessResult['state'] | 'dev-projection'): string {
  const labels: Record<ReadinessResult['state'] | 'dev-projection', string> = {
    ready: '可启动',
    'needs-setup': '待配置',
    blocked: '已阻断',
    disabled: '已禁用',
    'dev-projection': '开发投影',
  };
  return labels[state];
}

function capabilityLabel(capability: PlatformCapability): string {
  const labels: Record<PlatformCapability, string> = {
    'lime.cloudSession': '云端会话',
    'lime.modelSettings': '模型设置',
    'lime.branding': '品牌投影',
    'lime.billing': '充值订阅',
    'lime.appUpdates': 'Package 更新',
    'lime.download': '下载',
    'lime.permissions': '权限',
    'lime.diagnostics': '诊断',
    'lime.agentExecution': 'Agent 执行',
  };

  return labels[capability] ?? capability;
}

function billingLabel(state: BillingSnapshot['state']): string {
  const labels: Record<BillingSnapshot['state'], string> = {
    unknown: '未知',
    active: '正常',
    'needs-payment': '需要处理',
    suspended: '已暂停',
  };

  return labels[state];
}

function formatBalance(snapshot: BillingSnapshot): string {
  if (typeof snapshot.balanceCents !== 'number') {
    return '未记录';
  }

  return `${snapshot.currency ?? 'CNY'} ${(snapshot.balanceCents / 100).toFixed(2)}`;
}

function formatTime(value?: string): string {
  if (!value) {
    return '未记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
