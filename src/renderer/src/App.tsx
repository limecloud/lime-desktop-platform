import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
  BillingSnapshot,
  CatalogApp,
  DesktopAppProjection,
  LaunchEntryResult,
  ModelSettings,
  PlatformBootstrap,
  PlatformCapability,
  PlatformSettings,
  ReadinessResult,
  RuntimeEvent,
} from '../../shared/types';

type PrimaryView = 'apps' | 'settings' | 'runtime' | 'debug';
type SettingsTab = 'model' | 'auth' | 'oem' | 'billing' | 'platform';

interface ToastState {
  kind: 'info' | 'warning' | 'error';
  message: string;
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

function readinessLabel(readiness: ReadinessResult): string {
  const labels: Record<ReadinessResult['state'], string> = {
    ready: '可启动',
    'needs-setup': '待配置',
    blocked: '已阻断',
    disabled: '已禁用',
  };

  return labels[readiness.state];
}

function capabilityLabel(capability: PlatformCapability): string {
  const labels: Record<PlatformCapability, string> = {
    'lime.cloudSession': '云端会话',
    'lime.modelSettings': '模型设置',
    'lime.branding': '品牌投影',
    'lime.billing': '充值订阅',
    'lime.appUpdates': '应用更新',
    'lime.download': '下载',
    'lime.permissions': '权限',
    'lime.diagnostics': '诊断',
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

export function App(): ReactElement {
  const [bootstrap, setBootstrap] = useState<PlatformBootstrap>();
  const [activeView, setActiveView] = useState<PrimaryView>('apps');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('model');
  const [selectedAppId, setSelectedAppId] = useState<string>();
  const [runtimeResult, setRuntimeResult] = useState<LaunchEntryResult>();
  const [capabilityResult, setCapabilityResult] = useState<unknown>();
  const [busyAction, setBusyAction] = useState<string>();
  const [toast, setToast] = useState<ToastState>();
  const [loginTenant, setLoginTenant] = useState('Lime 内部租户');
  const [loginEmail, setLoginEmail] = useState('dev@limecloud.local');

  async function refresh(nextToast?: ToastState): Promise<void> {
    const nextBootstrap = await window.limeDesktop.platform.getBootstrap();
    setBootstrap(nextBootstrap);
    setSelectedAppId((current) => current ?? nextBootstrap.catalog[0]?.manifest.appId);
    if (nextToast) {
      setToast(nextToast);
    }
  }

  async function runAction<T>(key: string, action: () => Promise<T>, message: string): Promise<T | undefined> {
    try {
      setBusyAction(key);
      const result = await action();
      await refresh({ kind: 'info', message });
      return result;
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
      return undefined;
    } finally {
      setBusyAction(undefined);
    }
  }

  useEffect(() => {
    refresh().catch((error) => {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '启动失败' });
    });
  }, []);

  const selectedCatalogApp = useMemo(() => {
    return bootstrap?.catalog.find((app) => app.manifest.appId === selectedAppId);
  }, [bootstrap?.catalog, selectedAppId]);

  const selectedProjection = useMemo(() => {
    return bootstrap?.projections.find((projection) => projection.appId === selectedAppId);
  }, [bootstrap?.projections, selectedAppId]);

  const installedAppIds = useMemo(() => {
    return new Set(bootstrap?.installedApps.map((item) => item.appId) ?? []);
  }, [bootstrap?.installedApps]);

  if (!bootstrap) {
    return (
      <main className="loading-screen">
        <div className="loading-panel">
          <div className="loading-mark">Lime</div>
          <p>正在初始化桌面平台底座...</p>
        </div>
      </main>
    );
  }

  const selectedInstalled = bootstrap.installedApps.find((record) => record.appId === selectedAppId);
  const runtimeEvents = runtimeResult?.runtimeEvents ?? bootstrap.runtimeEvents.slice(-20).reverse();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">{bootstrap.oemProjection.logoText}</div>
          <div>
            <strong>{bootstrap.oemProjection.productName}</strong>
            <span>{bootstrap.oemProjection.brandName} / {bootstrap.oemProjection.channel}</span>
          </div>
        </div>
        <div className="topbar-status">
          <StatusPill label="会话" value={bootstrap.authSession.state === 'authenticated' ? '已登录' : '未登录'} tone={bootstrap.authSession.state === 'authenticated' ? 'good' : 'warn'} />
          <StatusPill label="账单" value={billingLabel(bootstrap.billingState.state)} tone={bootstrap.billingState.state === 'active' ? 'good' : 'warn'} />
          <StatusPill label="宿主" value={bootstrap.hostProfile.hostKind} />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          <button className={activeView === 'apps' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('apps')}>
            应用中心
          </button>
          <button
            className={activeView === 'settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveView('settings')}
          >
            设置中心
          </button>
          <button
            className={activeView === 'runtime' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveView('runtime')}
          >
            运行页
          </button>
          <button className={activeView === 'debug' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('debug')}>
            开发者
          </button>
          <div className="sidebar-meta">
            <span>工作区</span>
            <code title={bootstrap.platformSettings.workspacePath}>{bootstrap.platformSettings.workspacePath}</code>
          </div>
        </aside>

        <section className="workspace">
          {toast && (
            <div className={`toast ${toast.kind}`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(undefined)} aria-label="关闭提示">x</button>
            </div>
          )}

          {activeView === 'apps' && (
            <AppsView
              catalog={bootstrap.catalog}
              projections={bootstrap.projections}
              installedAppIds={installedAppIds}
              selectedAppId={selectedAppId}
              selectedCatalogApp={selectedCatalogApp}
              selectedProjection={selectedProjection}
              selectedInstalled={selectedInstalled}
              busyAction={busyAction}
              onSelect={(appId) => setSelectedAppId(appId)}
              onInstall={(appId) => runAction(`install:${appId}`, () => window.limeDesktop.apps.install(appId), '安装记录已更新。')}
              onEnable={(appId) => runAction(`enable:${appId}`, () => window.limeDesktop.apps.enable(appId), '入口已启用。')}
              onDisable={(appId) => runAction(`disable:${appId}`, () => window.limeDesktop.apps.disable(appId), '入口已禁用。')}
              onLaunch={async (appId, entryKey) => {
                const result = await runAction(
                  `launch:${appId}:${entryKey}`,
                  () => window.limeDesktop.apps.launchEntry({ appId, entryKey }),
                  '运行状态已刷新。',
                );
                if (result) {
                  setRuntimeResult(result);
                  setCapabilityResult(undefined);
                  setActiveView('runtime');
                }
              }}
              onUpdate={(appId) =>
                runAction(`update:${appId}`, () => window.limeDesktop.updates.apply(appId), '更新状态已处理。')
              }
              onOpenSettings={(tab) => {
                setSettingsTab(tab);
                setActiveView('settings');
              }}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              bootstrap={bootstrap}
              settingsTab={settingsTab}
              loginTenant={loginTenant}
              loginEmail={loginEmail}
              busyAction={busyAction}
              onTabChange={setSettingsTab}
              onTenantChange={setLoginTenant}
              onEmailChange={setLoginEmail}
              onLogin={() =>
                runAction(
                  'auth:login',
                  () => window.limeDesktop.auth.login({ tenantName: loginTenant, accountEmail: loginEmail }),
                  '本地开发会话已建立。',
                )
              }
              onLogout={() => runAction('auth:logout', () => window.limeDesktop.auth.logout(), '会话已退出。')}
              onEnableLocalModel={() =>
                runAction(
                  'model:local',
                  () => window.limeDesktop.settings.saveModel(createLocalModelSettings(bootstrap.modelSettings)),
                  '本地模型配置已启用。',
                )
              }
              onRefreshBilling={() =>
                runAction('billing:refresh', () => window.limeDesktop.billing.refresh(), '充值状态投影已刷新。')
              }
              onSavePlatform={(settings) =>
                runAction('platform:save', () => window.limeDesktop.settings.savePlatform(settings), '平台设置已保存。')
              }
            />
          )}

          {activeView === 'runtime' && (
            <RuntimeView
              selectedProjection={selectedProjection}
              runtimeResult={runtimeResult}
              capabilityResult={capabilityResult}
              runtimeEvents={runtimeEvents}
              onBackToApps={() => setActiveView('apps')}
              onInvokeCapability={(capability) => {
                if (!runtimeResult?.appId || !runtimeResult.entryKey) {
                  return;
                }
                runAction(
                  `capability:${capability}`,
                  () =>
                    window.limeDesktop.apps.invokeCapability({
                      appId: runtimeResult.appId,
                      entryKey: runtimeResult.entryKey,
                      capability,
                      operation: 'preview',
                    }),
                  '能力调用已记录。',
                ).then((result) => {
                  if (result) {
                    setCapabilityResult(result);
                  }
                });
              }}
              busyAction={busyAction}
            />
          )}

          {activeView === 'debug' && <DebugView bootstrap={bootstrap} runtimeEvents={runtimeEvents} />}
        </section>
      </div>

      <footer className="statusbar">
        <span>v{bootstrap.hostProfile.hostVersion}</span>
        <span>应用 {bootstrap.catalog.length}</span>
        <span>已安装 {bootstrap.installedApps.length}</span>
        <span>事件 {bootstrap.diagnostics.counts.runtimeEvents}</span>
      </footer>
    </main>
  );
}

interface AppsViewProps {
  catalog: CatalogApp[];
  projections: DesktopAppProjection[];
  installedAppIds: Set<string>;
  selectedAppId?: string;
  selectedCatalogApp?: CatalogApp;
  selectedProjection?: DesktopAppProjection;
  selectedInstalled?: { enabled: boolean; status: string; lastLaunchedAt?: string };
  busyAction?: string;
  onSelect: (appId: string) => void;
  onInstall: (appId: string) => void;
  onEnable: (appId: string) => void;
  onDisable: (appId: string) => void;
  onLaunch: (appId: string, entryKey: string) => void;
  onUpdate: (appId: string) => void;
  onOpenSettings: (tab: SettingsTab) => void;
}

function AppsView(props: AppsViewProps): ReactElement {
  const [filter, setFilter] = useState<'all' | 'installed' | 'needs-action'>('all');
  const visibleCatalog = props.catalog.filter((catalogApp) => {
    const appId = catalogApp.manifest.appId;
    const installed = props.installedAppIds.has(appId);
    const projection = props.projections.find((item) => item.appId === appId);

    if (filter === 'installed') {
      return installed;
    }

    if (filter === 'needs-action') {
      return projection?.readiness.state === 'needs-setup' || projection?.readiness.state === 'blocked';
    }

    return true;
  });

  return (
    <div className="split-view">
      <section className="primary-panel">
        <div className="section-head">
          <div>
            <h1>应用中心</h1>
            <p>管理云端目录、本地安装、readiness 和入口状态。</p>
          </div>
        </div>
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
            const projection = props.projections.find((item) => item.appId === appId);
            const installed = props.installedAppIds.has(appId);
            const selected = props.selectedAppId === appId;
            const actionKey = installed ? `launch:${appId}:${projection?.entryCards[0]?.key}` : `install:${appId}`;

            return (
              <div
                className={selected ? 'table-row app-row selected' : 'table-row app-row'}
                key={appId}
                onClick={() => props.onSelect(appId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    props.onSelect(appId);
                  }
                }}
                role="button"
                tabIndex={0}
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
                    <ActionButton busy={props.busyAction === `install:${appId}`} onClick={() => props.onInstall(appId)}>
                      安装
                    </ActionButton>
                  ) : (
                    <ActionButton
                      busy={props.busyAction === actionKey}
                      disabled={!projection?.entryCards[0]?.enabled}
                      onClick={() => props.onLaunch(appId, projection?.entryCards[0]?.key ?? 'home')}
                    >
                      启动
                    </ActionButton>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="detail-panel">
        {props.selectedCatalogApp && props.selectedProjection ? (
          <AppDetailPanel {...props} />
        ) : (
          <div className="empty-state">请选择一个应用。</div>
        )}
      </aside>
    </div>
  );
}

function AppDetailPanel(props: AppsViewProps): ReactElement {
  const catalogApp = props.selectedCatalogApp;
  const projection = props.selectedProjection;

  if (!catalogApp || !projection) {
    return <div className="empty-state">暂无应用详情。</div>;
  }

  const installed = props.installedAppIds.has(catalogApp.manifest.appId);

  return (
    <div className="detail-content">
      <div className="detail-title">
        <div>
          <h2>{catalogApp.manifest.displayName}</h2>
          <p>{catalogApp.manifest.appId}</p>
        </div>
        <ReadinessBadge readiness={projection.readiness} />
      </div>

      <section className="detail-section">
        <h3>Readiness</h3>
        {projection.readiness.reasons.length === 0 ? (
          <p className="muted">当前入口可启动。</p>
        ) : (
          <ul className="reason-list">
            {projection.readiness.reasons.map((reason) => (
              <li key={`${reason.code}:${reason.message}`}>
                <strong>{reason.code}</strong>
                <span>{reason.message}</span>
                <em>{reason.fixable ? '可修复' : '不可自动修复'}</em>
              </li>
            ))}
          </ul>
        )}
        {projection.readiness.setupActions.length > 0 && (
          <div className="setup-actions">
            {projection.readiness.setupActions.map((action) => (
              <button key={action} onClick={() => props.onOpenSettings(actionToSettingsTab(action))}>
                {action}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>入口</h3>
        <div className="entry-list">
          {projection.entryCards.map((entry) => (
            <button
              key={entry.key}
              disabled={!entry.enabled}
              onClick={() => props.onLaunch(projection.appId, entry.key)}
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
          {projection.capabilityPreview.map((capability) => (
            <span className="chip" key={capability}>{capabilityLabel(capability)}</span>
          ))}
        </div>
      </section>

      <div className="detail-actions">
        {!installed ? (
          <ActionButton
            busy={props.busyAction === `install:${projection.appId}`}
            onClick={() => props.onInstall(projection.appId)}
          >
            安装到工作区
          </ActionButton>
        ) : props.selectedInstalled?.enabled ? (
          <>
            {projection.catalogCard.updateAvailable && (
              <ActionButton
                busy={props.busyAction === `update:${projection.appId}`}
                onClick={() => props.onUpdate(projection.appId)}
              >
                应用更新
              </ActionButton>
            )}
            <ActionButton
              variant="secondary"
              busy={props.busyAction === `disable:${projection.appId}`}
              onClick={() => props.onDisable(projection.appId)}
            >
              禁用入口
            </ActionButton>
          </>
        ) : (
          <ActionButton
            busy={props.busyAction === `enable:${projection.appId}`}
            onClick={() => props.onEnable(projection.appId)}
          >
            启用入口
          </ActionButton>
        )}
      </div>

      <dl className="metadata-list">
        <div>
          <dt>安装模式</dt>
          <dd>{catalogApp.manifest.installMode}</dd>
        </div>
        <div>
          <dt>最近启动</dt>
          <dd>{formatTime(props.selectedInstalled?.lastLaunchedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

interface SettingsViewProps {
  bootstrap: PlatformBootstrap;
  settingsTab: SettingsTab;
  loginTenant: string;
  loginEmail: string;
  busyAction?: string;
  onTabChange: (tab: SettingsTab) => void;
  onTenantChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onEnableLocalModel: () => void;
  onRefreshBilling: () => void;
  onSavePlatform: (settings: PlatformSettings) => void;
}

function SettingsView(props: SettingsViewProps): ReactElement {
  return (
    <div className="settings-layout">
      <div className="section-head">
        <div>
          <h1>设置中心</h1>
          <p>管理模型、会话、品牌、充值和平台偏好。</p>
        </div>
      </div>

      <div className="tabs">
        {[
          ['model', '模型'],
          ['auth', 'OAuth'],
          ['oem', 'OEM'],
          ['billing', '充值'],
          ['platform', '平台'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={props.settingsTab === key ? 'tab active' : 'tab'}
            onClick={() => props.onTabChange(key as SettingsTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {props.settingsTab === 'model' && (
        <Panel title="模型设置">
          <div className="settings-grid">
            <InfoRow label="配置版本" value={props.bootstrap.modelSettings.version} />
            <InfoRow label="默认文本模型" value={props.bootstrap.modelSettings.defaultTextModelId ?? '未设置'} />
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
          <ActionButton busy={props.busyAction === 'model:local'} onClick={props.onEnableLocalModel}>
            启用本地模型配置
          </ActionButton>
        </Panel>
      )}

      {props.settingsTab === 'auth' && (
        <Panel title="OAuth / 会话">
          <div className="settings-grid">
            <InfoRow label="状态" value={props.bootstrap.authSession.state} />
            <InfoRow label="租户" value={props.bootstrap.authSession.tenantName ?? '未登录'} />
            <InfoRow label="账号" value={props.bootstrap.authSession.accountEmail ?? '未登录'} />
            <InfoRow label="过期时间" value={formatTime(props.bootstrap.authSession.expiresAt)} />
          </div>
          <div className="form-grid">
            <label>
              <span>租户名称</span>
              <input value={props.loginTenant} onChange={(event) => props.onTenantChange(event.target.value)} />
            </label>
            <label>
              <span>账号邮箱</span>
              <input value={props.loginEmail} onChange={(event) => props.onEmailChange(event.target.value)} />
            </label>
          </div>
          <div className="button-row">
            <ActionButton busy={props.busyAction === 'auth:login'} onClick={props.onLogin}>建立本地开发会话</ActionButton>
            <ActionButton variant="secondary" busy={props.busyAction === 'auth:logout'} onClick={props.onLogout}>退出会话</ActionButton>
          </div>
        </Panel>
      )}

      {props.settingsTab === 'oem' && (
        <Panel title="OEM / 品牌">
          <div className="settings-grid">
            <InfoRow label="品牌" value={props.bootstrap.oemProjection.brandName} />
            <InfoRow label="产品" value={props.bootstrap.oemProjection.productName} />
            <InfoRow label="渠道" value={props.bootstrap.oemProjection.channel} />
            <InfoRow label="状态" value={props.bootstrap.oemProjection.state} />
            <InfoRow label="主色" value={props.bootstrap.oemProjection.primaryColor} />
          </div>
        </Panel>
      )}

      {props.settingsTab === 'billing' && (
        <Panel title="充值 / 订阅">
          <div className="settings-grid">
            <InfoRow label="状态" value={billingLabel(props.bootstrap.billingState.state)} />
            <InfoRow label="套餐" value={props.bootstrap.billingState.planName ?? '未开通'} />
            <InfoRow label="余额" value={formatBalance(props.bootstrap.billingState)} />
            <InfoRow label="最近检查" value={formatTime(props.bootstrap.billingState.lastCheckedAt)} />
          </div>
          <ActionButton busy={props.busyAction === 'billing:refresh'} onClick={props.onRefreshBilling}>
            刷新充值投影
          </ActionButton>
        </Panel>
      )}

      {props.settingsTab === 'platform' && (
        <PlatformSettingsPanel
          settings={props.bootstrap.platformSettings}
          busy={props.busyAction === 'platform:save'}
          onSave={props.onSavePlatform}
        />
      )}
    </div>
  );
}

function RuntimeView(props: {
  selectedProjection?: DesktopAppProjection;
  runtimeResult?: LaunchEntryResult;
  capabilityResult?: unknown;
  runtimeEvents: RuntimeEvent[];
  onBackToApps: () => void;
  onInvokeCapability: (capability: PlatformCapability) => void;
  busyAction?: string;
}): ReactElement {
  return (
    <div className="runtime-layout">
      <div className="section-head">
        <div>
          <h1>运行页</h1>
          <p>查看 host snapshot、bridge 消息和运行事件。</p>
        </div>
        <button className="secondary-button" onClick={props.onBackToApps}>返回应用中心</button>
      </div>

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
        <Panel title={props.selectedProjection?.displayName ?? '未选择应用'}>
          <p className="muted">尚未启动入口，或当前 readiness 不允许启动。</p>
          {props.runtimeResult && <JsonBlock value={props.runtimeResult.readiness} />}
        </Panel>
      )}

      {props.selectedProjection && (
        <Panel title="Capability Invoke">
          <div className="chip-list">
            {props.selectedProjection.capabilityPreview.map((capability) => (
              <ActionButton
                key={capability}
                variant="secondary"
                disabled={!props.runtimeResult?.snapshot}
                busy={props.busyAction === `capability:${capability}`}
                onClick={() => props.onInvokeCapability(capability)}
              >
                {capabilityLabel(capability)}
              </ActionButton>
            ))}
          </div>
          {props.capabilityResult ? <JsonBlock value={props.capabilityResult} /> : <p className="muted">启动入口后可调用宿主能力。</p>}
        </Panel>
      )}

      <EventList events={props.runtimeEvents} />
    </div>
  );
}

function DebugView(props: { bootstrap: PlatformBootstrap; runtimeEvents: RuntimeEvent[] }): ReactElement {
  return (
    <div className="debug-layout">
      <div className="section-head">
        <div>
          <h1>开发者诊断</h1>
          <p>检查 manifest、projection、readiness、存储路径和事件。</p>
        </div>
      </div>
      <div className="runtime-grid">
        <Panel title="Diagnostics">
          <JsonBlock value={props.bootstrap.diagnostics} />
        </Panel>
        <Panel title="Projections">
          <JsonBlock value={props.bootstrap.projections} />
        </Panel>
      </div>
      <EventList events={props.runtimeEvents} />
    </div>
  );
}

function PlatformSettingsPanel(props: {
  settings: PlatformSettings;
  busy: boolean;
  onSave: (settings: PlatformSettings) => void;
}): ReactElement {
  const [draft, setDraft] = useState(props.settings);

  useEffect(() => {
    setDraft(props.settings);
  }, [props.settings]);

  return (
    <Panel title="平台设置">
      <div className="form-grid">
        <label>
          <span>语言</span>
          <select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <label>
          <span>主题</span>
          <select value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as PlatformSettings['theme'] })}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label className="wide-field">
          <span>工作区路径</span>
          <input value={draft.workspacePath} onChange={(event) => setDraft({ ...draft, workspacePath: event.target.value })} />
        </label>
        <label className="wide-field">
          <span>代理地址</span>
          <input value={draft.proxy.url} onChange={(event) => setDraft({ ...draft, proxy: { ...draft.proxy, url: event.target.value } })} />
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={draft.proxy.enabled}
          onChange={(event) => setDraft({ ...draft, proxy: { ...draft.proxy, enabled: event.target.checked } })}
        />
        <span>启用代理</span>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={draft.developerMode}
          onChange={(event) => setDraft({ ...draft, developerMode: event.target.checked })}
        />
        <span>启用开发者页</span>
      </label>
      <ActionButton busy={props.busy} onClick={() => props.onSave(draft)}>保存平台设置</ActionButton>
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

function Panel(props: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="panel">
      <h2>{props.title}</h2>
      {props.children}
    </section>
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

function actionToSettingsTab(action: string): SettingsTab {
  if (action.includes('auth')) {
    return 'auth';
  }
  if (action.includes('model')) {
    return 'model';
  }
  if (action.includes('billing')) {
    return 'billing';
  }
  if (action.includes('oem') || action.includes('brand')) {
    return 'oem';
  }
  return 'platform';
}

function createLocalModelSettings(settings: ModelSettings): ModelSettings {
  return {
    ...settings,
    defaultTextModelId: 'local-default',
    providers: settings.providers.map((provider) =>
      provider.id === 'local'
        ? {
            ...provider,
            enabled: true,
            apiKeyConfigured: true,
          }
        : provider,
    ),
  };
}

function formatBalance(snapshot: BillingSnapshot): string {
  if (typeof snapshot.balanceCents !== 'number') {
    return '未记录';
  }

  return `${snapshot.currency ?? 'CNY'} ${(snapshot.balanceCents / 100).toFixed(2)}`;
}
