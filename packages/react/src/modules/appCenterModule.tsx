import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type {
  CatalogApp,
  DesktopAppProjection,
  InstalledAppRecord,
  LaunchEntryResult,
  PlatformCapability,
  PlatformBootstrap,
  ReadinessResult,
} from '@limecloud/desktop-platform-contracts';
import type { PlatformModuleActionHandlers, PlatformModuleKey } from '../index';

type AppCenterStatusFilter = 'all' | 'installed' | 'attention';
type AppCenterSourceFilter = 'all' | 'cloud' | 'local' | 'oem';

interface PlatformAppCenterModuleProps {
  bootstrap: PlatformBootstrap;
  actions: PlatformModuleActionHandlers;
  selectedAppId?: string;
  busyAction?: string;
  onSelectApp: (appId: string) => void;
  onRuntimeResult: (result: LaunchEntryResult | undefined) => void;
  onCapabilityResult: (result: unknown) => void;
  onBusyActionChange: (value: string | undefined) => void;
}

interface PlatformAppCenterItem {
  appId: string;
  title: string;
  description: string;
  sourceKind: CatalogApp['sourceKind'];
  statusKind: 'installed' | 'installable' | 'update' | 'disabled' | 'blocked' | 'needs-setup';
  catalogApp: CatalogApp;
  projection?: DesktopAppProjection;
  installed?: InstalledAppRecord;
}

const pageSize = 20;

