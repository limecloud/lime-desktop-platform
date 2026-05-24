import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, DragEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { PlatformAppCenterModule } from './modules/appCenterModule';
import { PlatformAboutSettingsPage, aboutSettingsStyles } from './settings/aboutSettings';
import type { PlatformAboutSettingsProjection } from './settings/aboutSettings';
import { PlatformNetworkSettingsPage, networkSettingsStyles } from './settings/networkSettings';
import type {
  BillingSnapshot,
  DesktopAppProjection,
  HostSnapshot,
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
} from '@limecloud/desktop-platform-contracts';

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
export type PlatformSettingsPageKey =
  | 'general'
  | 'personalization'
  | 'theme'
  | 'daily-review'
  | 'model'
  | 'usage'
  | 'voice-model'
  | 'gateway'
  | 'bot-chat'
  | 'search'
  | 'network'
  | 'data'
  | 'account'
  | 'about';

export interface PlatformIntentResultView {
  ok: boolean;
  target: string;
  message: string;
  readiness?: {
    state: string;
  };
}

export interface PlatformAccountProjection {
  oauthState?: 'unauthenticated' | 'authenticated' | 'expired';
  tenantName?: string;
  accountEmail?: string;
}

export interface PlatformModelProviderProjection {
  id: string;
  displayName: string;
  description?: string;
  protocol?: string;
  enabled?: boolean;
  apiKeyConfigured?: boolean;
  baseUrl?: string;
  models: string[];
}

export interface PlatformModelSettingsProjection {
  version?: string;
  updatedAt?: string;
  defaultTextModelId?: string;
  providers: PlatformModelProviderProjection[];
}

export type { PlatformAboutSettingsProjection } from './settings/aboutSettings';

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

export function getAccountProjectionFromHostSnapshot(snapshot?: HostSnapshot | null): PlatformAccountProjection {
  return {
    oauthState: snapshot?.oauthState,
    tenantName: snapshot?.tenantName,
    accountEmail: snapshot?.accountEmail,
  };
}

export function getAccountProjectionFromBootstrap(bootstrap?: PlatformBootstrap | null): PlatformAccountProjection {
  return {
    oauthState: bootstrap?.authSession.state,
    tenantName: bootstrap?.authSession.tenantName,
    accountEmail: bootstrap?.authSession.accountEmail,
  };
}

export function getModelSettingsProjectionFromHostSnapshot(snapshot?: HostSnapshot | null): PlatformModelSettingsProjection {
  return {
    version: snapshot?.modelSettingsVersion,
    defaultTextModelId: snapshot?.modelSettingsVersion ? 'claude-default' : undefined,
    providers: createDefaultModelProviderProjection(snapshot?.modelSettingsVersion),
  };
}

export function getModelSettingsProjectionFromBootstrap(bootstrap?: PlatformBootstrap | null): PlatformModelSettingsProjection {
  if (!bootstrap) {
    return { providers: createDefaultModelProviderProjection() };
  }

  return {
    version: bootstrap.modelSettings.version,
    updatedAt: bootstrap.modelSettings.updatedAt,
    defaultTextModelId: bootstrap.modelSettings.defaultTextModelId,
    providers: bootstrap.modelSettings.providers.map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      protocol: provider.protocol,
      enabled: provider.enabled,
      apiKeyConfigured: provider.apiKeyConfigured,
      baseUrl: provider.baseUrl,
      models: provider.models,
    })),
  };
}

export function PlatformAccountEntry(props: {
  account?: PlatformAccountProjection | null;
  onOpenSettingsPage: (page: PlatformSettingsPageKey) => void;
  className?: string;
  style?: CSSProperties;
}): ReactElement {
  const account = props.account ?? {};
  const accountReady = account.oauthState === 'authenticated';
  const accountEmail = getAccountEmail(account);
  const accountState = getAccountStateLabel(account);

  return (
    <div className={`lime-account-entry${props.className ? ` ${props.className}` : ''}`} style={props.style}>
      <style>{platformSettingsStyles}</style>
      <div className="lime-account-entry-avatar" aria-hidden="true">{getAccountAvatarLetter(account)}</div>
      <button className="lime-account-entry-summary" type="button" onClick={() => props.onOpenSettingsPage('account')}>
        <strong>{accountEmail}</strong>
        <span className={accountReady ? 'ready' : ''}>{accountState}</span>
      </button>
      <button className="lime-account-entry-settings" type="button" onClick={() => props.onOpenSettingsPage('general')} aria-label="打开设置">
        <span aria-hidden="true">⚙</span>
      </button>
    </div>
  );
}

