import { useEffect, useState } from 'react';
import type { CSSProperties, DragEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { PlatformAppCenterModule } from './modules/appCenterModule';
import { PlatformAboutSettingsPage, aboutSettingsStyles } from './settings/aboutSettings';
import type { PlatformAboutSettingsProjection } from './settings/aboutSettings';
import { PlatformNetworkSettingsPage, networkSettingsStyles } from './settings/networkSettings';
import {
  PlatformModelSettingsPage,
  PlatformModelSelector,
  PlatformRuntimeModelMenu,
  createDefaultModelProviderProjection,
  getModelSettingsProjectionFromBootstrap,
  getModelSettingsProjectionFromHostSnapshot,
} from './settings/modelSettings';
import type { PlatformModelSettingsProjection } from './settings/modelSettings';
import { platformSettingsStyles, platformSettingsThemeContractStyles } from './settings/settingsStyles';
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
  ProductAppSettingsRecord,
  ProductAppSettingsScope,
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
  | 'about'
  | `product:${string}`;

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

export interface ProductSettingsExtension {
  key: string;
  label: string;
  description?: string;
  appId?: string;
  namespace?: string;
  scope?: ProductAppSettingsScope;
  settings?: ProductAppSettingsRecord | null;
  onSaveSettings?: (value: Record<string, unknown>) => Promise<ProductAppSettingsRecord> | ProductAppSettingsRecord;
  render: (context: {
    account?: PlatformAccountProjection | null;
    modelSettings?: PlatformModelSettingsProjection | null;
    settings?: ProductAppSettingsRecord | null;
    onSaveSettings?: (value: Record<string, unknown>) => Promise<ProductAppSettingsRecord> | ProductAppSettingsRecord;
    onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
  }) => ReactNode;
}

export interface PlatformSettingsThemeTokens {
  fontFamily?: string;
  textColor?: string;
  textSecondaryColor?: string;
  mutedColor?: string;
  accentColor?: string;
  accentSoftColor?: string;
  accentContrastColor?: string;
  overlayColor?: string;
  dialogColor?: string;
  contentColor?: string;
  navColor?: string;
  panelColor?: string;
  panelStrongColor?: string;
  hoverColor?: string;
  lineColor?: string;
  borderColor?: string;
  radiusSmall?: string;
  radius?: string;
  radiusLarge?: string;
  shadow?: string;
}

export type { PlatformAboutSettingsProjection } from './settings/aboutSettings';
export {
  PlatformModelSelector,
  PlatformRuntimeModelMenu,
  createDefaultModelProviderProjection,
  getModelSettingsProjectionFromBootstrap,
  getModelSettingsProjectionFromHostSnapshot,
  buildModelSettingsFromDrafts,
  normalizeModelProviders,
} from './settings/modelSettings';
export type {
  BuildModelSettingsFromDraftsInput,
  PlatformModelProviderProjection,
  PlatformModelSelection,
  PlatformModelSelectorCapability,
  PlatformModelSettingsProjection,
  ProviderDraftState,
} from './settings/modelSettings';

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
  saveModelSettings: (settings: ModelSettings) => Promise<ModelSettings>;
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

export function PlatformAccountEntry(props: {
  account?: PlatformAccountProjection | null;
  onOpenSettingsPage: (page: PlatformSettingsPageKey) => void;
  className?: string;
  style?: CSSProperties;
  theme?: PlatformSettingsThemeTokens;
}): ReactElement {
  const account = props.account ?? {};
  const accountReady = account.oauthState === 'authenticated';
  const accountEmail = getAccountEmail(account);
  const accountState = getAccountStateLabel(account);

  return (
    <div
      className={`lime-account-entry${props.className ? ` ${props.className}` : ''}`}
      style={createPlatformSettingsThemeStyle(props.theme, props.style)}
    >
      <style>{`${platformSettingsStyles}${platformSettingsThemeContractStyles}`}</style>
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
  className?: string;
  latestIntentResult?: PlatformIntentResultView;
  modelSettings?: PlatformModelSettingsProjection | null;
  platformSettings?: PlatformSettings | null;
  productSettings?: ProductSettingsExtension[];
  style?: CSSProperties;
  theme?: PlatformSettingsThemeTokens;
  onSaveModelSettings?: (settings: ModelSettings) => Promise<ModelSettings> | ModelSettings;
  onSavePlatformSettings?: (settings: PlatformSettings) => Promise<PlatformSettings> | PlatformSettings;
  onPreviewPlatformSettings?: (settings: PlatformSettings) => void;
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
  const productSettings = props.productSettings ?? [];
  const activeProductPage =
    props.activePage.startsWith('product:')
      ? productSettings.find((item) => props.activePage === `product:${item.key}`)
      : undefined;
  const activeNavItem =
    activeProductPage
      ? { key: props.activePage, label: activeProductPage.label, description: activeProductPage.description }
      : settingsNavItems.find((item) => item.key === props.activePage) ?? settingsNavItems[0];
  const overlayClassName = ['lime-settings-overlay', props.className].filter(Boolean).join(' ');

  return (
    <div className={overlayClassName} role="presentation" style={createPlatformSettingsThemeStyle(props.theme, props.style)}>
      <style>{`${platformSettingsStyles}${networkSettingsStyles}${aboutSettingsStyles}${platformSettingsThemeContractStyles}`}</style>
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
            {productSettings.length > 0 ? <div className="lime-settings-nav-section">业务设置</div> : null}
            {productSettings.map((item) => {
              const pageKey = `product:${item.key}` as PlatformSettingsPageKey;
              return (
                <button
                  className={props.activePage === pageKey ? 'lime-settings-nav-item active' : 'lime-settings-nav-item'}
                  key={item.key}
                  type="button"
                  onClick={() => props.onSelectPage(pageKey)}
                >
                  <span className="lime-settings-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="lime-settings-content">
          <header className="lime-settings-header">
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
          </header>

          <div className="lime-settings-body">
            {props.activePage === 'general' ? (
              <PlatformGeneralSettingsPage
                platformSettings={props.platformSettings}
                onPreviewPlatformSettings={props.onPreviewPlatformSettings}
                onSavePlatformSettings={props.onSavePlatformSettings}
              />
            ) : props.activePage === 'theme' ? (
              <PlatformThemeSettingsPage
                platformSettings={props.platformSettings}
                onPreviewPlatformSettings={props.onPreviewPlatformSettings}
                onSavePlatformSettings={props.onSavePlatformSettings}
              />
            ) : props.activePage === 'model' ? (
              <PlatformModelSettingsPage
                modelSettings={props.modelSettings ?? { providers: [] }}
                onSaveModelSettings={props.onSaveModelSettings}
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
            ) : activeProductPage ? (
              <ProductSettingsExtensionPage
                account={account}
                extension={activeProductPage}
                modelSettings={props.modelSettings}
                onOpenPlatformIntent={props.onOpenPlatformIntent}
              />
            ) : (
              <PlatformSettingsProjectionPage item={activeNavItem} />
            )}
          </div>

          {props.activePage === 'model' || activeProductPage ? null : (
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
          'OAuth token、refresh token 和凭证安全存储只归平台宿主控制面。',
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
      <ModuleHead title="运行" description="查看 Host Snapshot、App Server JSON-RPC bridge、RuntimeCore event 和 capability 调用结果。" />
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

function PlatformGeneralSettingsPage(props: {
  platformSettings?: PlatformSettings | null;
  onSavePlatformSettings?: (settings: PlatformSettings) => Promise<PlatformSettings> | PlatformSettings;
  onPreviewPlatformSettings?: (settings: PlatformSettings) => void;
}): ReactElement {
  const [status, setStatus] = useState<string>();
  const [generalDraft, setGeneralDraft] = useState<PlatformSettings['general']>(() =>
    props.platformSettings?.general ?? defaultPlatformGeneralSettings(),
  );

  useEffect(() => {
    setGeneralDraft(props.platformSettings?.general ?? defaultPlatformGeneralSettings());
  }, [props.platformSettings?.general]);

  const saveGeneralSettings = (patch: Partial<PlatformSettings['general']>): void => {
    const nextGeneral = {
      ...generalDraft,
      ...patch,
    };
    setGeneralDraft(nextGeneral);
    const draftSettings: PlatformSettings = {
      ...(props.platformSettings ?? createDefaultPlatformSettings()),
      general: nextGeneral,
    };
    props.onPreviewPlatformSettings?.(draftSettings);
    if (!props.platformSettings || !props.onSavePlatformSettings) {
      setStatus('当前窗口已预览；宿主未接入平台通用设置保存。');
      return;
    }
    setStatus('正在保存通用设置...');
    Promise.resolve(props.onSavePlatformSettings(draftSettings)).then((next) => {
      setGeneralDraft(next.general ?? nextGeneral);
      props.onPreviewPlatformSettings?.(next);
      setStatus('通用设置已保存。');
    }).catch((error) => {
      setStatus(error instanceof Error ? `当前窗口已预览，${error.message}` : '当前窗口已预览，通用设置保存失败。');
    });
  };

  return (
    <div className="lime-general-settings">
      <div className="lime-settings-divider wide" />
      <PlatformToggleRow
        title="通知"
        description="在生成任务完成或失败时接收平台通知。"
        checked={generalDraft.notificationsEnabled}
        onToggle={() => saveGeneralSettings({ notificationsEnabled: !generalDraft.notificationsEnabled })}
      />
      <PlatformToggleRow
        title="减少动画"
        description="关闭界面过渡动画，降低 GPU 功耗。"
        checked={generalDraft.reduceMotion}
        onToggle={() => saveGeneralSettings({ reduceMotion: !generalDraft.reduceMotion })}
      />
      <PlatformToggleRow
        title="同步本地 Agent 历史"
        description="将本地 Agent 会话投影同步到当前工作区。"
        checked={generalDraft.syncLocalAgentHistory}
        onToggle={() => saveGeneralSettings({ syncLocalAgentHistory: !generalDraft.syncLocalAgentHistory })}
      />
      <PlatformShortcutRow
        title="快捷键唤起小窗"
        description="在桌面任意位置唤醒 AI。"
        shortcut="⌥ Space"
        checked={generalDraft.quickWindowShortcutEnabled}
        onToggle={() => saveGeneralSettings({ quickWindowShortcutEnabled: !generalDraft.quickWindowShortcutEnabled })}
      />
      <PlatformToggleRow
        title="命令白名单"
        description="允许自动运行的命令。"
        checked={generalDraft.commandWhitelistEnabled}
        onToggle={() => saveGeneralSettings({ commandWhitelistEnabled: !generalDraft.commandWhitelistEnabled })}
      />
      <div className="lime-general-section">
        <h2>权限模式</h2>
        <div className="lime-segmented-control two">
          <button
            className={generalDraft.permissionMode === 'auto-approve' ? 'active' : ''}
            type="button"
            onClick={() => saveGeneralSettings({ permissionMode: 'auto-approve' })}
          >
            自动批准
          </button>
          <button
            className={generalDraft.permissionMode === 'safe' ? 'active' : ''}
            type="button"
            onClick={() => saveGeneralSettings({ permissionMode: 'safe' })}
          >
            安全
          </button>
        </div>
        <p>所有操作自动批准。Product App 不保存平台权限策略。</p>
      </div>
      <div className="lime-general-section">
        <h2>思考模式</h2>
        <div className="lime-segmented-control six">
          {thinkingModeOptions.map((option) => (
            <button
              className={generalDraft.thinkingMode === option.id ? 'active' : ''}
              key={option.id}
              type="button"
              onClick={() => saveGeneralSettings({ thinkingMode: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="lime-general-section">
        <h2>显示</h2>
        <PlatformToggleRow
          title="显示工具调用"
          description="在对话中显示 AI 使用的工具详情。"
          checked={generalDraft.showToolCalls}
          compact
          onToggle={() => saveGeneralSettings({ showToolCalls: !generalDraft.showToolCalls })}
        />
        <PlatformToggleRow
          title="默认展开工具调用"
          description="自动展开工具调用的输入和输出内容。"
          checked={generalDraft.expandToolCallsByDefault}
          compact
          onToggle={() => saveGeneralSettings({ expandToolCallsByDefault: !generalDraft.expandToolCallsByDefault })}
        />
      </div>
      {status ? <p className="lime-general-status">{status}</p> : null}
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

function ProductSettingsExtensionPage(props: {
  account?: PlatformAccountProjection | null;
  extension: ProductSettingsExtension;
  modelSettings?: PlatformModelSettingsProjection | null;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  return (
    <div className="lime-product-settings-extension">
      <div className="lime-settings-divider wide" />
      <div className="lime-settings-extension-boundary">
        <strong>{props.extension.appId ?? props.extension.key}</strong>
        <span>{props.extension.namespace ?? 'default'} / {props.extension.scope ?? 'workspace'}</span>
      </div>
      {props.extension.render({
        account: props.account,
        modelSettings: props.modelSettings,
        settings: props.extension.settings,
        onSaveSettings: props.extension.onSaveSettings,
        onOpenPlatformIntent: props.onOpenPlatformIntent,
      })}
    </div>
  );
}

function PlatformThemeSettingsPage(props: {
  platformSettings?: PlatformSettings | null;
  onSavePlatformSettings?: (settings: PlatformSettings) => Promise<PlatformSettings> | PlatformSettings;
  onPreviewPlatformSettings?: (settings: PlatformSettings) => void;
}): ReactElement {
  const [appearanceMode, setAppearanceMode] = useState<'light' | 'dark' | 'system'>(props.platformSettings?.theme ?? 'light');
  const [themeId, setThemeId] = useState<PlatformSettings['appearance']['colorTheme']>(
    props.platformSettings?.appearance?.colorTheme ?? defaultPlatformAppearanceSettings().colorTheme,
  );
  const [fontSize, setFontSize] = useState(() =>
    fontScaleToSliderValue(props.platformSettings?.appearance?.fontScale ?? defaultPlatformAppearanceSettings().fontScale),
  );
  const [serifEnabled, setSerifEnabled] = useState(
    props.platformSettings?.appearance?.serifEnabled ?? defaultPlatformAppearanceSettings().serifEnabled,
  );
  const [swatchOffset, setSwatchOffset] = useState<{ id: string; x: number; y: number }>();
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    setAppearanceMode(props.platformSettings?.theme ?? 'light');
    setThemeId(props.platformSettings?.appearance?.colorTheme ?? defaultPlatformAppearanceSettings().colorTheme);
    setFontSize(fontScaleToSliderValue(props.platformSettings?.appearance?.fontScale ?? defaultPlatformAppearanceSettings().fontScale));
    setSerifEnabled(props.platformSettings?.appearance?.serifEnabled ?? defaultPlatformAppearanceSettings().serifEnabled);
  }, [props.platformSettings?.appearance, props.platformSettings?.theme]);

  const saveAppearanceSettings = (patch: Partial<PlatformSettings['appearance']> & { theme?: PlatformSettings['theme'] }): void => {
    const { theme, ...appearancePatch } = patch;
    const nextTheme = theme ?? appearanceMode;
    const currentAppearance = props.platformSettings?.appearance ?? defaultPlatformAppearanceSettings();
    const nextAppearance = {
      ...currentAppearance,
      ...appearancePatch,
    };
    setAppearanceMode(nextTheme);
    setThemeId(nextAppearance.colorTheme);
    setFontSize(fontScaleToSliderValue(nextAppearance.fontScale));
    setSerifEnabled(nextAppearance.serifEnabled);
    const draftSettings: PlatformSettings = {
      ...(props.platformSettings ?? createDefaultPlatformSettings()),
      theme: nextTheme,
      appearance: nextAppearance,
    };
    props.onPreviewPlatformSettings?.(draftSettings);
    if (!props.platformSettings || !props.onSavePlatformSettings) {
      setStatus('当前窗口已预览；宿主未接入平台主题保存。');
      return;
    }
    setStatus('正在保存主题设置...');
    Promise.resolve(props.onSavePlatformSettings(draftSettings)).then((next) => {
      setAppearanceMode(next.theme);
      setThemeId(next.appearance?.colorTheme ?? nextAppearance.colorTheme);
      setFontSize(fontScaleToSliderValue(next.appearance?.fontScale ?? nextAppearance.fontScale));
      setSerifEnabled(next.appearance?.serifEnabled ?? nextAppearance.serifEnabled);
      props.onPreviewPlatformSettings?.(next);
      setStatus('主题设置已保存。');
    }).catch((error) => {
      setStatus(error instanceof Error ? `当前窗口已预览，${error.message}` : '当前窗口已预览，主题设置保存失败。');
    });
  };

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
              onClick={() => saveAppearanceSettings({ theme: option.id })}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
        {status ? <p className="lime-theme-status">{status}</p> : null}
      </section>

      <section className="lime-theme-section">
        <h2>颜色主题</h2>
        <div className="lime-theme-palette-grid">
          {themePaletteOptions.map((option) => (
            <button
              className={themeId === option.id ? 'lime-theme-palette active' : 'lime-theme-palette'}
              key={option.id}
              type="button"
              onClick={() => saveAppearanceSettings({ colorTheme: option.id })}
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
              onClick={() => saveAppearanceSettings({ serifEnabled: !serifEnabled })}
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
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setFontSize(nextValue);
              saveAppearanceSettings({ fontScale: sliderValueToFontScale(nextValue) });
            }}
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
    setStatusMessage(`${provider?.label ?? providerId} 配置已进入 UI 草稿；真实密钥由宿主转交 App Server provider store。`);
  };

  const requestProviderKey = (providerId: string): void => {
    const provider = providers.find((item) => item.id === providerId);
    setStatusMessage(`${provider?.label ?? providerId} 获取 Key 入口已触发；真实外部链接和 OAuth / API Key 申请流程由平台 provider metadata 接入。`);
  };

  return (
    <div className="lime-search-settings">
      <div className="lime-search-info">
        <span aria-hidden="true">ⓘ</span>
        <p>当模型运行时需要外部搜索时，AI 将使用以下搜索服务。启用多个服务时，按优先级顺序调用，失败自动切换下一个。拖拽调整优先级。</p>
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

function PlatformToggleRow({
  title,
  description,
  checked = false,
  compact = false,
  onToggle,
}: {
  title: string;
  description: string;
  checked?: boolean;
  compact?: boolean;
  onToggle?: () => void;
}): ReactElement {
  return (
    <div className={compact ? 'lime-setting-row compact' : 'lime-setting-row'}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button
        className={checked ? 'lime-toggle checked' : 'lime-toggle'}
        type="button"
        aria-pressed={checked}
        disabled={!onToggle}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

function PlatformShortcutRow(props: {
  title: string;
  description: string;
  shortcut: string;
  checked?: boolean;
  onToggle?: () => void;
}): ReactElement {
  return (
    <div className="lime-setting-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.description}</span>
      </div>
      <div className="lime-shortcut-control">
        <kbd>{props.shortcut}</kbd>
        <button
          className={props.checked ? 'lime-toggle checked' : 'lime-toggle'}
          type="button"
          aria-pressed={props.checked}
          disabled={!props.onToggle}
          onClick={props.onToggle}
        >
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
    'lime.settings': '平台设置',
    'lime.download': '下载',
    'lime.permissions': '权限',
    'lime.diagnostics': '诊断',
    'lime.storage': '业务存储',
    'lime.agent': 'Agent 运行时',
    'lime.agentExecution': 'Agent 运行时（兼容）',
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
    ['鉴权', '由平台宿主控制面管理'],
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

function defaultPlatformGeneralSettings(): PlatformSettings['general'] {
  return {
    notificationsEnabled: true,
    reduceMotion: false,
    syncLocalAgentHistory: false,
    quickWindowShortcutEnabled: true,
    commandWhitelistEnabled: false,
    permissionMode: 'auto-approve',
    thinkingMode: 'auto',
    showToolCalls: true,
    expandToolCallsByDefault: false,
  };
}

function defaultPlatformAppearanceSettings(): PlatformSettings['appearance'] {
  return {
    colorTheme: 'emerald',
    fontScale: 1,
    serifEnabled: false,
  };
}

function createDefaultPlatformSettings(): PlatformSettings {
  return {
    version: '0',
    updatedAt: new Date(0).toISOString(),
    locale: 'zh-CN',
    theme: 'light',
    appearance: defaultPlatformAppearanceSettings(),
    workspacePath: '',
    proxy: {
      enabled: false,
      url: '',
    },
    developerMode: false,
    general: defaultPlatformGeneralSettings(),
  };
}

function fontScaleToSliderValue(fontScale: number): number {
  return Math.round(((Math.max(0.85, Math.min(1.25, fontScale)) - 0.85) / 0.4) * 100);
}

function sliderValueToFontScale(value: number): number {
  return Number((0.85 + (Math.max(0, Math.min(100, value)) / 100) * 0.4).toFixed(2));
}

const thinkingModeOptions: Array<{ id: PlatformSettings['general']['thinkingMode']; label: string }> = [
  { id: 'auto', label: '自动' },
  { id: 'off', label: '关闭' },
  { id: 'low', label: '低' },
  { id: 'medium', label: '中' },
  { id: 'high', label: '高' },
  { id: 'max', label: '最高' },
];

const themePaletteOptions: Array<{
  id: PlatformSettings['appearance']['colorTheme'];
  label: string;
  description: string;
  colors: [string, string?];
}> = [
  { id: 'emerald', label: '墨绿', description: '经典深绿，温暖米色背景', colors: ['#223f32'] },
  { id: 'ocean', label: '海洋', description: '沉静专业的蓝色调', colors: ['#0e78ad'] },
  { id: 'vintage', label: '复古', description: '温暖怀旧的琥珀色调', colors: ['#cf6d00'] },
  { id: 'neon', label: '霓虹', description: '赛博朋克粉紫色调', colors: ['#b120c9'] },
  { id: 'lime', label: '青柠', description: '活力清新的黄绿配紫', colors: ['#d9ef6a', '#6f42a8'] },
  { id: 'dusk', label: '黄昏', description: '柔和温暖的暮色调', colors: ['#808434'] },
  { id: 'minimal', label: '极简', description: '清晰专业的深蓝商务风', colors: ['#145db3'] },
  { id: 'vibrant', label: '活力', description: '时尚有冲击力的现代科技风', colors: ['#38b8b2'] },
  { id: 'nature', label: '自然', description: '舒适放松的清新自然风', colors: ['#276d35'] },
  { id: 'arts', label: '文艺', description: '宁静高雅的灰蓝文艺风', colors: ['#667381'] },
  { id: 'luxury', label: '奢华', description: '尊贵权威的黑金商务风', colors: ['#c69f29'] },
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

function createPlatformSettingsThemeStyle(
  theme?: PlatformSettingsThemeTokens,
  style?: CSSProperties,
): CSSProperties | undefined {
  if (!theme) {
    return style;
  }
  const cssVars: Record<string, string | undefined> = {
    '--lime-platform-font-family': theme.fontFamily,
    '--lime-platform-text': theme.textColor,
    '--lime-platform-text-secondary': theme.textSecondaryColor,
    '--lime-platform-muted': theme.mutedColor,
    '--lime-platform-accent': theme.accentColor,
    '--lime-platform-accent-soft': theme.accentSoftColor,
    '--lime-platform-accent-contrast': theme.accentContrastColor,
    '--lime-platform-overlay': theme.overlayColor,
    '--lime-platform-dialog': theme.dialogColor,
    '--lime-platform-content': theme.contentColor,
    '--lime-platform-nav': theme.navColor,
    '--lime-platform-panel': theme.panelColor,
    '--lime-platform-panel-strong': theme.panelStrongColor,
    '--lime-platform-hover': theme.hoverColor,
    '--lime-platform-line': theme.lineColor,
    '--lime-platform-border': theme.borderColor,
    '--lime-platform-radius-sm': theme.radiusSmall,
    '--lime-platform-radius': theme.radius,
    '--lime-platform-radius-lg': theme.radiusLarge,
    '--lime-platform-shadow': theme.shadow,
  };
  const nextStyle: CSSProperties = { ...(style ?? {}) };
  Object.entries(cssVars).forEach(([key, value]) => {
    if (value) {
      nextStyle[key as keyof CSSProperties] = value as never;
    }
  });
  return nextStyle;
}