export function PlatformAppCenterModule(props: PlatformAppCenterModuleProps): ReactElement {
  const [statusFilter, setStatusFilter] = useState<AppCenterStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<AppCenterSourceFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailAppId, setDetailAppId] = useState<string | undefined>();
  const items = useMemo(() => createAppCenterItems(props.bootstrap), [props.bootstrap]);
  const counts = useMemo(() => createFilterCounts(items), [items]);
  const filteredItems = items.filter((item) => {
    const statusMatched =
      statusFilter === 'all' ||
      (statusFilter === 'installed' && Boolean(item.installed)) ||
      (statusFilter === 'attention' && ['update', 'blocked', 'needs-setup', 'disabled'].includes(item.statusKind));
    const sourceMatched = sourceFilter === 'all' || item.sourceKind === sourceFilter;
    return statusMatched && sourceMatched;
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedItem = detailAppId ? items.find((item) => item.appId === detailAppId) : undefined;

  const selectStatusFilter = (filter: AppCenterStatusFilter): void => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const selectSourceFilter = (filter: AppCenterSourceFilter): void => {
    setSourceFilter(filter);
    setCurrentPage(1);
  };

  const openDetail = (appId: string): void => {
    setDetailAppId(appId);
    props.onSelectApp(appId);
  };
  const run = <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> =>
    runModuleAction(props, key, action);

  return (
    <div className="lime-app-center">
      <style>{appCenterModuleStyles}</style>
      <div className="lime-app-center-head">
        <div>
          <h1>平台应用中心</h1>
          <p>管理 Agent App package 目录、本地安装、readiness、入口状态和 package 更新。</p>
        </div>
      </div>

      <div className="lime-app-center-summary">
        <SummaryCard label="全部应用" value={items.length} />
        <SummaryCard label="已安装" value={counts.installed} />
        <SummaryCard label="待处理" value={counts.attention} />
        <SummaryCard label="更新可用" value={counts.update} />
      </div>

      <div className="lime-app-center-toolbar">
        <div className="lime-app-center-segment">
          {[
            ['all', '全部', counts.all],
            ['installed', '已安装', counts.installed],
            ['attention', '待处理', counts.attention],
          ].map(([key, label, count]) => (
            <button
              className={statusFilter === key ? 'active' : ''}
              key={key}
              type="button"
              onClick={() => selectStatusFilter(key as AppCenterStatusFilter)}
            >
              <span>{label}</span>
              <em>{count}</em>
            </button>
          ))}
        </div>
        <div className="lime-app-center-source-filter" aria-label="应用来源筛选">
          <span>来源：</span>
          {[
            ['all', '全部'],
            ['cloud', '云端'],
            ['local', '本地'],
            ['oem', 'OEM'],
          ].map(([key, label]) => (
            <button
              className={sourceFilter === key ? 'active' : ''}
              key={key}
              type="button"
              onClick={() => selectSourceFilter(key as AppCenterSourceFilter)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="lime-app-center-sort">排序：最近更新</span>
      </div>

      <div className="lime-app-center-grid" data-testid="platform-app-center-grid">
        {pagedItems.map((item) => (
          <AppCenterCard
            busyAction={props.busyAction}
            item={item}
            key={item.appId}
            onOpenDetail={() => openDetail(item.appId)}
            onPrimaryAction={() => void runPrimaryAction(item, { ...props, onRun: run })}
          />
        ))}
        {pagedItems.length === 0 ? (
          <div className="lime-app-center-empty">
            <strong>{items.length === 0 ? '暂无 Agent App。' : '没有匹配的应用。'}</strong>
            <span>切换筛选条件，或等待平台从 limecore 同步目录。</span>
          </div>
        ) : null}
      </div>

      <div className="lime-app-center-pagination">
        <span>第 {safePage} / {totalPages} 页，共 {filteredItems.length} 个应用</span>
        <div>
          <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            上一页
          </button>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
            下一页
          </button>
        </div>
      </div>

      {selectedItem ? (
        <AppCenterDetailDialog
          busyAction={props.busyAction}
          item={selectedItem}
          onClose={() => setDetailAppId(undefined)}
          onRun={run}
          onSelectModule={(moduleKey) => props.actions.selectModule?.(moduleKey)}
          onRuntimeResult={props.onRuntimeResult}
          onCapabilityResult={props.onCapabilityResult}
          actions={props.actions}
        />
      ) : null}
    </div>
  );
}

function SummaryCard(props: { label: string; value: number }): ReactElement {
  return (
    <div className="lime-app-center-summary-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function AppCenterCard(props: {
  item: PlatformAppCenterItem;
  busyAction?: string;
  onOpenDetail: () => void;
  onPrimaryAction: () => void;
}): ReactElement {
  const entry = props.item.projection?.entryCards[0];
  const busy = Boolean(props.busyAction?.includes(props.item.appId));
  const primaryDisabled = busy || (Boolean(props.item.installed) && !entry?.enabled && props.item.statusKind !== 'disabled');

  return (
    <article className="lime-app-center-card">
      <div className="lime-app-center-card-head">
        <AppIcon title={props.item.title} />
        <div>
          <h2>{props.item.title}</h2>
          <div className="lime-app-center-card-badges">
            <span className={`source ${props.item.sourceKind}`}>{sourceLabel(props.item.sourceKind)}</span>
            <span className={`status ${props.item.statusKind}`}>{statusLabel(props.item.statusKind)}</span>
          </div>
        </div>
      </div>
      <p>{props.item.description || '该应用暂未提供描述。'}</p>
      <div className="lime-app-center-card-version">
        <span>{props.item.installed ? `当前 v${props.item.installed.version}` : `最新 v${props.item.catalogApp.latestVersion}`}</span>
        {props.item.installed && props.item.installed.version !== props.item.catalogApp.latestVersion ? (
          <em>云端 v{props.item.catalogApp.latestVersion}</em>
        ) : null}
      </div>
      <div className="lime-app-center-card-actions">
        <button type="button" disabled={primaryDisabled} onClick={props.onPrimaryAction}>
          {busy ? '处理中...' : primaryActionLabel(props.item)}
        </button>
        <button type="button" onClick={props.onOpenDetail}>详情</button>
      </div>
      {props.item.projection?.catalogCard.updateAvailable ? (
        <button className="lime-app-center-update-link" type="button" onClick={props.onOpenDetail}>
          查看可用更新
        </button>
      ) : null}
    </article>
  );
}

function AppCenterDetailDialog(props: {
  item: PlatformAppCenterItem;
  busyAction?: string;
  actions: PlatformModuleActionHandlers;
  onRun: <T>(key: string, action: () => Promise<T>) => Promise<T | undefined>;
  onClose: () => void;
  onSelectModule: (moduleKey: PlatformModuleKey) => void;
  onRuntimeResult: (result: LaunchEntryResult | undefined) => void;
  onCapabilityResult: (result: unknown) => void;
}): ReactElement {
  const projection = props.item.projection;
  const installed = Boolean(props.item.installed);

  return (
    <div className="lime-app-center-detail-overlay" role="presentation" onClick={props.onClose}>
      <section className="lime-app-center-detail" role="dialog" aria-modal="true" aria-label={`${props.item.title} 详情`} onClick={(event) => event.stopPropagation()}>
        <div className="lime-app-center-detail-body">
          <div className="lime-app-center-detail-head">
            <AppIcon title={props.item.title} large />
            <div>
              <span>应用详情</span>
              <h2>{props.item.title}</h2>
              <div className="lime-app-center-card-badges">
                <span className={`source ${props.item.sourceKind}`}>{sourceLabel(props.item.sourceKind)}</span>
                <span className={`status ${props.item.statusKind}`}>{statusLabel(props.item.statusKind)}</span>
              </div>
            </div>
            <button type="button" onClick={props.onClose} aria-label="关闭应用详情">关闭</button>
          </div>

          <p className="lime-app-center-detail-description">{props.item.description || '该应用暂未提供描述。'}</p>

          <button
            className="lime-app-center-detail-primary"
            type="button"
            disabled={Boolean(props.busyAction?.includes(props.item.appId))}
            onClick={() => void runPrimaryAction(props.item, props)}
          >
            {props.busyAction?.includes(props.item.appId) ? '处理中...' : primaryActionLabel(props.item)}
          </button>

          {projection ? (
            <>
              <section className="lime-app-center-detail-section">
                <h3>Readiness</h3>
                {projection.readiness.reasons.length === 0 ? (
                  <p className="lime-app-center-muted">当前入口可启动。</p>
                ) : (
                  <ul className="lime-app-center-reason-list">
                    {projection.readiness.reasons.map((reason) => (
                      <li key={`${reason.code}:${reason.message}`}>
                        <strong>{reason.code}</strong>
                        <span>{reason.message}</span>
                        <em>{reason.fixable ? '可修复' : '不可自动修复'}</em>
                      </li>
                    ))}
                  </ul>
                )}
                {projection.readiness.setupActions.length > 0 ? (
                  <div className="lime-app-center-setup-actions">
                    {projection.readiness.setupActions.map((action) => (
                      <button key={action} type="button" onClick={() => props.onSelectModule(actionToModuleKey(action))}>
                        {action}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="lime-app-center-detail-section">
                <h3>常用入口</h3>
                {projection.entryCards.length > 0 ? (
                  <div className="lime-app-center-entry-grid">
                    {projection.entryCards.slice(0, 5).map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        disabled={!installed || !entry.enabled}
                        onClick={() =>
                          void props.onRun(`launch:${projection.appId}:${entry.key}`, async () => {
                            const result = await props.actions.launchEntry(projection.appId, entry.key);
                            props.onRuntimeResult(result);
                            props.onCapabilityResult(undefined);
                            props.actions.selectModule?.('runtime');
                            return result;
                          })
                        }
                      >
                        <span>{entry.label}</span>
                        <small>{entry.route}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="lime-app-center-muted">该应用暂未声明入口。</p>
                )}
              </section>

              <section className="lime-app-center-detail-section">
                <h3>能力要求</h3>
                <div className="lime-app-center-chip-list">
                  {projection.capabilityPreview.map((capability) => (
                    <span key={capability}>{capabilityLabel(capability)}</span>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {props.item.catalogApp.frameworkHighlights && props.item.catalogApp.frameworkHighlights.length > 0 ? (
            <section className="lime-app-center-detail-section">
              <h3>框架能力</h3>
              <div className="lime-app-center-framework-list">
                {props.item.catalogApp.frameworkHighlights.map((item) => (
                  <div key={item.label}>
                    <span className={`status ${item.state}`}>{readinessStateText(item.state)}</span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="lime-app-center-detail-section">
            <h3>更多信息</h3>
            <dl className="lime-app-center-metadata">
              <div>
                <dt>App ID</dt>
                <dd>{props.item.appId}</dd>
              </div>
              <div>
                <dt>安装模式</dt>
                <dd>{props.item.catalogApp.manifest.installMode}</dd>
              </div>
              <div>
                <dt>当前版本</dt>
                <dd>{props.item.installed?.version ?? '-'}</dd>
              </div>
              <div>
                <dt>目录版本</dt>
                <dd>{props.item.catalogApp.latestVersion}</dd>
              </div>
              <div>
                <dt>最近启动</dt>
                <dd>{formatTime(props.item.installed?.lastLaunchedAt)}</dd>
              </div>
            </dl>
          </section>

          <div className="lime-app-center-detail-actions">
            {installed && props.item.installed?.enabled ? (
              <>
                <button type="button" disabled={!projection?.catalogCard.updateAvailable} onClick={() => projection ? void props.onRun(`update:${projection.appId}`, () => props.actions.applyUpdate(projection.appId)) : undefined}>
                  更新 Package
                </button>
                <button type="button" onClick={() => projection ? void props.onRun(`disable:${projection.appId}`, () => props.actions.disableApp(projection.appId)) : undefined}>
                  禁用入口
                </button>
                <button type="button" onClick={() => projection ? void props.onRun(`uninstall:${projection.appId}`, () => props.actions.uninstallApp(projection.appId)) : undefined}>
                  卸载 Package
                </button>
              </>
            ) : installed && projection ? (
              <button type="button" onClick={() => void props.onRun(`enable:${projection.appId}`, () => props.actions.enableApp(projection.appId))}>
                启用入口
              </button>
            ) : projection ? (
              <button type="button" onClick={() => void props.onRun(`install:${projection.appId}`, () => props.actions.installApp(projection.appId))}>
                安装 Package
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function AppIcon(props: { title: string; large?: boolean }): ReactElement {
  const initial = [...props.title][0] ?? 'L';
  return <div className={props.large ? 'lime-app-center-icon large' : 'lime-app-center-icon'} aria-hidden="true">{initial}</div>;
}

function createAppCenterItems(bootstrap: PlatformBootstrap): PlatformAppCenterItem[] {
  return bootstrap.catalog.map((catalogApp) => {
    const appId = catalogApp.manifest.appId;
    const installed = bootstrap.installedApps.find((item) => item.appId === appId);
    const projection = bootstrap.projections.find((item) => item.appId === appId);
    const readiness = projection?.readiness.state;
    const updateAvailable = Boolean(projection?.catalogCard.updateAvailable || (installed && installed.version !== catalogApp.latestVersion));
    const statusKind: PlatformAppCenterItem['statusKind'] = installed?.enabled === false
      ? 'disabled'
      : updateAvailable
        ? 'update'
        : installed
          ? readiness === 'blocked'
            ? 'blocked'
            : readiness === 'needs-setup'
              ? 'needs-setup'
              : 'installed'
          : 'installable';

    return {
      appId,
      title: catalogApp.manifest.displayName,
      description: catalogApp.description,
      sourceKind: catalogApp.sourceKind,
      statusKind,
      catalogApp,
      projection,
      installed,
    };
  });
}

function createFilterCounts(items: PlatformAppCenterItem[]): Record<AppCenterStatusFilter | 'update', number> {
  return {
    all: items.length,
    installed: items.filter((item) => Boolean(item.installed)).length,
    attention: items.filter((item) => ['update', 'blocked', 'needs-setup', 'disabled'].includes(item.statusKind)).length,
    update: items.filter((item) => item.statusKind === 'update').length,
  };
}

async function runPrimaryAction(item: PlatformAppCenterItem, props: {
  actions: PlatformModuleActionHandlers;
  onRun: <T>(key: string, action: () => Promise<T>) => Promise<T | undefined>;
  onRuntimeResult: (result: LaunchEntryResult | undefined) => void;
  onCapabilityResult: (result: unknown) => void;
}): Promise<void> {
  if (!item.projection) {
    return;
  }
  if (!item.installed) {
    await props.onRun(`install:${item.appId}`, () => props.actions.installApp(item.appId));
    return;
  }
  if (!item.installed.enabled) {
    await props.onRun(`enable:${item.appId}`, () => props.actions.enableApp(item.appId));
    return;
  }
  if (item.projection.catalogCard.updateAvailable) {
    await props.onRun(`update:${item.appId}`, () => props.actions.applyUpdate(item.appId));
    return;
  }
  const entry = item.projection.entryCards.find((candidate) => candidate.enabled) ?? item.projection.entryCards[0];
  if (!entry) {
    return;
  }
  const result = await props.onRun(`launch:${item.appId}:${entry.key}`, () => props.actions.launchEntry(item.appId, entry.key));
  if (result) {
    props.onRuntimeResult(result);
    props.onCapabilityResult(undefined);
    props.actions.selectModule?.('runtime');
  }
}

async function runModuleAction<T>(
  props: Pick<PlatformAppCenterModuleProps, 'onBusyActionChange'>,
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

function primaryActionLabel(item: PlatformAppCenterItem): string {
  if (!item.installed) {
    return '安装';
  }
  if (!item.installed.enabled) {
    return '启用';
  }
  if (item.projection?.catalogCard.updateAvailable) {
    return '更新';
  }
  return '打开';
}

function sourceLabel(source: CatalogApp['sourceKind']): string {
  const labels: Record<CatalogApp['sourceKind'], string> = {
    cloud: '云端',
    local: '本地',
    oem: 'OEM',
  };
  return labels[source] ?? source;
}

function statusLabel(status: PlatformAppCenterItem['statusKind']): string {
  const labels: Record<PlatformAppCenterItem['statusKind'], string> = {
    installed: '已安装',
    installable: '可安装',
    update: '可更新',
    disabled: '已禁用',
    blocked: '已阻断',
    'needs-setup': '待配置',
  };
  return labels[status];
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

export const appCenterModuleStyles = `
.lime-app-center {
  display: grid;
  gap: 16px;
}
.lime-app-center-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.lime-app-center-head h1 {
  margin: 0;
  color: #18202f;
  font-size: 22px;
  line-height: 1.2;
}
.lime-app-center-head p {
  margin: 6px 0 0;
  color: #64748b;
}
.lime-app-center-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.lime-app-center-summary-card {
  display: grid;
  gap: 8px;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 13px 14px;
}
.lime-app-center-summary-card span {
  color: #64748b;
  font-size: 12px;
}
.lime-app-center-summary-card strong {
  color: #18202f;
  font-size: 22px;
}
.lime-app-center-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}
.lime-app-center-segment,
.lime-app-center-source-filter {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.lime-app-center-segment button,
.lime-app-center-source-filter button,
.lime-app-center-pagination button,
.lime-app-center-detail-actions button,
.lime-app-center-setup-actions button {
  min-height: 30px;
  border: 1px solid #d9e0ea;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 650;
}
.lime-app-center-segment button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.lime-app-center-segment button.active,
.lime-app-center-source-filter button.active {
  border-color: #155bd5;
  background: #eff6ff;
  color: #123d8a;
}
.lime-app-center-segment em {
  color: inherit;
  font-style: normal;
}
.lime-app-center-source-filter > span,
.lime-app-center-sort,
.lime-app-center-pagination > span {
  color: #64748b;
  font-size: 12px;
}
.lime-app-center-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.lime-app-center-card {
  display: grid;
  align-content: start;
  min-height: 210px;
  border: 1px solid #d9e0ea;
  border-radius: 10px;
  background: #ffffff;
  padding: 15px;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.04);
}
.lime-app-center-card:hover {
  border-color: #b8c4d2;
  background: #fbfcfd;
}
.lime-app-center-card-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
}
.lime-app-center-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid #d9e0ea;
  border-radius: 12px;
  background: linear-gradient(135deg, #ecfdf5, #eff6ff 60%, #f8fafc);
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}
.lime-app-center-icon.large {
  width: 76px;
  height: 76px;
  border-radius: 18px;
  font-size: 30px;
}
.lime-app-center-card h2 {
  overflow: hidden;
  margin: 0;
  color: #18202f;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-app-center-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}
.lime-app-center-card-badges span,
.lime-app-center-framework-list .status {
  display: inline-flex;
  border: 1px solid #d9e0ea;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  padding: 3px 7px;
  font-size: 11px;
  font-weight: 650;
}
.lime-app-center-card-badges .cloud,
.lime-app-center-card-badges .installed {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}
.lime-app-center-card-badges .local,
.lime-app-center-card-badges .installable {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}
.lime-app-center-card-badges .update,
.lime-app-center-card-badges .needs-setup,
.lime-app-center-framework-list .needs-setup,
.lime-app-center-framework-list .dev-projection {
  border-color: #fde68a;
  background: #fffbeb;
  color: #854d0e;
}
.lime-app-center-card-badges .blocked,
.lime-app-center-framework-list .blocked {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}
.lime-app-center-card p {
  display: -webkit-box;
  min-height: 42px;
  overflow: hidden;
  margin: 14px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}
.lime-app-center-card-version {
  display: grid;
  gap: 3px;
  margin-top: 14px;
  border-top: 1px solid #edf1f6;
  padding-top: 11px;
  color: #64748b;
  font-size: 12px;
}
.lime-app-center-card-version em {
  color: #854d0e;
  font-style: normal;
}
.lime-app-center-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: auto;
  padding-top: 14px;
}
.lime-app-center-card-actions button,
.lime-app-center-detail-primary {
  min-height: 34px;
  border: 1px solid #155bd5;
  border-radius: 999px;
  background: #155bd5;
  color: #ffffff;
  cursor: pointer;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
}
.lime-app-center-card-actions button + button,
.lime-app-center-update-link {
  border-color: #cbd5e1;
  background: #ffffff;
  color: #334155;
}
.lime-app-center-card-actions button:disabled,
.lime-app-center-detail-primary:disabled,
.lime-app-center-detail-actions button:disabled,
.lime-app-center-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.lime-app-center-update-link {
  min-height: 32px;
  margin-top: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
}
.lime-app-center-empty {
  display: grid;
  grid-column: 1 / -1;
  min-height: 260px;
  place-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}
.lime-app-center-empty strong,
.lime-app-center-empty span {
  display: block;
}
.lime-app-center-empty strong {
  color: #18202f;
}
.lime-app-center-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #d9e0ea;
  padding-top: 4px;
}
.lime-app-center-pagination div {
  display: flex;
  gap: 8px;
}
.lime-app-center-detail-overlay {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.35);
  padding: 24px;
}
.lime-app-center-detail {
  width: min(920px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid #d9e0ea;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}
.lime-app-center-detail-body {
  display: grid;
  gap: 18px;
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 22px;
}
.lime-app-center-detail-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
}
.lime-app-center-detail-head > div > span {
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}
.lime-app-center-detail-head h2 {
  margin: 6px 0 0;
  color: #18202f;
  font-size: 24px;
}
.lime-app-center-detail-head > button {
  min-height: 34px;
  border: 1px solid #d9e0ea;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  padding: 0 12px;
}
.lime-app-center-detail-description,
.lime-app-center-muted {
  color: #64748b;
  line-height: 1.6;
}
.lime-app-center-detail-section {
  display: grid;
  gap: 10px;
}
.lime-app-center-detail-section h3 {
  margin: 0;
  color: #334155;
  font-size: 13px;
}
.lime-app-center-reason-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lime-app-center-reason-list li {
  display: grid;
  gap: 4px;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
  padding: 10px;
}
.lime-app-center-reason-list em {
  color: #854d0e;
  font-size: 12px;
  font-style: normal;
}
.lime-app-center-setup-actions,
.lime-app-center-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lime-app-center-entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.lime-app-center-entry-grid button {
  display: grid;
  gap: 5px;
  border: 1px solid #d9e0ea;
  border-radius: 10px;
  background: #ffffff;
  color: #18202f;
  cursor: pointer;
  padding: 11px 12px;
  text-align: left;
}
.lime-app-center-entry-grid button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.lime-app-center-entry-grid small {
  overflow: hidden;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-app-center-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lime-app-center-chip-list span {
  border: 1px solid #d9e0ea;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  padding: 5px 8px;
  font-size: 12px;
}
.lime-app-center-framework-list {
  display: grid;
  gap: 8px;
}
.lime-app-center-framework-list div {
  display: grid;
  grid-template-columns: auto minmax(88px, 0.6fr) minmax(0, 1.6fr);
  align-items: center;
  gap: 8px;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 9px;
}
.lime-app-center-framework-list small {
  color: #64748b;
  line-height: 1.45;
}
.lime-app-center-metadata {
  display: grid;
  gap: 8px;
  margin: 0;
}
.lime-app-center-metadata div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #edf1f6;
  padding-bottom: 8px;
}
.lime-app-center-metadata dt {
  color: #64748b;
}
.lime-app-center-metadata dd {
  margin: 0;
  text-align: right;
}
@media (max-width: 1180px) {
  .lime-app-center-grid,
  .lime-app-center-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .lime-app-center-grid,
  .lime-app-center-summary,
  .lime-app-center-entry-grid {
    grid-template-columns: 1fr;
  }
  .lime-app-center-detail-head {
    grid-template-columns: 1fr;
  }
}
`;
