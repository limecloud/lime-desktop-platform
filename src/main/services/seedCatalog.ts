import type { CatalogApp, DesktopAppManifest } from '../../shared/types';

const contentStudioManifest: DesktopAppManifest = {
  appId: 'content-studio',
  displayName: '布谷AI内容工厂',
  version: '0.1.0',
  installMode: 'runtime_backed',
  entries: [
    { key: 'workbench', kind: 'workflow', label: '内容工作台', route: '/workbench' },
    { key: 'settings', kind: 'settings', label: '业务设置', route: '/settings' },
    { key: 'diagnostics', kind: 'diagnostics', label: '诊断', route: '/diagnostics' },
  ],
  requires: {
    sdkVersion: '1.0.0',
    capabilities: ['lime.cloudSession', 'lime.modelSettings', 'lime.branding', 'lime.diagnostics'],
    hostKinds: ['electron', 'tauri'],
  },
  branding: {
    theme: 'system',
  },
};

const zhongcaoManifest: DesktopAppManifest = {
  appId: 'zhongcao',
  displayName: '种草日记',
  version: '0.1.0',
  installMode: 'runtime_backed',
  entries: [
    { key: 'diary', kind: 'workflow', label: '种草日记', route: '/diary' },
    { key: 'campaigns', kind: 'page', label: '选题计划', route: '/campaigns' },
    { key: 'diagnostics', kind: 'diagnostics', label: '诊断', route: '/diagnostics' },
  ],
  requires: {
    sdkVersion: '1.0.0',
    capabilities: ['lime.cloudSession', 'lime.modelSettings', 'lime.branding', 'lime.billing'],
    hostKinds: ['electron', 'tauri'],
  },
};

const oemStarterManifest: DesktopAppManifest = {
  appId: 'oem-starter',
  displayName: 'OEM 样板应用',
  version: '0.1.0',
  installMode: 'in_lime',
  entries: [
    { key: 'home', kind: 'page', label: '入口页', route: '/home' },
    { key: 'runtime', kind: 'diagnostics', label: '运行诊断', route: '/runtime' },
  ],
  requires: {
    sdkVersion: '1.0.0',
    capabilities: ['lime.branding', 'lime.appUpdates', 'lime.diagnostics'],
    hostKinds: ['electron', 'tauri'],
  },
};

export const seedCatalog: CatalogApp[] = [
  {
    manifest: contentStudioManifest,
    sourceKind: 'cloud',
    description: '内容工厂首个接入样板，复用平台 OAuth、模型设置、品牌和诊断能力。',
    categories: ['内容生产', 'Agent App'],
    latestVersion: '0.1.0',
    updatedAt: '2026-05-23T00:00:00.000Z',
    releaseNotes: ['建立平台宿主接入样板。', '业务内容流仍留在 content-studio 仓库。'],
  },
  {
    manifest: zhongcaoManifest,
    sourceKind: 'cloud',
    description: '面向种草内容工作流的第二个接入样板，用于验证同一平台底座复用。',
    categories: ['内容生产', 'OEM'],
    latestVersion: '0.1.0',
    updatedAt: '2026-05-23T00:00:00.000Z',
    releaseNotes: ['验证模型、会话、品牌和充值投影复用。'],
  },
  {
    manifest: oemStarterManifest,
    sourceKind: 'oem',
    description: '最小 OEM 应用样板，用于验证品牌投影、更新投影和诊断能力。',
    categories: ['OEM', '样板'],
    latestVersion: '0.1.0',
    updatedAt: '2026-05-23T00:00:00.000Z',
    releaseNotes: ['提供无业务逻辑的宿主契约样板。'],
  },
];