export function PlatformSettingsDialog(props: {
  about?: PlatformAboutSettingsProjection | null;
  account?: PlatformAccountProjection | null;
  activePage: PlatformSettingsPageKey;
  latestIntentResult?: PlatformIntentResultView;
  modelSettings?: PlatformModelSettingsProjection | null;
  onSelectPage: (page: PlatformSettingsPageKey) => void;
  onClose: () => void;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  const account = props.account ?? {};
  const email = getAccountEmail(account);
  const nickname = account.tenantName ?? '未设置';
  const accountState = getAccountStateLabel(account);
  const accountReady = account.oauthState === 'authenticated';
  const sessionActionLabel = accountReady ? '打开账号 / 退出登录' : '打开登录';
  const activeNavItem = settingsNavItems.find((item) => item.key === props.activePage) ?? settingsNavItems[0];

  return (
    <div className="lime-settings-overlay" role="presentation">
      <style>{`${platformSettingsStyles}${networkSettingsStyles}${aboutSettingsStyles}`}</style>
      <section className="lime-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="lime-settings-title">
        <aside className="lime-settings-nav-panel">
          <div className="lime-settings-nav-title">设置 ⌘,</div>
          <nav className="lime-settings-nav-list" aria-label="设置分类">
            {settingsNavItems.map((item) => (
              <button
                className={props.activePage === item.key ? 'lime-settings-nav-item active' : 'lime-settings-nav-item'}
                key={item.key}
                type="button"
                onClick={() => props.onSelectPage(item.key)}
              >
                <span className="lime-settings-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="lime-settings-content">
          <button className="lime-settings-close" type="button" onClick={props.onClose} aria-label="关闭设置">
            ×
          </button>
          <h1 id="lime-settings-title">{activeNavItem.label}</h1>
          {activeNavItem.description ? (
            <p className="lime-settings-page-description">
              {activeNavItem.description}
              {props.activePage === 'model' ? (
                <button
                  className="lime-settings-inline-link"
                  type="button"
                  onClick={() => void props.onOpenPlatformIntent({ target: 'model-settings', reason: '从公共模型设置页打开配置指南。' })}
                >
                  配置指南
                </button>
              ) : null}
            </p>
          ) : null}

          {props.activePage === 'general' ? (
            <PlatformGeneralSettingsPage />
          ) : props.activePage === 'theme' ? (
            <PlatformThemeSettingsPage />
          ) : props.activePage === 'model' ? (
            <PlatformModelSettingsPage
              modelSettings={props.modelSettings ?? { providers: createDefaultModelProviderProjection() }}
              onOpenPlatformIntent={props.onOpenPlatformIntent}
            />
          ) : props.activePage === 'voice-model' ? (
            <PlatformVoiceModelSettingsPage />
          ) : props.activePage === 'search' ? (
            <PlatformSearchServiceSettingsPage />
          ) : props.activePage === 'network' ? (
            <PlatformNetworkSettingsPage />
          ) : props.activePage === 'account' ? (
            <PlatformAccountSettingsPage
              accountReady={accountReady}
              accountState={accountState}
              avatarLetter={getAccountAvatarLetter(account)}
              email={email}
              latestIntentResult={props.latestIntentResult}
              nickname={nickname}
              sessionActionLabel={sessionActionLabel}
              onOpenPlatformIntent={props.onOpenPlatformIntent}
            />
          ) : props.activePage === 'about' ? (
            <PlatformAboutSettingsPage
              about={props.about}
              onOpenPlatformIntent={props.onOpenPlatformIntent}
            />
          ) : (
            <PlatformSettingsProjectionPage item={activeNavItem} />
          )}

          {props.activePage === 'model' ? null : (
            <div className="lime-settings-footer">
              <button className="lime-settings-reset" type="button" disabled>
                恢复默认
              </button>
              <button className="lime-settings-done" type="button" onClick={props.onClose}>
                完成
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
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

function PlatformGeneralSettingsPage(): ReactElement {
  return (
    <div className="lime-general-settings">
      <div className="lime-settings-divider wide" />
      <PlatformToggleRow title="通知" description="在生成任务完成或失败时接收平台通知。" checked />
      <PlatformToggleRow title="减少动画" description="关闭界面过渡动画，降低 GPU 功耗。" />
      <PlatformToggleRow title="同步 Claude Code 历史" description="将本地 Claude Code 终端对话同步到当前工作区。" />
      <PlatformShortcutRow title="快捷键唤起小窗" description="在桌面任意位置唤醒 AI。" shortcut="⌥ Space" checked />
      <PlatformToggleRow title="命令白名单" description="允许自动运行的命令。" />
      <div className="lime-general-section">
        <h2>权限模式</h2>
        <div className="lime-segmented-control two">
          <button className="active" type="button">自动批准</button>
          <button type="button" disabled>安全</button>
        </div>
        <p>所有操作自动批准。Product App 不保存平台权限策略。</p>
      </div>
      <div className="lime-general-section">
        <h2>思考模式</h2>
        <div className="lime-segmented-control six">
          {['自动', '关闭', '低', '中', '高', '超高'].map((label, index) => (
            <button className={index === 0 ? 'active' : ''} key={label} type="button" disabled={index !== 0}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="lime-general-section">
        <h2>显示</h2>
        <PlatformToggleRow title="显示工具调用" description="在对话中显示 AI 使用的工具详情。" checked compact />
        <PlatformToggleRow title="默认展开工具调用" description="自动展开工具调用的输入和输出内容。" compact />
      </div>
    </div>
  );
}

function PlatformAccountSettingsPage(props: {
  accountReady: boolean;
  accountState: string;
  avatarLetter: string;
  email: string;
  latestIntentResult?: PlatformIntentResultView;
  nickname: string;
  sessionActionLabel: string;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  return (
    <>
      <div className="lime-settings-section">
        <h2>头像</h2>
        <div className="lime-account-avatar-row">
          <div className="lime-account-avatar" aria-hidden="true">{props.avatarLetter}</div>
          <button className="lime-account-link-button" type="button" disabled>
            点击更换头像
          </button>
        </div>
      </div>

      <div className="lime-settings-divider" />

      <div className="lime-account-field-row">
        <div>
          <h2>昵称</h2>
          <p>{props.nickname}</p>
        </div>
        <button className="lime-account-link-button" type="button" disabled>
          修改
        </button>
      </div>

      <div className="lime-settings-divider" />

      <div className="lime-account-field-row compact">
        <div>
          <h2>邮箱</h2>
          <p>{props.email}</p>
        </div>
        <span className={props.accountReady ? 'lime-account-state good' : 'lime-account-state'}>{props.accountState}</span>
      </div>

      <div className="lime-settings-divider" />

      <button
        className="lime-logout-button"
        type="button"
        onClick={() => void props.onOpenPlatformIntent({ target: 'auth-settings', reason: '从公共账号设置打开云端会话。' })}
      >
        <span aria-hidden="true">↪</span>
        {props.sessionActionLabel}
      </button>

      <button
        className="lime-account-secondary-action"
        type="button"
        onClick={() => void props.onOpenPlatformIntent({ target: 'model-settings', reason: '从公共设置弹窗打开平台模型设置。' })}
      >
        <span aria-hidden="true">⚙</span>
        模型设置
      </button>

      {props.latestIntentResult ? (
        <div className={props.latestIntentResult.ok ? 'lime-settings-intent-result ok' : 'lime-settings-intent-result blocked'}>
          <span>{props.latestIntentResult.readiness?.state ?? (props.latestIntentResult.ok ? 'ready' : 'blocked')}</span>
          <strong>{props.latestIntentResult.target}</strong>
          <span>{props.latestIntentResult.message}</span>
        </div>
      ) : null}
    </>
  );
}

function PlatformSettingsProjectionPage(props: { item: SettingsNavItem }): ReactElement {
  const rows = settingsProjectionRows[props.item.key] ?? [
    ['状态', '由平台底座维护'],
    ['宿主能力', '通过 Host Snapshot / bootstrap 投影读取'],
    ['业务 App 权限', '只消费非敏感投影，不写入权威配置'],
  ];

  return (
    <div className="lime-settings-projection-page">
      <div className="lime-settings-divider wide" />
      <div className="lime-settings-projection-grid">
        {rows.map(([label, value]) => (
          <div className="lime-settings-projection-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="lime-settings-projection-note">
        当前页面已由平台公共设置中心承载。Product App 只挂载本组件，后续真实保存由 `lime-desktop-platform` 的 host-core action handler 接入。
      </div>
    </div>
  );
}

function PlatformThemeSettingsPage(): ReactElement {
  const [appearanceMode, setAppearanceMode] = useState<'light' | 'dark' | 'system'>('light');
  const [themeId, setThemeId] = useState('art');
  const [fontSize, setFontSize] = useState(42);
  const [serifEnabled, setSerifEnabled] = useState(false);
  const [swatchOffset, setSwatchOffset] = useState<{ id: string; x: number; y: number }>();

  const updateSwatchOffset = (theme: string, event: MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    setSwatchOffset({
      id: theme,
      x: Math.max(-5, Math.min(5, x)),
      y: Math.max(-5, Math.min(5, y)),
    });
  };

  return (
    <div className="lime-theme-settings">
      <section className="lime-theme-section">
        <h2>外观模式</h2>
        <div className="lime-theme-mode-group" role="group" aria-label="外观模式">
          {themeModeOptions.map((option) => (
            <button
              className={appearanceMode === option.id ? 'lime-theme-mode active' : 'lime-theme-mode'}
              key={option.id}
              type="button"
              onClick={() => setAppearanceMode(option.id)}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="lime-theme-section">
        <h2>颜色主题</h2>
        <div className="lime-theme-palette-grid">
          {themePaletteOptions.map((option) => (
            <button
              className={themeId === option.id ? 'lime-theme-palette active' : 'lime-theme-palette'}
              key={option.id}
              type="button"
              onClick={() => setThemeId(option.id)}
              onBlur={() => setSwatchOffset((current) => (current?.id === option.id ? undefined : current))}
              onMouseLeave={() => setSwatchOffset((current) => (current?.id === option.id ? undefined : current))}
              onMouseOut={() => setSwatchOffset((current) => (current?.id === option.id ? undefined : current))}
              onMouseMove={(event) => updateSwatchOffset(option.id, event)}
            >
              <span
                className="lime-theme-swatch"
                style={{
                  '--swatch-a': option.colors[0],
                  '--swatch-b': option.colors[1],
                  '--swatch-x': `${swatchOffset?.id === option.id ? swatchOffset.x : 0}px`,
                  '--swatch-y': `${swatchOffset?.id === option.id ? swatchOffset.y : 0}px`,
                } as CSSProperties}
              >
                {option.colors.length > 1 ? <i /> : null}
              </span>
              <span className="lime-theme-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              {themeId === option.id ? <span className="lime-theme-check" aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="lime-theme-section compact">
        <div className="lime-theme-row-head">
          <h2>对话字体</h2>
          <label className="lime-theme-serif-toggle">
            <button
              className={serifEnabled ? 'lime-toggle checked' : 'lime-toggle'}
              type="button"
              aria-pressed={serifEnabled}
              onClick={() => setSerifEnabled((current) => !current)}
            >
              <span />
            </button>
            <span>衬线体</span>
          </label>
        </div>
        <div className="lime-theme-font-slider">
          <span>小</span>
          <input
            aria-label="对话字体大小"
            max={100}
            min={0}
            type="range"
            value={fontSize}
            onChange={(event) => setFontSize(Number(event.target.value))}
          />
          <span>大</span>
        </div>
        <div className={serifEnabled ? 'lime-theme-font-preview serif' : 'lime-theme-font-preview'}>
          这是对话中的预览文字效果。 The quick brown fox jumps over the lazy dog.
        </div>
      </section>
    </div>
  );
}

function PlatformVoiceModelSettingsPage(): ReactElement {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [shortcutIndex, setShortcutIndex] = useState(0);
  const [modelInstalled, setModelInstalled] = useState(true);
  const [testStatus, setTestStatus] = useState('本地 UI 已就绪；真实语音识别由平台 host-core ASR action handler 接入。');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<VoiceHistoryRecord[]>(() => [
    {
      id: 'seed',
      source: '示例转录',
      text: '语音模型页面已由平台公共设置中心承载。',
      time: '刚刚',
    },
  ]);
  const shortcut = voiceShortcutOptions[shortcutIndex % voiceShortcutOptions.length];

  const cycleShortcut = (): void => {
    const nextIndex = (shortcutIndex + 1) % voiceShortcutOptions.length;
    setShortcutIndex(nextIndex);
    setTestStatus(`已切换为 ${voiceShortcutOptions[nextIndex].label}；真实全局快捷键注册由 host-core 接入。`);
  };

  const toggleInstallState = (): void => {
    const nextInstalled = !modelInstalled;
    setModelInstalled(nextInstalled);
    setTestStatus(nextInstalled
      ? '已在 UI 草稿中标记为已安装；真实模型下载、校验和落盘由 host-core 接入。'
      : '已在 UI 草稿中标记为未安装；真实模型删除由 host-core 接入。');
  };

  const runLocalTest = (source: string): void => {
    const time = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
    setTestStatus(`${source} 已触发；真实文件选择、录音权限和 SenseVoice 转写由 host-core ASR action handler 接入。`);
    setHistoryItems((current) => [
      {
        id: `${source}:${Date.now()}`,
        source,
        text: '等待平台 ASR action 返回真实转录文本。',
        time,
      },
      ...current.filter((item) => item.id !== 'seed'),
    ].slice(0, 5));
    setHistoryOpen(true);
  };

  return (
    <div className="lime-voice-settings">
      <div className="lime-settings-divider wide" />

      <section className="lime-voice-section">
        <div className="lime-voice-row">
          <div>
            <h2>语音输入快捷键</h2>
            <p>按住快捷键持续录音，松开自动转录为文字</p>
          </div>
          <div className="lime-voice-shortcut-actions">
            <button className="lime-voice-shortcut-pill" type="button" onClick={cycleShortcut}>
              <span aria-hidden="true">{shortcut.icon}</span>
              {shortcut.label}
            </button>
            <button
              className={voiceEnabled ? 'lime-toggle checked' : 'lime-toggle'}
              type="button"
              aria-pressed={voiceEnabled}
              aria-label="切换语音输入快捷键"
              onClick={() => {
                const nextEnabled = !voiceEnabled;
                setVoiceEnabled(nextEnabled);
                setTestStatus(nextEnabled ? '语音输入已在 UI 草稿中开启。' : '语音输入已在 UI 草稿中关闭。');
              }}
            >
              <span />
            </button>
          </div>
        </div>
        <div className="lime-voice-hint">
          Fn 键仅支持 Apple 键盘（内置或妙控键盘），第三方键盘请点击左侧按钮自定义快捷键。建议在「系统设置 → 键盘 → 按地球仪键」中设为「什么都不做」以避免干扰。
        </div>
      </section>

      <div className="lime-settings-divider" />

      <section className="lime-voice-section">
        <div className="lime-voice-model-row">
          <div className="lime-voice-model-copy">
            <div className="lime-voice-model-title">
              <span className="lime-voice-model-icon" aria-hidden="true">▣</span>
              <h2>SenseVoice Small 本地</h2>
              <em>本地</em>
            </div>
            <p>阿里 FunASR 开源语音转录模型，支持中英日韩粤等 50+ 语种。速度比 Whisper-Large 快 15 倍。</p>
            <span className={modelInstalled ? 'lime-voice-install-state ready' : 'lime-voice-install-state'}>
              {modelInstalled ? '✓ 已安装（228.5 MB）' : '未安装（228.5 MB）'}
            </span>
          </div>
          <button className="lime-voice-outline-button" type="button" onClick={toggleInstallState}>
            {modelInstalled ? '删除模型' : '安装模型'}
          </button>
        </div>
      </section>

      <div className="lime-settings-divider" />

      <section className="lime-voice-section">
        <div className="lime-voice-test-head">
          <h2>测试转录</h2>
          <p>选择本机媒体或启动实时录音，验证当前语音识别链路。</p>
        </div>
        <div className="lime-voice-test-actions">
          <button type="button" onClick={() => runLocalTest('选择音频文件测试')}>选择音频文件测试</button>
          <button type="button" onClick={() => runLocalTest('选择视频文件测试')}>选择视频文件测试</button>
          <button type="button" onClick={() => runLocalTest('实时录音测试')}>实时录音测试</button>
        </div>
        <div className="lime-voice-status">{testStatus}</div>
      </section>

      <div className="lime-settings-divider" />

      <section className="lime-voice-section compact">
        <button className="lime-voice-history-toggle" type="button" onClick={() => setHistoryOpen((current) => !current)}>
          <span>所有转录历史</span>
          <strong>{historyOpen ? '收起' : '展开'}</strong>
        </button>
        {historyOpen ? (
          <div className="lime-voice-history-list">
            {historyItems.length > 0 ? (
              historyItems.map((item) => (
                <div className="lime-voice-history-item" key={item.id}>
                  <span>{item.source} · {item.time}</span>
                  <p>{item.text}</p>
                </div>
              ))
            ) : (
              <div className="lime-voice-history-empty">暂无转录历史；真实历史由平台 workspace / userData 存储接入。</div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PlatformSearchServiceSettingsPage(): ReactElement {
  const [providers, setProviders] = useState<SearchProviderDraft[]>(() =>
    searchProviderCatalog.map((provider, index) => ({
      ...provider,
      enabled: ['tavily', 'bing', 'metaso', 'exa', 'brave', 'serpapi', 'serper', 'google-cse', 'firecrawl'].includes(provider.id) || index === 0,
    })),
  );
  const [draggingId, setDraggingId] = useState<string>();
  const [statusMessage, setStatusMessage] = useState('搜索服务 UI 已就绪；真实 WebSearch provider 凭证、优先级和健康检查由平台 host-core search action handler 接入。');
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const availableProviders = providers.filter((provider) => !provider.enabled);

  const toggleProvider = (providerId: string): void => {
    const provider = providers.find((item) => item.id === providerId);
    setProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, enabled: !provider.enabled } : provider,
      ),
    );
    setStatusMessage(`${provider?.label ?? providerId} 已更新启用状态；真实保存由 host-core settings action handler 接入。`);
  };

  const reorderProvider = (sourceId: string, targetId: string): void => {
    if (sourceId === targetId) {
      return;
    }
    setProviders((current) => {
      const sourceIndex = current.findIndex((provider) => provider.id === sourceId);
      const targetIndex = current.findIndex((provider) => provider.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
    setStatusMessage('已调整搜索服务优先级；真实回退链保存由平台 host-core 接入。');
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string): void => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingId;
    if (sourceId) {
      reorderProvider(sourceId, targetId);
    }
    setDraggingId(undefined);
  };

  const updateCredentialDraft = (providerId: string, field: 'apiKey' | 'engineId' | 'endpoint', value: string): void => {
    setProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, [field]: value } : provider,
      ),
    );
    const provider = providers.find((item) => item.id === providerId);
    setStatusMessage(`${provider?.label ?? providerId} 配置已进入 UI 草稿；真实密钥加密存储由 Credential Broker 接入。`);
  };

  const requestProviderKey = (providerId: string): void => {
    const provider = providers.find((item) => item.id === providerId);
    setStatusMessage(`${provider?.label ?? providerId} 获取 Key 入口已触发；真实外部链接和 OAuth / API Key 申请流程由平台 provider metadata 接入。`);
  };

  return (
    <div className="lime-search-settings">
      <div className="lime-search-info">
        <span aria-hidden="true">ⓘ</span>
        <p>当使用非 Claude 模型时，AI 将使用以下搜索服务代替内置 WebSearch。启用多个服务时，按优先级顺序调用，失败自动切换下一个。拖拽调整优先级。</p>
      </div>

      <section className="lime-search-service-section">
        <span className="lime-search-section-label">已启用（拖拽排序优先级）</span>
        <div className="lime-search-enabled-list" aria-label="已启用搜索服务">
          {enabledProviders.map((provider) => (
            <SearchEnabledProviderCard
              key={provider.id}
              provider={provider}
              dragging={draggingId === provider.id}
              onDragEnd={() => setDraggingId(undefined)}
              onDragStart={(event) => {
                setDraggingId(provider.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', provider.id);
              }}
              onDrop={(event) => handleDrop(event, provider.id)}
              onRequestKey={() => requestProviderKey(provider.id)}
              onToggle={() => toggleProvider(provider.id)}
              onUpdateCredential={(field, value) => updateCredentialDraft(provider.id, field, value)}
            />
          ))}
        </div>
      </section>

      <section className="lime-search-service-section">
        <span className="lime-search-section-label">可用服务</span>
        <div className="lime-search-available-list" aria-label="可用搜索服务">
          {availableProviders.map((provider) => (
            <SearchAvailableProviderRow
              key={provider.id}
              provider={provider}
              onToggle={() => toggleProvider(provider.id)}
            />
          ))}
        </div>
      </section>

      <div className="lime-search-status">{statusMessage}</div>
    </div>
  );
}

function SearchEnabledProviderCard(props: {
  provider: SearchProviderDraft;
  dragging?: boolean;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRequestKey: () => void;
  onToggle: () => void;
  onUpdateCredential: (field: 'apiKey' | 'engineId' | 'endpoint', value: string) => void;
}): ReactElement {
  return (
    <article
      className={props.dragging ? 'lime-search-enabled-card dragging' : 'lime-search-enabled-card'}
      draggable
      onDragEnd={props.onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={props.onDragStart}
      onDrop={props.onDrop}
    >
      <div className="lime-search-enabled-head">
        <span className="lime-search-drag-handle" aria-hidden="true">⋮</span>
        <div>
          <h2>{props.provider.label}</h2>
          <p>{props.provider.description}</p>
        </div>
        <button
          className="lime-toggle checked"
          type="button"
          aria-pressed="true"
          aria-label={`停用 ${props.provider.label}`}
          onClick={props.onToggle}
        >
          <span />
        </button>
      </div>
      <div className="lime-search-key-row">
        {props.provider.needsApiKey ? (
          <input
            value={props.provider.apiKey ?? ''}
            onChange={(event) => props.onUpdateCredential('apiKey', event.target.value)}
            placeholder="填写 API Key 以后启用服务"
            type="password"
          />
        ) : props.provider.needsEndpoint ? (
          <input
            value={props.provider.endpoint ?? ''}
            onChange={(event) => props.onUpdateCredential('endpoint', event.target.value)}
            placeholder="填写 API Key 以后启用服务"
          />
        ) : (
          <input disabled placeholder="无需 API Key" />
        )}
        <button type="button" onClick={props.onRequestKey}>
          获取 Key
          <span aria-hidden="true">↪</span>
        </button>
      </div>
      {props.provider.needsEngineId ? (
        <input
          className="lime-search-extra-input"
          value={props.provider.engineId ?? ''}
          onChange={(event) => props.onUpdateCredential('engineId', event.target.value)}
          placeholder="Custom Search Engine ID (cx)"
        />
      ) : null}
    </article>
  );
}

function SearchAvailableProviderRow(props: {
  provider: SearchProviderDraft;
  onToggle: () => void;
}): ReactElement {
  return (
    <div className="lime-search-available-row">
      <div>
        <strong>{props.provider.label}</strong>
        <small>{props.provider.description}</small>
      </div>
      <button
        className="lime-toggle"
        type="button"
        aria-pressed="false"
        aria-label={`启用 ${props.provider.label}`}
        onClick={props.onToggle}
      >
        <span />
      </button>
    </div>
  );
}

function PlatformModelSettingsPage(props: {
  modelSettings: PlatformModelSettingsProjection;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  const providers = props.modelSettings.providers.length > 0
    ? props.modelSettings.providers
    : createDefaultModelProviderProjection(props.modelSettings.version);
  const baseProviders = useMemo(
    () => normalizeModelProviders(providers, props.modelSettings.version),
    [providers, props.modelSettings.version],
  );
  const defaultProviderId = props.modelSettings.defaultTextModelId?.includes('deepseek') ? 'deepseek' : 'claude';
  const initialProvider = baseProviders.find((provider) => provider.id === defaultProviderId) ?? baseProviders[0];
  const [selectedProviderId, setSelectedProviderId] = useState<string>(initialProvider.id);
  const [mode, setMode] = useState<'details' | 'catalog'>('details');
  const [catalogProviders, setCatalogProviders] = useState<PlatformModelProviderProjection[]>([]);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraftState>>(() =>
    Object.fromEntries(baseProviders.map((provider) => [provider.id, createProviderDraft(provider)])),
  );
  const [testState, setTestState] = useState<'idle' | 'ok'>('idle');
  const [guideProviderId, setGuideProviderId] = useState<string>();
  const normalizedProviders = useMemo(
    () => mergeModelProviders(baseProviders, catalogProviders),
    [baseProviders, catalogProviders],
  );
  const selectedProvider = normalizedProviders.find((provider) => provider.id === selectedProviderId) ?? normalizedProviders[0];

  useEffect(() => {
    setProviderDrafts((current) => {
      const next = { ...current };
      normalizedProviders.forEach((provider) => {
        if (!next[provider.id]) {
          next[provider.id] = createProviderDraft(provider);
        }
      });
      return next;
    });
  }, [normalizedProviders]);

  const selectProvider = (providerId: string): void => {
    setSelectedProviderId(providerId);
    setMode('details');
    setTestState('idle');
    setGuideProviderId(undefined);
  };

  const openCatalog = (): void => {
    setMode('catalog');
    setTestState('idle');
    setGuideProviderId(undefined);
  };

  const upsertCatalogProvider = (option: ProviderCatalogOption): void => {
    const provider = createProviderProjectionFromCatalogOption(option);
    setCatalogProviders((current) =>
      current.some((item) => item.id === provider.id) ? current : [...current, provider],
    );
    setProviderDrafts((current) => ({
      ...current,
      [option.id]: current[option.id] ?? {
        apiKey: '',
        modelInput: option.models[0] ?? '',
        models: option.models,
      },
    }));
    setSelectedProviderId(option.id);
    setMode('details');
    setTestState('idle');
    setGuideProviderId(undefined);
  };

  const updateProviderDraft = (providerId: string, patch: Partial<ProviderDraftState>): void => {
    setProviderDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] ?? createProviderDraft(selectedProvider)),
        ...patch,
      },
    }));
    setTestState('idle');
  };

  const addPriorityModel = (providerId: string): void => {
    const draft = providerDrafts[providerId] ?? createProviderDraft(selectedProvider);
    const model = draft.modelInput.trim();
    if (!model || draft.models.includes(model)) {
      return;
    }
    updateProviderDraft(providerId, { models: [...draft.models, model], modelInput: '' });
  };

  const removePriorityModel = (providerId: string, model: string): void => {
    const draft = providerDrafts[providerId] ?? createProviderDraft(selectedProvider);
    if (draft.models.length <= 1) {
      return;
    }
    updateProviderDraft(providerId, { models: draft.models.filter((item) => item !== model) });
  };

  const movePriorityModel = (providerId: string, model: string, direction: -1 | 1): void => {
    const draft = providerDrafts[providerId] ?? createProviderDraft(selectedProvider);
    const index = draft.models.indexOf(model);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draft.models.length) {
      return;
    }
    const nextModels = [...draft.models];
    [nextModels[index], nextModels[nextIndex]] = [nextModels[nextIndex], nextModels[index]];
    updateProviderDraft(providerId, { models: nextModels });
  };

  const selectedDraft = providerDrafts[selectedProvider.id] ?? createProviderDraft(selectedProvider);

  return (
    <div className="lime-model-settings">
      <div className="lime-model-side">
        <div className="lime-model-side-head">
          <div>
            <strong>启用的模型</strong>
            <span>拖拽排序，首位为默认</span>
          </div>
          <button type="button" onClick={openCatalog} aria-label="添加模型">+</button>
        </div>
        <div className="lime-model-enabled-list">
          {normalizedProviders.map((provider, index) => (
            <ProviderListItem
              provider={provider}
              active={mode === 'details' && provider.id === selectedProvider.id}
              defaultLabel={index === 0}
              key={provider.id}
              onSelect={() => selectProvider(provider.id)}
            />
          ))}
        </div>
        <button className={mode === 'catalog' ? 'lime-model-add-button active' : 'lime-model-add-button'} type="button" onClick={openCatalog}>
          <span aria-hidden="true">+</span>
          添加模型
        </button>
      </div>

      <div className="lime-model-main">
        {mode === 'catalog' ? (
          <ProviderCatalog onSelectProvider={upsertCatalogProvider} />
        ) : (
          <ProviderConfigCard
            provider={selectedProvider}
            modelSettings={props.modelSettings}
            draft={selectedDraft}
            guideRequested={guideProviderId === selectedProvider.id}
            testState={testState}
            onAddPriorityModel={() => addPriorityModel(selectedProvider.id)}
            onOpenProviderGuide={() => setGuideProviderId(selectedProvider.id)}
            onMovePriorityModel={(model, direction) => movePriorityModel(selectedProvider.id, model, direction)}
            onRemovePriorityModel={(model) => removePriorityModel(selectedProvider.id, model)}
            onTestConnection={() => setTestState('ok')}
            onUpdateDraft={(patch) => updateProviderDraft(selectedProvider.id, patch)}
          />
        )}
        <button
          className="lime-model-intent-link"
          type="button"
          onClick={() => void props.onOpenPlatformIntent({ target: 'model-settings', reason: '从公共模型设置页打开平台模型设置。' })}
        >
          打开完整模型设置
        </button>
      </div>
    </div>
  );
}

function ProviderListItem(props: {
  provider: PlatformModelProviderProjection;
  active?: boolean;
  defaultLabel?: boolean;
  onSelect: () => void;
}): ReactElement {
  return (
    <button className={props.active ? 'lime-model-provider-row active' : 'lime-model-provider-row'} type="button" onClick={props.onSelect}>
      <span aria-hidden="true">⋮</span>
      <strong>
        <ProviderIcon providerId={props.provider.id} />
        {props.provider.displayName}
      </strong>
      {props.defaultLabel ? <em>默认</em> : null}
      <small>{props.provider.models[0] ?? '未设置模型'}</small>
    </button>
  );
}

function ProviderConfigCard(props: {
  provider: PlatformModelProviderProjection;
  modelSettings: PlatformModelSettingsProjection;
  draft: ProviderDraftState;
  guideRequested: boolean;
  testState: 'idle' | 'ok';
  onAddPriorityModel: () => void;
  onOpenProviderGuide: () => void;
  onMovePriorityModel: (model: string, direction: -1 | 1) => void;
  onRemovePriorityModel: (model: string) => void;
  onTestConnection: () => void;
  onUpdateDraft: (patch: Partial<ProviderDraftState>) => void;
}): ReactElement {
  const isClaude = props.provider.id === 'claude';
  const ready = isClaude || props.provider.apiKeyConfigured || props.draft.apiKey.trim().length > 0 || props.testState === 'ok';
  const displayName = isClaude ? '默认 (Claude)' : props.provider.displayName;
  return (
    <section className="lime-model-config-card">
      <div className="lime-model-card-title">
        <div className="lime-model-card-title-main">
          <ProviderIcon providerId={props.provider.id} />
          <h2>{displayName}</h2>
        </div>
        {!isClaude ? <button type="button" onClick={props.onOpenProviderGuide}>去获取 API 密钥 ↗</button> : null}
      </div>
      {props.guideRequested ? (
        <div className="lime-model-guide-notice">
          已请求打开 {props.provider.displayName} API Key 获取入口；真实外部链接由平台 provider metadata / host-core 接入。
        </div>
      ) : null}
      {isClaude ? (
        <div className="lime-model-ready-banner">✓ 已就绪 - 使用 Claude 原生 OAuth 认证，无需配置 API Key</div>
      ) : (
        <label className="lime-model-field">
          <span>API 密钥</span>
          <input
            value={props.draft.apiKey}
            onChange={(event) => props.onUpdateDraft({ apiKey: event.target.value })}
            placeholder="输入 API 密钥"
            type="password"
          />
        </label>
      )}
      <div className="lime-model-priority">
        <span>模型优先级（至少添加一个）</span>
        <div className="lime-model-priority-box">
          {props.draft.models.map((model, index) => (
            <div className="lime-model-priority-row" key={`${props.provider.id}:${model}`}>
              <span aria-hidden="true">⋮</span>
              {index === 0 ? <em>主模型</em> : <em>备用 {index}</em>}
              <strong>{model}</strong>
              <div className="lime-model-priority-actions">
                <button type="button" disabled={index === 0} onClick={() => props.onMovePriorityModel(model, -1)} aria-label="上移模型">↑</button>
                <button type="button" disabled={index === props.draft.models.length - 1} onClick={() => props.onMovePriorityModel(model, 1)} aria-label="下移模型">↓</button>
                <button type="button" disabled={props.draft.models.length <= 1} onClick={() => props.onRemovePriorityModel(model)} aria-label="移除模型">×</button>
              </div>
            </div>
          ))}
          <div className="lime-model-add-priority">
            <input
              value={props.draft.modelInput}
              onChange={(event) => props.onUpdateDraft({ modelInput: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  props.onAddPriorityModel();
                }
              }}
              placeholder="输入模型 ID"
            />
            <button type="button" onClick={props.onAddPriorityModel}>+ 添加模型</button>
          </div>
        </div>
      </div>
      {!isClaude ? (
        <button className="lime-model-test-button" type="button" onClick={props.onTestConnection}>
          ↯ {props.testState === 'ok' ? '连接正常' : `测试连接${ready ? '' : '并激活'}`}
        </button>
      ) : null}
      <small className="lime-model-footnote">
        {props.modelSettings.version ? `配置版本 ${props.modelSettings.version}` : '模型设置由平台维护，当前业务 App 只读取投影。'}
      </small>
    </section>
  );
}

function ProviderCatalog(props: { onSelectProvider: (provider: ProviderCatalogOption) => void }): ReactElement {
  const [activeTab, setActiveTab] = useState<ProviderCatalogTab>('recommended');
  const cards = providerCatalogOptions.filter((option) => option.tab === activeTab);

  return (
    <section className="lime-model-catalog">
      <div className="lime-model-tabs">
        {providerCatalogTabs.map((tab) => (
          <button className={activeTab === tab.key ? 'active' : ''} key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="lime-model-catalog-grid">
        {cards.map((card) => (
          <button className="lime-model-catalog-card" key={card.id} type="button" onClick={() => props.onSelectProvider(card)}>
            <strong>
              <ProviderIcon providerId={card.id} />
              {card.title}
            </strong>
            {card.tag ? <em>{card.tag}</em> : null}
            <span>{card.subtitle}</span>
            <small>{card.protocol}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlatformToggleRow({
  title,
  description,
  checked = false,
  compact = false,
}: {
  title: string;
  description: string;
  checked?: boolean;
  compact?: boolean;
}): ReactElement {
  return (
    <div className={compact ? 'lime-setting-row compact' : 'lime-setting-row'}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button className={checked ? 'lime-toggle checked' : 'lime-toggle'} type="button" aria-pressed={checked} disabled>
        <span />
      </button>
    </div>
  );
}

function PlatformShortcutRow(props: { title: string; description: string; shortcut: string; checked?: boolean }): ReactElement {
  return (
    <div className="lime-setting-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.description}</span>
      </div>
      <div className="lime-shortcut-control">
        <kbd>{props.shortcut}</kbd>
        <button className={props.checked ? 'lime-toggle checked' : 'lime-toggle'} type="button" aria-pressed={props.checked} disabled>
          <span />
        </button>
      </div>
    </div>
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

interface SettingsNavItem {
  key: PlatformSettingsPageKey;
  label: string;
  description?: string;
}

type ProviderCatalogTab = 'recommended' | 'china' | 'aggregator' | 'global' | 'local';

interface ProviderCatalogOption {
  id: string;
  title: string;
  subtitle: string;
  protocol: string;
  tab: ProviderCatalogTab;
  tag?: string;
  models: string[];
}

type ProviderIconKey =
  | 'claude'
  | 'deepseek'
  | 'kimi'
  | 'qwen'
  | 'doubao'
  | 'silicon'
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

interface ProviderDraftState {
  apiKey: string;
  modelInput: string;
  models: string[];
}

interface VoiceHistoryRecord {
  id: string;
  source: string;
  text: string;
  time: string;
}

interface SearchProviderDraft {
  id: string;
  label: string;
  description: string;
  detail: string;
  protocol: string;
  region: string;
  configNote: string;
  enabled: boolean;
  needsApiKey?: boolean;
  needsEngineId?: boolean;
  needsEndpoint?: boolean;
  apiKey?: string;
  engineId?: string;
  endpoint?: string;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
}

const settingsNavItems: SettingsNavItem[] = [
  { key: 'general', label: '通用' },
  { key: 'personalization', label: '个性化' },
  { key: 'theme', label: '主题' },
  { key: 'daily-review', label: '每日回顾' },
  {
    key: 'model',
    label: '模型',
    description: '如果配置遇到问题，可以查阅配置指南。',
  },
  { key: 'usage', label: '使用统计' },
  { key: 'voice-model', label: '语音模型' },
  { key: 'gateway', label: '开放网关' },
  { key: 'bot-chat', label: '机器人对话' },
  { key: 'search', label: '搜索服务' },
  { key: 'network', label: '网络' },
  { key: 'data', label: '数据' },
  { key: 'account', label: '账号' },
  { key: 'about', label: '关于' },
];

const settingsProjectionRows: Partial<Record<PlatformSettingsPageKey, Array<[string, string]>>> = {
  personalization: [
    ['头像与昵称', '读取平台账号投影'],
    ['语言偏好', '跟随宿主设置'],
    ['业务 App 权限', '不可写入账号权威状态'],
  ],
  theme: [
    ['主题来源', '平台 OEM / 品牌投影'],
    ['深浅色', '跟随系统'],
    ['自定义主题', '后续由平台设置保存'],
  ],
  'daily-review': [
    ['每日回顾', '平台任务投影'],
    ['提醒策略', '后续由平台通知设置保存'],
    ['业务 App 权限', '只消费提醒状态'],
  ],
  usage: [
    ['用量口径', '平台 billing / entitlement 投影'],
    ['统计范围', '模型调用与 Agent App 运行'],
    ['业务 App 权限', '不维护充值账本'],
  ],
  gateway: [
    ['开放网关', '平台 Host Bridge 能力'],
    ['鉴权', '由平台 Credential Broker 管理'],
    ['业务 App 权限', '不接触 token'],
  ],
  'bot-chat': [
    ['机器人会话', '平台 Agent Runtime 投影'],
    ['会话存储', '由平台 workspace 管理'],
    ['业务 App 权限', '只启动标准 entry'],
  ],
  data: [
    ['数据目录', '平台 workspace / userData'],
    ['同步状态', 'Host Snapshot 投影'],
    ['业务 App 权限', '不写平台权威配置'],
  ],
};

const voiceShortcutOptions: Array<{ label: string; icon: string }> = [
  { label: 'Fn', icon: '🌐' },
  { label: '⌘ Space', icon: '⌘' },
  { label: '自定义', icon: '⌨' },
];

const searchProviderCatalog: Omit<SearchProviderDraft, 'enabled'>[] = [
  {
    id: 'tavily',
    label: 'Tavily',
    description: 'AI 优化搜索，结果相关性高，推荐首选',
    detail: '面向 LLM 和 Agent 的实时、可定制、RAG-ready 搜索 API，支持 search depth、max results、answer / raw content / images 等参数。',
    protocol: 'Tavily Search API',
    region: '全球',
    configNote: '需要 TAVILY_API_KEY；未配置时由 host-core 返回 needs-setup。',
    needsApiKey: true,
    apiKeyLabel: 'Tavily API Key',
    apiKeyPlaceholder: '输入 TAVILY_API_KEY',
  },
  {
    id: 'exa',
    label: 'Exa',
    description: '语义搜索，擅长学术论文和深度内容发现',
    detail: '面向语义和相似内容发现的搜索 API，适合研究、论文、长内容和相似网页扩展。',
    protocol: 'Exa Search API',
    region: '全球',
    configNote: '需要 EXA_API_KEY；深度检索策略由平台搜索路由裁决。',
    needsApiKey: true,
    apiKeyLabel: 'Exa API Key',
    apiKeyPlaceholder: '输入 EXA_API_KEY',
  },
  {
    id: 'brave',
    label: 'Brave Search',
    description: '注重隐私的通用搜索，无需跟踪即可获得高质量结果',
    detail: 'Brave Search API 提供独立索引的 Web / News / Image 等搜索能力，适合作为通用搜索回退。',
    protocol: 'Brave Search API',
    region: '全球',
    configNote: '需要 BRAVE_SEARCH_API_KEY；通常通过订阅 token 调用。',
    needsApiKey: true,
    apiKeyLabel: 'Brave Search API Key',
    apiKeyPlaceholder: '输入 BRAVE_SEARCH_API_KEY',
  },
  {
    id: 'metaso',
    label: '秘塔搜索',
    description: '国产 AI 搜索引擎，中文搜索效果好，无需翻墙',
    detail: '面向中文信息发现和 AI 搜索场景；平台侧需要以官方开放能力或兼容适配器接入。',
    protocol: 'Metaso / 秘塔兼容适配',
    region: '中国大陆',
    configNote: '如无官方开放 API，可先作为 host-core 兼容适配器占位，不在 Product App 内直连。',
    needsEndpoint: true,
  },
  {
    id: 'serpapi',
    label: 'SerpAPI',
    description: 'Google 搜索结果 API，支持多搜索引擎和地区',
    detail: '通过结构化 API 获取 Google 等搜索结果，适合需要 SERP 结构、地区、语言参数的场景。',
    protocol: 'SerpAPI Search API',
    region: '全球',
    configNote: '需要 SERPAPI_API_KEY；地区、语言和 engine 参数由平台搜索路由生成。',
    needsApiKey: true,
    apiKeyLabel: 'SerpAPI API Key',
    apiKeyPlaceholder: '输入 SERPAPI_API_KEY',
  },
  {
    id: 'serper',
    label: 'Serper',
    description: '快速 Google 搜索 API，性价比高，响应速度快',
    detail: '以 Google Search API 兼容能力为主，适合低延迟通用 WebSearch 回退。',
    protocol: 'Serper Google Search API',
    region: '全球',
    configNote: '需要 SERPER_API_KEY；gl、hl、num 等参数由 host-core 控制。',
    needsApiKey: true,
    apiKeyLabel: 'Serper API Key',
    apiKeyPlaceholder: '输入 SERPER_API_KEY',
  },
  {
    id: 'bing',
    label: 'Bing Search',
    description: '微软必应搜索，适合国内网络环境直连',
    detail: 'Microsoft Bing Web Search API 曾作为通用搜索 API；平台接入时需处理 Azure 侧迁移、版本和区域可用性。',
    protocol: 'Bing Web Search API',
    region: '全球 / 中国大陆可直连',
    configNote: '需要 BING_SEARCH_API_KEY；如服务迁移或停用，由 host-core 提供兼容提示。',
    needsApiKey: true,
    apiKeyLabel: 'Bing Search API Key',
    apiKeyPlaceholder: '输入 BING_SEARCH_API_KEY',
  },
  {
    id: 'google-cse',
    label: 'Google CSE',
    description: 'Google 自定义搜索引擎，需额外配置搜索引擎 ID',
    detail: 'Google Custom Search JSON API 需要 API Key 与 Search Engine ID，用于受控站点或通用自定义搜索。',
    protocol: 'Google Custom Search JSON API',
    region: '全球',
    configNote: '需要 GOOGLE_SEARCH_API_KEY 和 GOOGLE_SEARCH_ENGINE_ID。',
    needsApiKey: true,
    needsEngineId: true,
    apiKeyLabel: 'Google Search API Key',
    apiKeyPlaceholder: '输入 GOOGLE_SEARCH_API_KEY',
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    description: '搜索 + 网页结构化提取，适合需要抓取页面内容的场景',
    detail: 'Firecrawl 提供搜索、抓取和结构化提取能力，适合 WebSearch 后需要读取页面正文、Markdown 或结构化数据的场景。',
    protocol: 'Firecrawl Search / Scrape API',
    region: '全球',
    configNote: '需要 FIRECRAWL_API_KEY；搜索和抓取链路由 host-core search action handler 统一裁决。',
    needsApiKey: true,
    apiKeyLabel: 'Firecrawl API Key',
    apiKeyPlaceholder: '输入 FIRECRAWL_API_KEY',
  },
];

const themeModeOptions: Array<{ id: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
  { id: 'light', label: '浅色', icon: '☼' },
  { id: 'dark', label: '深色', icon: '☾' },
  { id: 'system', label: '跟随系统', icon: '▭' },
];

const themePaletteOptions: Array<{
  id: string;
  label: string;
  description: string;
  colors: [string, string?];
}> = [
  { id: 'random', label: '随机', description: '每次点击随机生成配色', colors: ['#264f38'] },
  { id: 'ink', label: '墨绿', description: '经典深绿，温暖米色背景', colors: ['#223f32'] },
  { id: 'ocean', label: '海洋', description: '沉静专业的蓝色调', colors: ['#0e78ad'] },
  { id: 'retro', label: '复古', description: '温暖怀旧的琥珀色调', colors: ['#cf6d00'] },
  { id: 'iris', label: '霓虹', description: '赛博朋克粉紫色调', colors: ['#b120c9'] },
  { id: 'lime', label: '青柠', description: '活力清新的黄绿配紫', colors: ['#d9ef6a', '#6f42a8'] },
  { id: 'olive', label: '黄昏', description: '柔和温暖的暮色调', colors: ['#808434'] },
  { id: 'minimal', label: '极简', description: '清晰专业的深蓝商务风', colors: ['#145db3'] },
  { id: 'active', label: '活力', description: '时尚有冲击力的现代科技风', colors: ['#38b8b2'] },
  { id: 'nature', label: '自然', description: '舒适放松的清新自然风', colors: ['#276d35'] },
  { id: 'art', label: '文艺', description: '宁静高雅的灰蓝文艺风', colors: ['#667381'] },
  { id: 'luxury', label: '奢华', description: '尊贵权威的黑金商务风', colors: ['#c69f29'] },
];

const providerCatalogTabs: Array<{ key: ProviderCatalogTab; label: string }> = [
  { key: 'recommended', label: '推荐服务' },
  { key: 'china', label: '国内服务' },
  { key: 'aggregator', label: '聚合平台' },
  { key: 'global', label: '海外平台' },
  { key: 'local', label: '本地模型' },
];

const providerCatalogOptions: ProviderCatalogOption[] = [
  {
    id: 'kimi-coding-plan',
    title: 'Kimi Coding Plan',
    subtitle: 'Kimi 智能助手的编程版，月之暗面出品',
    protocol: 'moonshot-compatible',
    tab: 'recommended',
    tag: '推荐',
    models: ['kimi-k2-0905-preview', 'kimi-latest'],
  },
  {
    id: 'custom-provider',
    title: '自定义供应商',
    subtitle: '配置自定义 API 兼容的供应商',
    protocol: 'openai-compatible',
    tab: 'recommended',
    models: ['custom-model'],
  },
  {
    id: 'deepseek',
    title: 'DeepSeek',
    subtitle: 'DeepSeek 官方 API 服务',
    protocol: 'openai-compatible',
    tab: 'china',
    models: ['deepseek-v4-pro', 'deepseek-chat'],
  },
  {
    id: 'qwen',
    title: '通义千问',
    subtitle: '阿里云百炼模型服务',
    protocol: 'dashscope-compatible',
    tab: 'china',
    models: ['qwen-max', 'qwen-plus'],
  },
  {
    id: 'doubao',
    title: '豆包',
    subtitle: '火山方舟模型服务',
    protocol: 'ark-compatible',
    tab: 'china',
    models: ['doubao-pro', 'doubao-lite'],
  },
  {
    id: 'siliconflow',
    title: 'SiliconFlow',
    subtitle: '国内多模型聚合平台',
    protocol: 'openai-compatible',
    tab: 'aggregator',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen3-Coder'],
  },
  {
    id: 'openrouter',
    title: 'OpenRouter',
    subtitle: '海外多模型聚合平台',
    protocol: 'openai-compatible',
    tab: 'aggregator',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4.1'],
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'OpenAI 官方模型服务',
    protocol: 'openai',
    tab: 'global',
    models: ['gpt-4.1', 'o4-mini'],
  },
  {
    id: 'gemini',
    title: 'Google Gemini',
    subtitle: 'Gemini 官方模型服务',
    protocol: 'gemini',
    tab: 'global',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  {
    id: 'ollama',
    title: 'Ollama',
    subtitle: '本地 Ollama 运行时',
    protocol: 'local',
    tab: 'local',
    models: ['llama3.3', 'qwen2.5-coder'],
  },
  {
    id: 'lm-studio',
    title: 'LM Studio',
    subtitle: '本地 OpenAI 兼容运行时',
    protocol: 'local-openai-compatible',
    tab: 'local',
    models: ['local-default'],
  },
];

function getAccountEmail(account?: PlatformAccountProjection | null): string {
  return account?.accountEmail ?? '未登录';
}

function getAccountStateLabel(account?: PlatformAccountProjection | null): string {
  if (!account) {
    return '未连接';
  }
  if (account.oauthState === 'authenticated') {
    return account.tenantName ?? '已登录';
  }
  if (account.oauthState === 'expired') {
    return '会话过期';
  }
  return '未登录';
}

function getAccountAvatarLetter(account?: PlatformAccountProjection | null): string {
  const email = account?.accountEmail?.trim();
  if (!email) {
    return 'L';
  }
  return email.charAt(0).toUpperCase();
}

function createDefaultModelProviderProjection(version?: string): PlatformModelProviderProjection[] {
  return [
    {
      id: 'claude',
      displayName: '默认 (Claude)',
      description: 'Use the default model',
      protocol: 'anthropic-compatible',
      enabled: Boolean(version),
      apiKeyConfigured: Boolean(version),
      models: ['Use the default model (currently Sonnet 4.6)', 'Haiku 4.5', 'Sonnet 4.6 for long sessions', 'Opus 4.7 (1M)'],
    },
    {
      id: 'deepseek',
      displayName: 'DeepSeek',
      description: 'deepseek-v4-pro',
      protocol: 'openai-compatible',
      enabled: false,
      apiKeyConfigured: false,
      models: ['deepseek-v4-pro'],
    },
  ];
}

function normalizeModelProviders(
  providers: PlatformModelProviderProjection[],
  version?: string,
): PlatformModelProviderProjection[] {
  const preferred = createDefaultModelProviderProjection(version);
  const normalized = mergeModelProviders(preferred, providers.map(normalizeProviderId));
  return normalized.map((provider) => {
    if (provider.id === 'deepseek') {
      return {
        ...provider,
        displayName: 'DeepSeek',
        description: provider.description ?? 'deepseek-v4-pro',
        protocol: provider.protocol ?? 'openai-compatible',
        enabled: true,
        apiKeyConfigured: provider.apiKeyConfigured ?? Boolean(version),
        models: provider.models.length > 0 ? provider.models : ['deepseek-v4-pro'],
      };
    }
    if (provider.id === 'claude') {
      return {
        ...provider,
        displayName: '默认 (Claude)',
        description: provider.description ?? 'Use the default model',
        enabled: true,
        apiKeyConfigured: true,
      };
    }
    return provider;
  }).filter((provider) => hasProviderIcon(provider.id));
}

function normalizeProviderId(provider: PlatformModelProviderProjection): PlatformModelProviderProjection {
  if (provider.id === 'openai-compatible') {
    return {
      ...provider,
      id: 'deepseek',
      displayName: 'DeepSeek',
      description: 'deepseek-v4-pro',
      models: provider.models.includes('deepseek-v4-pro') ? provider.models : ['deepseek-v4-pro', ...provider.models],
    };
  }
  if (provider.id === 'anthropic-compatible') {
    return {
      ...provider,
      id: 'claude',
      displayName: '默认 (Claude)',
      description: 'Use the default model',
      models: provider.models.length > 0 ? provider.models : ['Use the default model (currently Sonnet 4.6)'],
    };
  }
  return provider;
}

function mergeModelProviders(
  left: PlatformModelProviderProjection[],
  right: PlatformModelProviderProjection[],
): PlatformModelProviderProjection[] {
  const merged = new Map<string, PlatformModelProviderProjection>();
  [...left, ...right].forEach((provider) => {
    const current = merged.get(provider.id);
    merged.set(provider.id, current ? mergeModelProvider(current, provider) : provider);
  });
  return Array.from(merged.values());
}

function mergeModelProvider(
  current: PlatformModelProviderProjection,
  next: PlatformModelProviderProjection,
): PlatformModelProviderProjection {
  return {
    ...current,
    ...next,
    models: Array.from(new Set([...(current.models ?? []), ...(next.models ?? [])])),
  };
}

function createProviderDraft(provider: PlatformModelProviderProjection): ProviderDraftState {
  return {
    apiKey: provider.apiKeyConfigured ? '••••••••••••••••••••••••••••••••' : '',
    modelInput: '',
    models: provider.models.length > 0 ? provider.models : ['default-model'],
  };
}

function createProviderProjectionFromCatalogOption(option: ProviderCatalogOption): PlatformModelProviderProjection {
  return {
    id: option.id,
    displayName: option.title,
    description: option.subtitle,
    protocol: option.protocol,
    enabled: true,
    apiKeyConfigured: false,
    models: option.models,
  };
}

function getProviderIconKey(providerId: string): ProviderIconKey | undefined {
  const icons: Record<string, ProviderIconKey> = {
    claude: 'claude',
    anthropic: 'claude',
    'anthropic-compatible': 'claude',
    deepseek: 'deepseek',
    'openai-compatible': 'deepseek',
    'kimi-coding-plan': 'kimi',
    kimi: 'kimi',
    moonshot: 'kimi',
    qwen: 'qwen',
    dashscope: 'qwen',
    doubao: 'doubao',
    siliconflow: 'silicon',
    silicon: 'silicon',
    openrouter: 'openrouter',
    openai: 'openai',
    gemini: 'gemini',
    google: 'gemini',
    ollama: 'ollama',
    'lm-studio': 'lmstudio',
    lmstudio: 'lmstudio',
    'custom-provider': 'custom',
    custom: 'custom',
  };
  return icons[providerId];
}

function hasProviderIcon(providerId: string): boolean {
  return Boolean(getProviderIconKey(providerId));
}

function ProviderIcon(props: { providerId: string }): ReactElement | null {
  const iconKey = getProviderIconKey(props.providerId);
  if (!iconKey) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className="lime-provider-icon"
      dangerouslySetInnerHTML={{ __html: providerIconSvgByKey[iconKey] }}
    />
  );
}

const providerIconSvgByKey: Record<ProviderIconKey, string> = {
  claude: '<svg height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"></path></svg>',
  deepseek: '<svg height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"></path></svg>',
  kimi: '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Kimi</title><path d="M19.738 5.776c.163-.209.306-.4.457-.585.07-.087.064-.153-.004-.244-.655-.861-.717-1.817-.34-2.787.283-.73.909-1.072 1.674-1.145.477-.045.945.004 1.379.236.57.305.902.77 1.01 1.412.086.512.07 1.012-.075 1.508-.257.878-.888 1.333-1.753 1.448-.718.096-1.446.108-2.17.157-.056.004-.113 0-.178 0z" fill="#027AFF"></path><path d="M17.962 1.844h-4.326l-3.425 7.81H5.369V1.878H1.5V22h3.87v-8.477h6.824a3.025 3.025 0 002.743-1.75V22h3.87v-8.477a3.87 3.87 0 00-3.588-3.86v-.01h-2.125a3.94 3.94 0 002.323-2.12l2.545-5.689z"></path></svg>',
  qwen: '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Qwen</title><defs><linearGradient id="lime-platform-qwen-fill" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stop-color="#00055F" stop-opacity=".84"></stop><stop offset="100%" stop-color="#6F69F7" stop-opacity=".84"></stop></linearGradient></defs><path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" fill="url(#lime-platform-qwen-fill)" fill-rule="nonzero"></path></svg>',
  doubao: '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Doubao</title><path d="M5.31 15.756c.172-3.75 1.883-5.999 2.549-6.739-3.26 2.058-5.425 5.658-6.358 8.308v1.12C1.501 21.513 4.226 24 7.59 24a6.59 6.59 0 002.2-.375c.353-.12.7-.248 1.039-.378.913-.899 1.65-1.91 2.243-2.992-4.877 2.431-7.974.072-7.763-4.5l.002.001z" fill="#1E37FC"></path><path d="M22.57 10.283c-1.212-.901-4.109-2.404-7.397-2.8.295 3.792.093 8.766-2.1 12.773a12.782 12.782 0 01-2.244 2.992c3.764-1.448 6.746-3.457 8.596-5.219 2.82-2.683 3.353-5.178 3.361-6.66a2.737 2.737 0 00-.216-1.084v-.002z" fill="#37E1BE"></path><path d="M14.303 1.867C12.955.7 11.248 0 9.39 0 7.532 0 5.883.677 4.545 1.807 2.791 3.29 1.627 5.557 1.5 8.125v9.201c.932-2.65 3.097-6.25 6.357-8.307.5-.318 1.025-.595 1.569-.829 1.883-.801 3.878-.932 5.746-.706-.222-2.83-.718-5.002-.87-5.617h.001z" fill="#A569FF"></path><path d="M17.305 4.961a199.47 199.47 0 01-1.08-1.094c-.202-.213-.398-.419-.586-.622l-1.333-1.378c.151.615.648 2.786.869 5.617 3.288.395 6.185 1.898 7.396 2.8-1.306-1.275-3.475-3.487-5.266-5.323z" fill="#1E37FC"></path></svg>',
  silicon: '<svg fill="currentColor" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Silicon Flow</title><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c3.95.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z"/></svg>',
  openrouter: '<svg fill="currentColor" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>OpenRouter</title><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.14-7-7 3.14-7 7-7zm0 2.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"/></svg>',
  openai: '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>OpenAI</title><path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"></path></svg>',
  gemini: '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Gemini</title><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"></path></svg>',
  ollama: '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Ollama</title><path d="M7.905 1.09c.216.085.411.225.588.41.295.306.544.744.734 1.263.191.522.315 1.1.362 1.68a5.054 5.054 0 012.049-.636l.051-.004c.87-.07 1.73.087 2.48.474.101.053.2.11.297.17.05-.569.172-1.134.36-1.644.19-.52.439-.957.733-1.264a1.67 1.67 0 01.589-.41c.257-.1.53-.118.796-.042.401.114.745.368 1.016.737.248.337.434.769.561 1.287.23.934.27 2.163.115 3.645l.053.04.026.019c.757.576 1.284 1.397 1.563 2.35.435 1.487.216 3.155-.534 4.088l-.018.021.002.003c.417.762.67 1.567.724 2.4l.002.03c.064 1.065-.2 2.137-.814 3.19l-.007.01.01.024c.472 1.157.62 2.322.438 3.486l-.006.039a.651.651 0 01-.747.536.648.648 0 01-.54-.742c.167-1.033.01-2.069-.48-3.123a.643.643 0 01.04-.617l.004-.006c.604-.924.854-1.83.8-2.72-.046-.779-.325-1.544-.8-2.273a.644.644 0 01.18-.886l.009-.006c.243-.159.467-.565.58-1.12a4.229 4.229 0 00-.095-1.974c-.205-.7-.58-1.284-1.105-1.683-.595-.454-1.383-.673-2.38-.61a.653.653 0 01-.632-.371c-.314-.665-.772-1.141-1.343-1.436a3.288 3.288 0 00-1.772-.332c-1.245.099-2.343.801-2.67 1.686a.652.652 0 01-.61.425c-1.067.002-1.893.252-2.497.703-.522.39-.878.935-1.066 1.588a4.07 4.07 0 00-.068 1.886c.112.558.331 1.02.582 1.269l.008.007c.212.207.257.53.109.785-.36.622-.629 1.549-.673 2.44-.05 1.018.186 1.902.719 2.536l.016.019a.643.643 0 01.095.69c-.576 1.236-.753 2.252-.562 3.052a.652.652 0 01-1.269.298c-.243-1.018-.078-2.184.473-3.498l.014-.035-.008-.012a4.339 4.339 0 01-.598-1.309l-.005-.019a5.764 5.764 0 01-.177-1.785c.044-.91.278-1.842.622-2.59l.012-.026-.002-.002c-.293-.418-.51-.953-.63-1.545l-.005-.024a5.352 5.352 0 01.093-2.49c.262-.915.777-1.701 1.536-2.269.06-.045.123-.09.186-.132-.159-1.493-.119-2.73.112-3.67.127-.518.314-.95.562-1.287.27-.368.614-.622 1.015-.737.266-.076.54-.059.797.042zm4.116 9.09c.936 0 1.8.313 2.446.855.63.527 1.005 1.235 1.005 1.94 0 .888-.406 1.58-1.133 2.022-.62.375-1.451.557-2.403.557-1.009 0-1.871-.259-2.493-.734-.617-.47-.963-1.13-.963-1.845 0-.707.398-1.417 1.056-1.946.668-.537 1.55-.849 2.485-.849zm0 .896a3.07 3.07 0 00-1.916.65c-.461.37-.722.835-.722 1.25 0 .428.21.829.61 1.134.455.347 1.124.548 1.943.548.799 0 1.473-.147 1.932-.426.463-.28.7-.686.7-1.257 0-.423-.246-.89-.683-1.256-.484-.405-1.14-.643-1.864-.643zm.662 1.21l.004.004c.12.151.095.37-.056.49l-.292.23v.446a.375.375 0 01-.376.373.375.375 0 01-.376-.373v-.46l-.271-.218a.347.347 0 01-.052-.49.353.353 0 01.494-.051l.215.172.22-.174a.353.353 0 01.49.051zm-5.04-1.919c.478 0 .867.39.867.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zm8.706 0c.48 0 .868.39.868.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zM7.44 2.3l-.003.002a.659.659 0 00-.285.238l-.005.006c-.138.189-.258.467-.348.832-.17.692-.216 1.631-.124 2.782.43-.128.899-.208 1.404-.237l.01-.001.019-.034c.046-.082.095-.161.148-.239.123-.771.022-1.692-.253-2.444-.134-.364-.297-.65-.453-.813a.628.628 0 00-.107-.09L7.44 2.3zm9.174.04l-.002.001a.628.628 0 00-.107.09c-.156.163-.32.45-.453.814-.29.794-.387 1.776-.23 2.572l.058.097.008.014h.03a5.184 5.184 0 011.466.212c.086-1.124.038-2.043-.128-2.722-.09-.365-.21-.643-.349-.832l-.004-.006a.659.659 0 00-.285-.239h-.004z"></path></svg>',
  lmstudio: '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>LM Studio</title><path d="M2.84 2a1.273 1.273 0 100 2.547h14.107a1.273 1.273 0 100-2.547H2.84zM7.935 5.33a1.273 1.273 0 000 2.548H22.04a1.274 1.274 0 000-2.547H7.935zM3.624 9.935c0-.704.57-1.274 1.274-1.274h14.106a1.274 1.274 0 010 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM1.273 12.188a1.273 1.273 0 100 2.547H15.38a1.274 1.274 0 000-2.547H1.273zM3.624 16.792c0-.704.57-1.274 1.274-1.274h14.106a1.273 1.273 0 110 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM13.029 18.849a1.273 1.273 0 100 2.547h9.698a1.273 1.273 0 100-2.547h-9.698z" fill-opacity=".3"></path><path d="M2.84 2a1.273 1.273 0 100 2.547h10.287a1.274 1.274 0 000-2.547H2.84zM7.935 5.33a1.273 1.273 0 000 2.548H18.22a1.274 1.274 0 000-2.547H7.935zM3.624 9.935c0-.704.57-1.274 1.274-1.274h10.286a1.273 1.273 0 010 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM1.273 12.188a1.273 1.273 0 100 2.547H11.56a1.274 1.274 0 000-2.547H1.273zM3.624 16.792c0-.704.57-1.274 1.274-1.274h10.286a1.273 1.273 0 110 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM13.029 18.849a1.273 1.273 0 100 2.547h5.78a1.273 1.273 0 100-2.547h-5.78z"></path></svg>',
  custom: '<svg fill="currentColor" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Custom Provider</title><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
};

const platformSettingsStyles = `
.lime-account-entry {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;
  width: 100%;
}
.lime-account-entry-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: #edf1f3;
  color: #26333b;
  font-size: 13px;
  font-weight: 700;
}
.lime-account-entry-summary {
  display: grid;
  min-width: 0;
  gap: 3px;
  border: 0;
  background: transparent;
  color: #26333b;
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.lime-account-entry-summary strong,
.lime-account-entry-summary span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-account-entry-summary strong {
  font-size: 12px;
  font-weight: 650;
}
.lime-account-entry-summary span {
  color: #75818b;
  font-size: 11px;
}
.lime-account-entry-summary span.ready {
  color: #17623a;
}
.lime-account-entry-settings {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #52616d;
  cursor: pointer;
}
.lime-account-entry-settings:hover {
  border-color: #d8e2e5;
  background: #f2f5f6;
}
.lime-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(22, 33, 42, 0.35);
}
.lime-settings-dialog {
  display: grid;
  grid-template-columns: 160px minmax(0, 800px);
  overflow: hidden;
  width: min(960px, calc(100vw - 72px));
  height: min(700px, calc(100vh - 72px));
  border: 1px solid rgba(223, 228, 232, 0.95);
  border-radius: 16px;
  background: #f8fafb;
  box-shadow: 0 24px 80px rgba(31, 45, 56, 0.24);
}
.lime-settings-nav-panel {
  background: #eef2f4;
  padding: 18px 8px;
}
.lime-settings-nav-title {
  padding: 0 10px 14px;
  color: #65727e;
  font-size: 13px;
}
.lime-settings-nav-list {
  display: grid;
  gap: 4px;
  list-style: none;
}
.lime-settings-nav-item {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #34434d;
  cursor: pointer;
  padding: 9px 10px;
  text-align: left;
}
.lime-settings-nav-item::before,
.lime-settings-nav-item::after,
.lime-settings-nav-label::before,
.lime-settings-nav-label::after,
.lime-settings-nav-item::marker {
  display: none !important;
  content: none !important;
}
.lime-settings-nav-item > .lime-settings-nav-icon,
.lime-settings-nav-item > .lime-settings-nav-symbol,
.lime-settings-nav-item > [aria-hidden="true"],
.lime-settings-nav-item > svg,
.lime-settings-nav-item > img,
.lime-settings-nav-item > span:first-child:not(:last-child) {
  display: none !important;
}
.lime-settings-nav-label {
  display: block;
}
.lime-settings-nav-item:disabled {
  cursor: default;
  opacity: 0.95;
}
.lime-settings-nav-item.active {
  background: #ffffff;
  color: #1d2329;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.08);
}
.lime-settings-content {
  position: relative;
  overflow: auto;
  background: #fbfcfd;
  padding: 22px 26px 92px;
}
.lime-settings-content h1 {
  margin: 0;
  color: #1d2329;
  font-size: 18px;
  font-weight: 700;
}
.lime-settings-content h2 {
  margin-bottom: 10px;
  color: #26333b;
  font-size: 14px;
  font-weight: 650;
}
.lime-settings-content p {
  color: #8a96a0;
}
.lime-settings-page-description {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 7px 0 0;
  color: #8a96a0;
  font-size: 12px;
}
.lime-settings-inline-link {
  border: 0;
  background: transparent;
  color: #4c5b66;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.lime-settings-close {
  position: absolute;
  top: 20px;
  right: 24px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #697681;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}
.lime-settings-close:hover {
  background: #eef2f4;
}
.lime-settings-section {
  margin-top: 34px;
}
.lime-account-avatar-row,
.lime-account-field-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.lime-account-field-row {
  min-height: 78px;
  justify-content: space-between;
}
.lime-account-field-row.compact {
  justify-content: space-between;
}
.lime-account-avatar {
  display: grid;
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #eef1f3;
  color: #26333b;
  font-weight: 650;
}
.lime-account-link-button {
  border: 0;
  background: transparent;
  color: #9aa4ad;
  padding: 0;
}
.lime-account-link-button:disabled {
  color: #b5bec6;
}
.lime-settings-divider {
  height: 1px;
  background: #e4eaee;
}
.lime-settings-divider.wide {
  margin-top: 34px;
}
.lime-general-settings {
  display: grid;
}
.lime-settings-projection-page {
  display: grid;
  gap: 18px;
}
.lime-settings-projection-grid {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}
.lime-settings-projection-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  align-items: center;
  min-height: 54px;
  border-bottom: 1px solid #e4eaee;
  color: #3a4650;
}
.lime-settings-projection-row span {
  color: #8a96a0;
  font-size: 12px;
}
.lime-settings-projection-row strong {
  font-size: 13px;
  font-weight: 650;
}
.lime-settings-projection-note {
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #ffffff;
  color: #596672;
  padding: 14px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-theme-settings {
  display: grid;
  gap: 24px;
  margin-top: 32px;
}
.lime-theme-section {
  display: grid;
  gap: 14px;
}
.lime-theme-section.compact {
  gap: 12px;
}
.lime-theme-section h2 {
  margin: 0;
  color: #2a3640;
}
.lime-theme-mode-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.lime-theme-mode {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  border: 0;
  border-radius: 999px;
  background: #f0f2f4;
  color: #4e5b65;
  cursor: pointer;
  padding: 0 13px;
  font-size: 13px;
}
.lime-theme-mode.active {
  background: #5f6875;
  color: #ffffff;
}
.lime-theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 22px;
}
.lime-theme-palette {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  align-items: center;
  min-height: 56px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: #2e3b45;
  cursor: pointer;
  gap: 10px;
  padding: 8px 10px;
  text-align: left;
}
.lime-theme-palette:hover,
.lime-theme-palette.active {
  border-color: #e0e6ea;
  background: #ffffff;
}
.lime-theme-swatch {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 4px solid #f7f8f9;
  border-radius: 999px;
  background: #f7f8f9;
  box-shadow: 0 0 0 1px #dbe3e8;
  overflow: hidden;
}
.lime-theme-swatch::before {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  background: var(--swatch-a);
  transform: translate(var(--swatch-x, 0), var(--swatch-y, 0));
  transition: transform 120ms ease-out;
}
.lime-theme-swatch i {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 15px;
  height: 15px;
  border: 3px solid #f7f8f9;
  border-radius: 999px;
  background: var(--swatch-b);
  transform: translate(calc(var(--swatch-x, 0) * -0.35), calc(var(--swatch-y, 0) * -0.35));
  transition: transform 120ms ease-out;
  z-index: 1;
}
.lime-theme-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.lime-theme-copy strong,
.lime-theme-copy small {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-theme-copy strong {
  font-size: 13px;
  font-weight: 650;
}
.lime-theme-copy small {
  color: #9ba5ad;
  font-size: 11px;
}
.lime-theme-check {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: #5f6875;
  color: #ffffff;
  font-size: 12px;
}
.lime-theme-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.lime-theme-serif-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4e5b65;
  font-size: 12px;
}
.lime-theme-font-slider {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: #b0bac2;
  font-size: 12px;
}
.lime-theme-font-slider input {
  width: 100%;
  accent-color: #667381;
}
.lime-theme-font-preview {
  border-radius: 12px;
  background: #f2f4f6;
  color: #2e3b45;
  padding: 14px;
  font-size: 13px;
  line-height: 1.5;
}
.lime-theme-font-preview.serif {
  font-family: Georgia, "Times New Roman", serif;
}
.lime-voice-settings {
  display: grid;
}
.lime-voice-section {
  display: grid;
  gap: 14px;
  padding: 22px 0;
}
.lime-voice-section.compact {
  gap: 10px;
}
.lime-voice-row,
.lime-voice-model-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
}
.lime-voice-row h2,
.lime-voice-model-row h2,
.lime-voice-test-head h2 {
  margin: 0;
  color: #26333b;
  font-size: 14px;
  font-weight: 650;
}
.lime-voice-row p,
.lime-voice-model-row p,
.lime-voice-test-head p {
  margin: 6px 0 0;
  color: #8a96a0;
  font-size: 12px;
  line-height: 1.5;
}
.lime-voice-shortcut-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.lime-voice-shortcut-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 78px;
  min-height: 30px;
  border: 1px solid #dce4e9;
  border-radius: 999px;
  background: #ffffff;
  color: #3d4a54;
  cursor: pointer;
  padding: 0 13px;
  font-size: 12px;
  font-weight: 650;
}
.lime-voice-shortcut-pill:hover,
.lime-voice-outline-button:hover,
.lime-voice-test-actions button:hover,
.lime-voice-history-toggle:hover {
  border-color: #cbd6dd;
  background: #f5f7f8;
}
.lime-voice-hint {
  border-radius: 12px;
  background: #f0f2f4;
  color: #66737d;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.65;
}
.lime-voice-model-copy {
  display: grid;
  min-width: 0;
  gap: 7px;
}
.lime-voice-model-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}
.lime-voice-model-title h2 {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-voice-model-title em {
  border-radius: 999px;
  background: #e8f4ed;
  color: #17623a;
  padding: 3px 8px;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}
.lime-voice-model-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dbe3e8;
  border-radius: 10px;
  background: #ffffff;
  color: #54616c;
  font-size: 13px;
}
.lime-voice-install-state {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  background: #eef2f4;
  color: #66737d;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 650;
}
.lime-voice-install-state.ready {
  background: #e8f4ed;
  color: #17623a;
}
.lime-voice-outline-button,
.lime-voice-test-actions button {
  min-height: 34px;
  border: 1px solid #dce4e9;
  border-radius: 999px;
  background: #ffffff;
  color: #3d4a54;
  cursor: pointer;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
.lime-voice-test-head {
  display: grid;
  gap: 3px;
}
.lime-voice-test-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}
.lime-voice-status {
  border: 1px solid #dfe7ec;
  border-radius: 12px;
  background: #ffffff;
  color: #56636e;
  padding: 11px 13px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-voice-history-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 42px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #2d3a43;
  cursor: pointer;
  padding: 0 10px;
  text-align: left;
}
.lime-voice-history-toggle span {
  font-size: 14px;
  font-weight: 650;
}
.lime-voice-history-toggle strong {
  color: #7b8791;
  font-size: 12px;
  font-weight: 650;
}
.lime-voice-history-list {
  display: grid;
  gap: 8px;
}
.lime-voice-history-item,
.lime-voice-history-empty {
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  background: #ffffff;
  padding: 11px 13px;
}
.lime-voice-history-item span {
  color: #8a96a0;
  font-size: 11px;
}
.lime-voice-history-item p,
.lime-voice-history-empty {
  margin: 5px 0 0;
  color: #3d4a54;
  font-size: 12px;
  line-height: 1.5;
}
.lime-search-settings {
  display: grid;
  gap: 20px;
  margin-top: 32px;
}
.lime-search-info {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  border-radius: 12px;
  background: #f0f2f4;
  color: #7b8791;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-search-info p {
  margin: 0;
  color: inherit;
}
.lime-search-service-section {
  display: grid;
  gap: 10px;
}
.lime-search-section-label {
  color: #b0bac2;
  font-size: 12px;
  font-weight: 650;
}
.lime-search-enabled-list,
.lime-search-available-list {
  display: grid;
  gap: 7px;
}
.lime-search-enabled-card {
  display: grid;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f0f2f4;
  color: #34424c;
  padding: 12px 12px 10px;
}
.lime-search-enabled-card.dragging {
  border-color: #cdd8df;
  opacity: 0.78;
}
.lime-search-enabled-head {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.lime-search-drag-handle {
  color: #9da8b0;
  cursor: grab;
}
.lime-search-enabled-head h2 {
  margin: 0;
  color: #26333b;
  font-size: 13px;
  font-weight: 650;
}
.lime-search-enabled-head p {
  margin: 4px 0 0;
  color: #9aa5ad;
  font-size: 11px;
}
.lime-search-key-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding-left: 30px;
}
.lime-search-key-row input,
.lime-search-extra-input {
  height: 30px;
  min-width: 0;
  border: 1px solid #dfe5e9;
  border-radius: 999px;
  background: #ffffff;
  color: #34424c;
  padding: 0 13px;
  font-size: 12px;
}
.lime-search-key-row input::placeholder,
.lime-search-extra-input::placeholder {
  color: #c0c8ce;
}
.lime-search-key-row button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  border: 1px solid #5d6975;
  border-radius: 999px;
  background: #ffffff;
  color: #34424c;
  cursor: pointer;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
.lime-search-extra-input {
  margin-left: 30px;
  width: calc(100% - 30px);
}
.lime-search-available-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 54px;
  border-radius: 10px;
  background: transparent;
  color: #34424c;
  gap: 12px;
  padding: 4px 12px;
}
.lime-search-available-row:hover {
  background: #f5f7f8;
}
.lime-search-available-row strong,
.lime-search-available-row small {
  display: block;
}
.lime-search-available-row strong {
  font-size: 13px;
  font-weight: 500;
}
.lime-search-available-row small {
  margin-top: 5px;
  color: #a8b1b8;
  font-size: 11px;
}
.lime-search-status {
  border: 1px solid #dfe7ec;
  border-radius: 12px;
  background: #fbfcfd;
  color: #56636e;
  padding: 11px 13px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-setting-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 86px;
  border-bottom: 1px solid #e4eaee;
  gap: 18px;
}
.lime-setting-row.compact {
  min-height: 64px;
}
.lime-setting-row strong,
.lime-setting-row span {
  display: block;
}
.lime-setting-row strong {
  color: #2a3640;
  font-size: 14px;
  font-weight: 650;
}
.lime-setting-row span {
  margin-top: 5px;
  color: #8a96a0;
  font-size: 12px;
  line-height: 1.45;
}
.lime-toggle {
  position: relative;
  width: 34px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: #d2d8de;
  padding: 0;
}
.lime-toggle span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(32, 43, 51, 0.18);
}
.lime-toggle.checked {
  background: #5d6975;
}
.lime-toggle.checked span {
  left: 17px;
}
.lime-shortcut-control {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.lime-shortcut-control kbd {
  min-width: 52px;
  border: 1px solid #e2e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #4f5d67;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  text-align: center;
}
.lime-general-section {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #e4eaee;
  padding: 24px 0;
}
.lime-general-section h2 {
  margin: 0;
}
.lime-general-section p {
  color: #8a96a0;
  font-size: 12px;
}
.lime-model-settings {
  display: grid;
  grid-template-columns: 222px minmax(0, 1fr);
  gap: 22px;
  margin-top: 26px;
  min-height: 500px;
}
.lime-model-side {
  border-right: 1px solid #e4eaee;
  padding-right: 14px;
}
.lime-model-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #7b8791;
}
.lime-model-side-head strong,
.lime-model-side-head span {
  display: block;
}
.lime-model-side-head strong {
  color: #3a4650;
  font-size: 13px;
}
.lime-model-side-head span {
  margin-top: 2px;
  font-size: 12px;
}
.lime-model-side-head button,
.lime-model-add-button {
  border: 0;
  background: transparent;
  color: #8a96a0;
  cursor: pointer;
}
.lime-model-enabled-list {
  display: grid;
  gap: 6px;
  margin-top: 18px;
}
.lime-model-provider-row {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 42px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #3a4650;
  cursor: pointer;
  padding: 7px 10px;
  text-align: left;
}
.lime-model-provider-row:hover,
.lime-model-add-button:hover {
  background: #f2f5f7;
}
.lime-model-provider-row.active {
  background: #eef1f3;
}
.lime-model-provider-row strong,
.lime-model-provider-row small {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-model-provider-row strong {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13px;
}
.lime-model-provider-row small {
  grid-column: 2 / 4;
  color: #a0a8b1;
  font-size: 11px;
}
.lime-model-provider-row em,
.lime-model-priority-row em,
.lime-model-catalog-card em {
  border-radius: 5px;
  background: #e6bd43;
  color: #332604;
  padding: 2px 5px;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}
.lime-model-add-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 6px);
  border-radius: 10px;
  margin-top: 10px;
  padding: 8px 10px;
  text-align: left;
}
.lime-model-add-button.active {
  background: #eef1f3;
  color: #3a4650;
}
.lime-model-main {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
}
.lime-model-config-card {
  display: grid;
  gap: 14px;
  border: 1px solid #e3e8ec;
  border-radius: 18px;
  background: #ffffff;
  padding: 16px;
  max-width: 528px;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.04);
}
.lime-model-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lime-model-card-title-main {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}
.lime-model-card-title-main > span {
  flex: 0 0 auto;
}
.lime-provider-icon {
  display: inline-grid;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  place-items: center;
  color: #3a4650;
}
.lime-provider-icon svg {
  display: block;
  width: 16px;
  height: 16px;
}
.lime-model-card-title h2 {
  margin: 0;
  font-size: 16px;
}
.lime-model-card-title button {
  border: 0;
  background: transparent;
  color: #4d5b66;
  font-size: 12px;
}
.lime-model-ready-banner {
  border-radius: 10px;
  background: #e8f4ed;
  color: #168246;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 650;
}
.lime-model-field {
  display: grid;
  gap: 7px;
  color: #8a96a0;
  font-size: 12px;
}
.lime-model-field input {
  height: 34px;
  border: 1px solid #e4e9ed;
  border-radius: 999px;
  background: #ffffff;
  color: #3a4650;
  padding: 0 14px;
}
.lime-model-priority {
  display: grid;
  gap: 8px;
}
.lime-model-priority > span,
.lime-model-footnote {
  color: #8a96a0;
  font-size: 12px;
}
.lime-model-priority-box {
  display: grid;
  gap: 8px;
  border-radius: 18px;
  background: #f2f3f5;
  padding: 14px;
}
.lime-model-priority-box button {
  width: fit-content;
  border: 0;
  background: transparent;
  color: #4d5b66;
}
.lime-model-priority-row {
  display: grid;
  grid-template-columns: 16px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: #3a4650;
  font-size: 12px;
}
.lime-model-priority-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-model-priority-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.lime-model-priority-actions button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 6px;
  color: #6a7680;
  cursor: pointer;
  font-size: 11px;
}
.lime-model-priority-actions button:disabled {
  cursor: default;
  opacity: 0.35;
}
.lime-model-add-priority {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.lime-model-add-priority input {
  height: 30px;
  min-width: 0;
  border: 1px solid #e0e6ea;
  border-radius: 999px;
  background: #ffffff;
  color: #3a4650;
  padding: 0 12px;
}
.lime-model-add-priority button {
  white-space: nowrap;
}
.lime-model-test-button,
.lime-model-intent-link {
  height: 34px;
  border: 1px solid #596672;
  border-radius: 999px;
  background: #ffffff;
  color: #4d5b66;
  cursor: pointer;
}
.lime-model-intent-link {
  max-width: 528px;
}
.lime-model-catalog {
  display: grid;
  gap: 16px;
}
.lime-model-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow: hidden;
  border-radius: 999px;
  background: #eef1f3;
  padding: 2px;
}
.lime-model-tabs button {
  min-height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #6a7680;
  cursor: pointer;
  font-size: 12px;
}
.lime-model-tabs button.active {
  background: #ffffff;
  color: #2d3a43;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.1);
}
.lime-model-catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.lime-model-catalog-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 84px;
  border: 1px solid #e3e8ec;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  padding: 12px;
  text-align: left;
}
.lime-model-catalog-card:hover {
  border-color: #cdd8df;
  background: #fbfcfd;
}
.lime-model-catalog-card strong,
.lime-model-catalog-card span,
.lime-model-catalog-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-model-catalog-card strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #3a4650;
  font-size: 13px;
}
.lime-model-catalog-card strong .lime-provider-icon {
  width: 18px;
  height: 18px;
}
.lime-model-catalog-card strong .lime-provider-icon svg {
  width: 18px;
  height: 18px;
}
.lime-model-catalog-card span {
  grid-column: 1 / 3;
  color: #8a96a0;
  font-size: 12px;
}
.lime-model-catalog-card small {
  grid-column: 1 / 3;
  color: #b0bac2;
  font-size: 11px;
}
.lime-segmented-control {
  display: grid;
  overflow: hidden;
  height: 30px;
  border-radius: 999px;
  background: #eef1f3;
  padding: 2px;
}
.lime-segmented-control.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.lime-segmented-control.six {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.lime-segmented-control button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64717c;
  font-size: 12px;
}
.lime-segmented-control button.active {
  background: #ffffff;
  color: #26333b;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.1);
}
.lime-account-state {
  color: #8a96a0;
  font-size: 12px;
}
.lime-account-state.good {
  color: #17623a;
}
.lime-logout-button,
.lime-account-secondary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  border: 0;
  border-radius: 999px;
  background: #edf1f3;
  color: #4a5862;
  cursor: pointer;
  padding: 10px 18px;
}
.lime-account-secondary-action {
  margin-left: 10px;
  background: #ffffff;
  border: 1px solid #d9e0e4;
}
.lime-logout-button:hover,
.lime-account-secondary-action:hover {
  background: #e4e9ed;
}
.lime-settings-intent-result {
  display: grid;
  grid-template-columns: auto 140px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  border-radius: 8px;
  padding: 10px 12px;
}
.lime-settings-intent-result.ok {
  border: 1px solid #bcdcca;
  background: #f1faf5;
}
.lime-settings-intent-result.blocked {
  border: 1px solid #f2c0ba;
  background: #fff4f2;
}
.lime-settings-intent-result span:last-child {
  overflow: hidden;
  color: #4e5b65;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-settings-footer {
  position: absolute;
  right: 26px;
  bottom: 24px;
  display: flex;
  gap: 10px;
}
.lime-settings-reset,
.lime-settings-done {
  min-width: 74px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  padding: 10px 20px;
}
.lime-settings-reset {
  background: #eef1f3;
  color: #697681;
}
.lime-settings-done {
  background: #16302b;
  color: #ffffff;
}
`;
