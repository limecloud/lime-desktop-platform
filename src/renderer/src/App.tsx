import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type {
  BillingSnapshot,
  LaunchEntryResult,
  ModelSettings,
  PlatformBootstrap,
  PlatformCapability,
  PlatformNavigationIntent,
  PlatformSettings,
} from '../../shared/types';
import {
  PlatformModuleOutlet,
  platformModuleLabels,
  platformModules,
  type PlatformModuleActionHandlers,
  type PlatformModuleKey,
} from './platformModules';

interface ToastState {
  kind: 'info' | 'warning' | 'error';
  message: string;
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
  const [activeModule, setActiveModule] = useState<PlatformModuleKey>('overview');
  const [selectedAppId, setSelectedAppId] = useState<string>();
  const [runtimeResult, setRuntimeResult] = useState<LaunchEntryResult>();
  const [capabilityResult, setCapabilityResult] = useState<unknown>();
  const [busyAction, setBusyAction] = useState<string>();
  const [toast, setToast] = useState<ToastState>();
  const [loginTenant, setLoginTenant] = useState('Lime 内部租户');
  const [loginEmail, setLoginEmail] = useState('dev@limecloud.local');

  async function refresh(nextToast?: ToastState): Promise<PlatformBootstrap> {
    const nextBootstrap = await window.limeDesktop.platform.getBootstrap();
    setBootstrap(nextBootstrap);
    setSelectedAppId((current) => current ?? nextBootstrap.catalog[0]?.manifest.appId);
    if (nextToast) {
      setToast(nextToast);
    }
    return nextBootstrap;
  }

  async function runPlatformAction<T>(action: () => Promise<T>, message: string): Promise<T> {
    try {
      const result = await action();
      await refresh({ kind: 'info', message });
      return result;
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
      throw error;
    }
  }

