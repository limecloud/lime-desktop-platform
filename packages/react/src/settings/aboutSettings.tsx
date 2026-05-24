import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { PlatformNavigationIntent } from '@limecloud/desktop-platform-contracts';

export interface PlatformAboutSettingsProjection {
  productName?: string;
  version?: string;
  copyright?: string;
  logo?: ReactNode;
}

export function PlatformAboutSettingsPage(props: {
  about?: PlatformAboutSettingsProjection | null;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [statusMessage, setStatusMessage] = useState('关于页 UI 已就绪；真实更新检查、更新日志和日志目录由宿主 updater / diagnostics action handler 接入。');
  const productName = props.about?.productName ?? 'Lime Desktop Platform';
  const version = props.about?.version ?? '0.1.3';
  const copyright = props.about?.copyright ?? '© 2026 Lime Cloud. All rights reserved.';

  const openIntent = (intent: PlatformNavigationIntent, message: string): void => {
    setStatusMessage(message);
    void props.onOpenPlatformIntent(intent);
  };

  return (
    <div className="lime-about-settings">
      <div className="lime-about-brand">
        <div className="lime-about-logo-slot" aria-label={`${productName} logo`}>
          {props.about?.logo ?? (
            <span className="lime-about-logo-placeholder" aria-hidden="true">
              Logo
            </span>
          )}
        </div>
        <strong>{productName}</strong>
        <span>版本 v{version}</span>
      </div>

      <div className="lime-about-auto-row">
        <div>
          <h2>自动检查更新</h2>
          <p>启动时自动检查新版本</p>
        </div>
        <button
          className={autoCheckUpdates ? 'lime-toggle checked' : 'lime-toggle'}
          type="button"
          aria-pressed={autoCheckUpdates}
          aria-label={autoCheckUpdates ? '关闭自动检查更新' : '开启自动检查更新'}
          onClick={() => {
            setAutoCheckUpdates((current) => !current);
            setStatusMessage('自动检查更新开关已更新为 UI 草稿状态；真实保存由平台 settings action handler 接入。');
          }}
        >
          <span />
        </button>
      </div>

      <button
        className="lime-about-primary-button"
        type="button"
        onClick={() =>
          openIntent(
            { target: 'updates', reason: '从关于页检查 Product App / Agent App 更新。' },
            '已请求打开平台更新模块；真实检查由宿主 updater 接入。',
          )}
      >
        <span aria-hidden="true">↻</span>
        检查更新
      </button>

      <button
        className="lime-about-link-button"
        type="button"
        onClick={() =>
          openIntent(
            { target: 'updates', reason: '从关于页查看更新日志。' },
            '已请求打开平台更新模块查看更新信息。',
          )}
      >
        <span aria-hidden="true">ⓘ</span>
        查看更新日志
      </button>

      <button
        className="lime-about-link-button"
        type="button"
        onClick={() =>
          openIntent(
            { target: 'diagnostics', reason: '从关于页打开日志目录。' },
            '已请求打开平台诊断模块；真实打开日志目录由宿主 diagnostics action handler 接入。',
          )}
      >
        <span aria-hidden="true">↗</span>
        打开日志目录
      </button>

      <div className="lime-about-status" role="status">{statusMessage}</div>
      <p className="lime-about-copyright">{copyright}</p>
    </div>
  );
}

export const aboutSettingsStyles = `
.lime-about-settings {
  display: grid;
  justify-items: center;
  gap: 26px;
  min-height: 560px;
  padding-top: 120px;
}
.lime-about-brand {
  display: grid;
  justify-items: center;
  gap: 9px;
  color: #1f272d;
}
.lime-about-logo-slot {
  display: grid;
  min-width: 190px;
  min-height: 56px;
  place-items: center;
}
.lime-about-logo-placeholder {
  display: grid;
  min-width: 126px;
  min-height: 42px;
  place-items: center;
  border: 1px dashed #c5cdd3;
  border-radius: 12px;
  color: #a2abb3;
  font-size: 13px;
  font-weight: 650;
}
.lime-about-brand strong {
  max-width: min(360px, 100%);
  overflow: hidden;
  color: #1f272d;
  font-size: 34px;
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-about-brand > span {
  color: #b8c0c7;
  font-size: 13px;
}
.lime-about-auto-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: min(320px, 100%);
  gap: 26px;
  margin-top: 10px;
}
.lime-about-auto-row h2 {
  margin: 0;
  color: #26333b;
  font-size: 14px;
  font-weight: 650;
}
.lime-about-auto-row p {
  margin: 5px 0 0;
  color: #9aa5ad;
  font-size: 12px;
}
.lime-about-primary-button {
  display: inline-flex;
  width: min(320px, 100%);
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid #5f6974;
  border-radius: 999px;
  background: #ffffff;
  color: #4b5964;
  cursor: pointer;
  padding: 0 18px;
  font-size: 13px;
}
.lime-about-link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: #4b5964;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.lime-about-primary-button:hover,
.lime-about-link-button:hover {
  color: #1f272d;
}
.lime-about-status {
  max-width: 420px;
  color: #8a96a0;
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
}
.lime-about-copyright {
  margin: -8px 0 0;
  color: #c0c7cd;
  font-size: 12px;
}
`;