  useEffect(() => {
    refresh().catch((error) => {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '启动失败' });
    });
  }, []);

  useEffect(() => {
    return window.limeDesktop.platform.onChanged((event) => {
      setBootstrap(event.bootstrap);
      if (event.reason === 'app-uninstalled') {
        setRuntimeResult((current) => (current?.appId === event.appId ? undefined : current));
        setCapabilityResult(undefined);
      }
      setSelectedAppId((current) => current ?? event.bootstrap.catalog[0]?.manifest.appId);
    });
  }, []);

  const actions = useMemo<PlatformModuleActionHandlers>(
    () => ({
      installApp: (appId) =>
        runPlatformAction(() => window.limeDesktop.apps.install(appId), 'Package 安装记录已更新。'),
      updateApp: (appId) =>
        runPlatformAction(() => window.limeDesktop.apps.update(appId), 'Package 更新记录已更新。'),
      enableApp: (appId) =>
        runPlatformAction(() => window.limeDesktop.apps.enable(appId), '入口已启用。'),
      disableApp: (appId) =>
        runPlatformAction(() => window.limeDesktop.apps.disable(appId), '入口已禁用。'),
      uninstallApp: (appId) =>
        runPlatformAction(
          () => window.limeDesktop.apps.uninstall({ appId, keepData: true }),
          'Package 已从当前工作区卸载。',
        ),
      launchEntry: (appId, entryKey) =>
        runPlatformAction(
          () => window.limeDesktop.apps.launchEntry({ appId, entryKey }),
          '运行状态已刷新。',
        ),
      invokeCapability: (capability: PlatformCapability) => {
        if (!runtimeResult?.appId || !runtimeResult.entryKey) {
          return Promise.reject(new Error('请先启动一个入口。'));
        }
        return runPlatformAction(
          () =>
            window.limeDesktop.apps.invokeCapability({
              appId: runtimeResult.appId,
              entryKey: runtimeResult.entryKey,
              capability,
              operation: 'preview',
            }),
          '能力调用已记录。',
        );
      },
      login: (tenantName, accountEmail) =>
        runPlatformAction(
          () => window.limeDesktop.auth.login({ tenantName, accountEmail }),
          '本地开发会话已建立。',
        ),
      logout: () => runPlatformAction(() => window.limeDesktop.auth.logout(), '会话已退出。'),
      enableLocalModel: () =>
        runPlatformAction(
          async (): Promise<ModelSettings> => {
            if (!bootstrap) {
              throw new Error('平台 bootstrap 尚未加载。');
            }
            return window.limeDesktop.settings.saveModel(createLocalModelSettings(bootstrap.modelSettings));
          },
          '本地模型配置已启用。',
        ),
      refreshBilling: () =>
        runPlatformAction(() => window.limeDesktop.billing.refresh(), '充值状态投影已刷新。'),
      savePlatformSettings: (settings: PlatformSettings) =>
        runPlatformAction(() => window.limeDesktop.settings.savePlatform(settings), '平台设置已保存。'),
      checkUpdates: () =>
        runPlatformAction(() => window.limeDesktop.updates.check(), '更新状态已刷新。'),
      downloadUpdate: (appId) =>
        runPlatformAction(() => window.limeDesktop.updates.download(appId), 'Package artifact 已下载并校验。'),
      applyUpdate: (appId) =>
        runPlatformAction(() => window.limeDesktop.updates.apply(appId), 'Package 更新状态已处理。'),
      openPlatformIntent: (intent: PlatformNavigationIntent) => {
        const targetModule = intentToModule(intent.target);
        setActiveModule(targetModule);
        setToast({ kind: 'info', message: `已打开 ${platformModuleLabels[targetModule]}。` });
        return Promise.resolve({ ok: true, target: intent.target });
      },
      selectModule: setActiveModule,
    }),
    [bootstrap, runtimeResult],
  );

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
          <StatusPill
            label="会话"
            value={bootstrap.authSession.state === 'authenticated' ? '已登录' : '未登录'}
            tone={bootstrap.authSession.state === 'authenticated' ? 'good' : 'warn'}
          />
          <StatusPill
            label="账单"
            value={billingLabel(bootstrap.billingState.state)}
            tone={bootstrap.billingState.state === 'active' ? 'good' : 'warn'}
          />
          <StatusPill label="宿主" value={bootstrap.hostProfile.hostKind} />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          {platformModules.map((module) => (
            <button
              className={activeModule === module.key ? 'nav-item active' : 'nav-item'}
              key={module.key}
              onClick={() => setActiveModule(module.key)}
            >
              {module.label}
            </button>
          ))}
          <div className="sidebar-meta">
            <span>工作区</span>
            <code title={bootstrap.platformSettings.workspacePath}>{bootstrap.platformSettings.workspacePath}</code>
          </div>
        </aside>

        <section className="workspace">
          {toast ? (
            <div className={`toast ${toast.kind}`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(undefined)} aria-label="关闭提示">x</button>
            </div>
          ) : null}
          <PlatformModuleOutlet
            moduleKey={activeModule}
            bootstrap={bootstrap}
            actions={actions}
            selectedAppId={selectedAppId}
            runtimeResult={runtimeResult}
            capabilityResult={capabilityResult}
            busyAction={busyAction}
            loginTenant={loginTenant}
            loginEmail={loginEmail}
            onSelectApp={setSelectedAppId}
            onRuntimeResult={setRuntimeResult}
            onCapabilityResult={setCapabilityResult}
            onLoginTenantChange={setLoginTenant}
            onLoginEmailChange={setLoginEmail}
            onBusyActionChange={setBusyAction}
          />
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

function StatusPill(props: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }): ReactElement {
  return (
    <span className={`status-pill ${props.tone ?? ''}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </span>
  );
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

function intentToModule(target: PlatformNavigationIntent['target']): PlatformModuleKey {
  const targets: Record<PlatformNavigationIntent['target'], PlatformModuleKey> = {
    'app-center': 'app-center',
    'auth-settings': 'cloud-session',
    'model-settings': 'model-settings',
    'branding-settings': 'branding',
    'billing-settings': 'billing',
    updates: 'updates',
    diagnostics: 'diagnostics',
    runtime: 'runtime',
  };
  return targets[target];
}
