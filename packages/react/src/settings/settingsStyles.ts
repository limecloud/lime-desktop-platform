export const platformSettingsStyles = `
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
  min-height: 0;
  overflow: auto;
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
.lime-settings-nav-section {
  margin: 14px 10px 5px;
  color: #8b98a3;
  font-size: 11px;
  font-weight: 650;
}
.lime-settings-content {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: #fbfcfd;
}
.lime-settings-header {
  position: relative;
  border-bottom: 1px solid #e4eaee;
  padding: 22px 56px 18px 26px;
}
.lime-settings-body {
  min-height: 0;
  overflow: auto;
  padding: 18px 26px 28px;
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
.lime-product-settings-extension {
  display: grid;
  gap: 16px;
}
.lime-settings-extension-boundary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #ffffff;
  color: #3a4650;
  padding: 12px 14px;
  font-size: 12px;
}
.lime-settings-extension-boundary strong,
.lime-settings-extension-boundary span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-settings-extension-boundary span {
  color: #8a96a0;
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
.lime-theme-status {
  margin: 0;
  color: #87929d;
  font-size: 12px;
  line-height: 1.4;
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
.lime-general-status {
  border: 1px solid #dfe7ec;
  border-radius: 12px;
  background: #fbfcfd;
  color: #56636e;
  padding: 11px 13px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-model-settings {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  overflow: hidden;
  min-height: 520px;
  height: min(580px, calc(100vh - 190px));
  border: 1px solid #dfe6eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.05);
}
.lime-model-side {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid #e4eaee;
  background: #fbfaf7;
}
.lime-model-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #7b8791;
  padding: 20px 20px 12px;
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
.lime-model-side-head button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 999px;
  font-size: 20px;
  line-height: 1;
}
.lime-model-enabled-list {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 0;
  overflow: auto;
  padding: 8px 16px 16px;
}
.lime-model-empty-state {
  display: grid;
  gap: 6px;
  border: 1px dashed #d5dde3;
  border-radius: 12px;
  background: #fbfcfd;
  color: #6f7d88;
  padding: 12px;
  font-size: 12px;
  line-height: 1.45;
}
.lime-model-empty-state strong,
.lime-model-empty-state span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
}
.lime-model-empty-state strong {
  color: #3a4650;
  font-size: 13px;
}
.lime-model-provider-row {
  display: grid;
  grid-template-columns: 16px 24px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  color: #3a4650;
  cursor: pointer;
  column-gap: 9px;
  padding: 9px 12px;
  text-align: left;
}
.lime-model-provider-row:hover,
.lime-model-add-button:hover {
  border-color: #e1e7eb;
  background: #ffffff;
}
.lime-model-provider-row.active {
  border-color: #dfe6eb;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.06);
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
  grid-column: 3 / 4;
  font-size: 13px;
}
.lime-model-provider-row small {
  grid-column: 3 / 5;
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
  width: 100%;
  border-radius: 16px;
  padding: 12px 14px;
  text-align: left;
}
.lime-model-add-button.active {
  background: #ffffff;
  color: #3a4650;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.06);
}
.lime-model-side-footer {
  border-top: 1px solid #e4eaee;
  padding: 14px 16px;
}
.lime-model-main {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
}
.lime-model-config-card {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #ffffff;
  padding: 0;
  max-width: none;
  box-shadow: none;
}
.lime-model-detail-head {
  display: grid;
  gap: 12px;
  border-bottom: 1px solid #e8edf0;
  padding: 22px 28px 18px;
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
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #e1e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #3a4650;
}
.lime-provider-icon svg {
  display: block;
  width: 14px;
  height: 14px;
}
.lime-model-card-title h2 {
  margin: 0;
  color: #1f2a33;
  font-size: 20px;
  font-weight: 700;
}
.lime-model-card-title button {
  min-height: 34px;
  border: 1px solid #dfe6eb;
  border-radius: 999px;
  background: #ffffff;
  color: #4d5b66;
  cursor: pointer;
  padding: 0 12px;
  font-size: 12px;
}
.lime-model-ready-banner {
  border-radius: 10px;
  background: #e8f4ed;
  color: #168246;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 650;
}
.lime-model-ready-banner.pending {
  background: #fff6de;
  color: #7b5200;
}
.lime-model-guide-notice {
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f7f9fa;
  color: #596672;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
}
.lime-model-config-scroll {
  display: grid;
  align-content: start;
  gap: 18px;
  min-height: 0;
  overflow: auto;
  padding: 20px 28px;
}
.lime-model-config-section {
  display: grid;
  gap: 12px;
  max-width: 760px;
}
.lime-model-config-section h3 {
  margin: 0;
  color: #2a3640;
  font-size: 13px;
  font-weight: 700;
}
.lime-model-selector {
  display: grid;
  gap: 9px;
  border: 1px solid #e3e8ec;
  border-radius: 14px;
  background: #ffffff;
  padding: 11px;
  min-width: 0;
}
.lime-model-selector-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.lime-model-selector-head strong,
.lime-model-selector-head span {
  display: block;
  min-width: 0;
}
.lime-model-selector-head strong {
  color: #34424c;
  font-size: 12px;
}
.lime-model-selector-head span {
  margin-top: 3px;
  color: #8a96a0;
  font-size: 11px;
  line-height: 1.4;
}
.lime-model-selector-head button {
  border: 0;
  background: transparent;
  color: #4d5b66;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.lime-model-selector-body {
  display: grid;
  gap: 8px;
}
.lime-model-selector label {
  display: grid;
  gap: 5px;
  min-width: 0;
  color: #8a96a0;
  font-size: 11px;
}
.lime-model-selector select {
  width: 100%;
  min-width: 0;
  height: 32px;
  border: 1px solid #e4e9ed;
  border-radius: 999px;
  background: #ffffff;
  color: #3a4650;
  padding: 0 12px;
}
.lime-model-selector-empty {
  border-radius: 10px;
  background: #fff6de;
  color: #7b5200;
  padding: 9px 10px;
  font-size: 11px;
  line-height: 1.45;
}
.lime-model-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.lime-model-field {
  display: grid;
  gap: 7px;
  color: #8a96a0;
  font-size: 12px;
}
.lime-model-field input,
.lime-model-field select {
  height: 38px;
  border: 1px solid #e4e9ed;
  border-radius: 10px;
  background: #ffffff;
  color: #3a4650;
  padding: 0 14px;
}
.lime-model-field select {
  appearance: none;
}
.lime-model-toggle-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  border: 1px solid #e4e9ed;
  border-radius: 12px;
  background: #fbfcfd;
  padding: 10px 12px;
}
.lime-model-toggle-row strong,
.lime-model-toggle-row span {
  display: block;
}
.lime-model-toggle-row strong {
  color: #34424c;
  font-size: 12px;
}
.lime-model-toggle-row span {
  margin-top: 4px;
  color: #8a96a0;
  font-size: 11px;
  line-height: 1.45;
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
  border: 1px solid #e4e9ed;
  border-radius: 12px;
  background: #fbfcfd;
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
  height: 34px;
  min-width: 0;
  border: 1px solid #e0e6ea;
  border-radius: 9px;
  background: #ffffff;
  color: #3a4650;
  padding: 0 12px;
}
.lime-model-add-priority button {
  white-space: nowrap;
}
.lime-model-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  border-top: 1px solid #e8edf0;
  padding: 14px 28px;
}
.lime-model-test-button,
.lime-model-save-button,
.lime-model-intent-link {
  height: 34px;
  border: 1px solid #596672;
  border-radius: 999px;
  background: #ffffff;
  color: #4d5b66;
  cursor: pointer;
}
.lime-model-save-button {
  background: #3f4a54;
  color: #ffffff;
}
.lime-model-intent-link {
  width: fit-content;
  padding: 0 14px;
}
.lime-model-status {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #596672;
  padding: 0;
  font-size: 12px;
  line-height: 1.5;
}
.lime-model-catalog {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 0;
  overflow: auto;
  padding: 28px;
}
.lime-model-empty-panel {
  display: grid;
  gap: 8px;
  max-width: 720px;
  border: 1px solid #e0e6ea;
  border-radius: 18px;
  background: #fbfcfd;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(31, 45, 56, 0.04);
}
.lime-model-empty-panel strong {
  color: #1f2a33;
  font-size: 18px;
  font-weight: 700;
}
.lime-model-empty-panel span {
  color: #75818b;
  font-size: 13px;
  line-height: 1.55;
}
.lime-model-detail-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #e8edf0;
  background: #fbfcfd;
  padding: 12px 28px;
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
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #e4eaee;
  background: #fbfcfd;
  padding: 14px 26px 18px;
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

export const platformSettingsThemeContractStyles = `
.lime-account-entry,
.lime-settings-overlay {
  --lime-platform-font-family: inherit;
  --lime-platform-text: #1a202c;
  --lime-platform-text-secondary: #4a5568;
  --lime-platform-muted: #8a99ad;
  --lime-platform-accent: #395745;
  --lime-platform-accent-soft: rgba(57, 87, 69, 0.07);
  --lime-platform-accent-contrast: #ffffff;
  --lime-platform-overlay: rgba(17, 24, 39, 0.34);
  --lime-platform-dialog: #ffffff;
  --lime-platform-content: #ffffff;
  --lime-platform-nav: #f4f6f8;
  --lime-platform-panel: #ffffff;
  --lime-platform-panel-strong: #ebeef2;
  --lime-platform-hover: rgba(57, 87, 69, 0.06);
  --lime-platform-line: rgba(17, 24, 39, 0.08);
  --lime-platform-border: rgba(17, 24, 39, 0.09);
  --lime-platform-radius-sm: 8px;
  --lime-platform-radius: 14px;
  --lime-platform-radius-lg: 20px;
  --lime-platform-shadow: 0 12px 24px rgba(17, 24, 39, 0.05), 0 32px 80px rgba(17, 24, 39, 0.12);
  color: var(--lime-platform-text);
  font-family: var(--lime-platform-font-family);
  letter-spacing: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.lime-account-entry *,
.lime-settings-overlay *,
.lime-account-entry *::before,
.lime-account-entry *::after,
.lime-settings-overlay *::before,
.lime-settings-overlay *::after {
  box-sizing: border-box;
}
.lime-account-entry button,
.lime-account-entry input,
.lime-account-entry textarea,
.lime-account-entry select,
.lime-settings-overlay button,
.lime-settings-overlay input,
.lime-settings-overlay textarea,
.lime-settings-overlay select {
  color: inherit;
  font: inherit;
  letter-spacing: 0;
}
.lime-account-entry button,
.lime-settings-overlay button {
  user-select: none;
}
.lime-settings-overlay {
  background: var(--lime-platform-overlay);
}
.lime-settings-dialog {
  border-color: var(--lime-platform-border);
  border-radius: var(--lime-platform-radius-lg);
  background: var(--lime-platform-dialog);
  box-shadow: var(--lime-platform-shadow);
}
.lime-settings-nav-panel {
  background: var(--lime-platform-nav);
}
.lime-settings-content {
  background: var(--lime-platform-content);
}
.lime-settings-header,
.lime-settings-footer {
  border-color: var(--lime-platform-line);
  background: var(--lime-platform-content);
}
.lime-account-entry-avatar,
.lime-settings-close:hover,
.lime-account-entry-settings:hover,
.lime-account-avatar,
.lime-theme-mode,
.lime-theme-font-preview,
.lime-voice-hint,
.lime-voice-install-state,
.lime-search-info,
.lime-search-enabled-card,
.lime-toggle,
.lime-shortcut-control kbd,
.lime-model-provider-row:hover,
.lime-model-add-button:hover,
.lime-model-provider-row.active,
.lime-model-add-button.active,
.lime-model-priority-box,
.lime-model-tabs,
.lime-segmented-control,
.lime-logout-button,
.lime-settings-reset {
  background: var(--lime-platform-panel-strong);
}
.lime-account-entry-summary,
.lime-settings-nav-item,
.lime-settings-inline-link,
.lime-account-link-button,
.lime-model-side-head button,
.lime-model-add-button,
.lime-model-card-title button,
.lime-model-priority-box button,
.lime-account-secondary-action {
  background: transparent;
}
.lime-settings-nav-item:hover,
.lime-theme-palette:hover,
.lime-search-available-row:hover,
.lime-voice-shortcut-pill:hover,
.lime-voice-outline-button:hover,
.lime-voice-test-actions button:hover,
.lime-voice-history-toggle:hover,
.lime-model-catalog-card:hover,
.lime-segmented-control button.active,
.lime-model-tabs button.active {
  background: var(--lime-platform-hover);
}
.lime-settings-nav-item.active,
.lime-theme-palette.active,
.lime-settings-projection-note,
.lime-settings-extension-boundary,
.lime-voice-model-icon,
.lime-voice-shortcut-pill,
.lime-voice-outline-button,
.lime-voice-test-actions button,
.lime-voice-status,
.lime-voice-history-item,
.lime-voice-history-empty,
.lime-search-status,
.lime-model-config-card,
.lime-model-field input,
.lime-model-field select,
.lime-model-add-priority input,
.lime-model-test-button,
.lime-model-intent-link,
.lime-model-status,
.lime-model-catalog-card,
.lime-settings-done,
.lime-account-secondary-action {
  background: var(--lime-platform-panel);
}
.lime-settings-nav-title,
.lime-account-entry-summary span,
.lime-settings-nav-section,
.lime-settings-content p,
.lime-settings-page-description,
.lime-account-link-button,
.lime-account-state,
.lime-settings-projection-row span,
.lime-settings-projection-note,
.lime-settings-extension-boundary span,
.lime-theme-copy small,
.lime-theme-serif-toggle,
.lime-theme-font-slider,
.lime-voice-row p,
.lime-voice-model-row p,
.lime-voice-test-head p,
.lime-voice-hint,
.lime-voice-install-state,
.lime-voice-status,
.lime-voice-history-toggle strong,
.lime-voice-history-item span,
.lime-search-info,
.lime-search-section-label,
.lime-search-enabled-head p,
.lime-search-available-row small,
.lime-search-status,
.lime-setting-row span,
.lime-general-section p,
.lime-model-empty-state,
.lime-model-side-head,
.lime-model-provider-row small,
.lime-model-field,
.lime-model-toggle-row span,
.lime-model-priority > span,
.lime-model-footnote,
.lime-model-status,
.lime-model-catalog-card span,
.lime-model-catalog-card small,
.lime-model-tabs button,
.lime-segmented-control button,
.lime-settings-reset {
  color: var(--lime-platform-muted);
}
.lime-account-entry-avatar,
.lime-account-entry-summary strong,
.lime-account-entry-settings,
.lime-settings-nav-item,
.lime-settings-content h1,
.lime-settings-content h2,
.lime-account-avatar,
.lime-settings-projection-row,
.lime-settings-projection-row strong,
.lime-settings-extension-boundary,
.lime-theme-section h2,
.lime-theme-palette,
.lime-theme-copy strong,
.lime-theme-font-preview,
.lime-voice-row h2,
.lime-voice-model-row h2,
.lime-voice-test-head h2,
.lime-voice-shortcut-pill,
.lime-voice-model-title h2,
.lime-voice-model-icon,
.lime-voice-outline-button,
.lime-voice-test-actions button,
.lime-voice-history-toggle,
.lime-voice-history-item p,
.lime-voice-history-empty,
.lime-search-enabled-card,
.lime-search-enabled-head h2,
.lime-search-key-row input,
.lime-search-extra-input,
.lime-search-key-row button,
.lime-search-available-row,
.lime-search-available-row strong,
.lime-setting-row strong,
.lime-shortcut-control kbd,
.lime-model-side-head strong,
.lime-model-provider-row,
.lime-model-add-button.active,
.lime-model-card-title h2,
.lime-provider-icon,
.lime-model-card-title button,
.lime-model-field input,
.lime-model-field select,
.lime-model-toggle-row strong,
.lime-model-priority-row,
.lime-model-priority-box button,
.lime-model-test-button,
.lime-model-intent-link,
.lime-model-catalog-card strong,
.lime-model-catalog-card:hover,
.lime-segmented-control button.active,
.lime-model-tabs button.active,
.lime-logout-button,
.lime-account-secondary-action,
.lime-settings-inline-link {
  color: var(--lime-platform-text);
}
.lime-account-entry-summary span.ready,
.lime-account-state.good,
.lime-voice-model-title em,
.lime-voice-install-state.ready,
.lime-model-ready-banner {
  color: var(--lime-platform-accent);
}
.lime-account-entry-settings:hover,
.lime-theme-palette:hover,
.lime-theme-palette.active,
.lime-settings-projection-note,
.lime-settings-extension-boundary,
.lime-voice-model-icon,
.lime-voice-shortcut-pill,
.lime-voice-outline-button,
.lime-voice-test-actions button,
.lime-voice-status,
.lime-voice-history-item,
.lime-voice-history-empty,
.lime-search-status,
.lime-search-key-row input,
.lime-search-extra-input,
.lime-search-key-row button,
.lime-model-config-card,
.lime-model-field input,
.lime-model-field select,
.lime-model-toggle-row,
.lime-model-add-priority input,
.lime-model-test-button,
.lime-model-save-button,
.lime-model-intent-link,
.lime-model-status,
.lime-model-catalog-card,
.lime-account-secondary-action {
  border-color: var(--lime-platform-border);
}
.lime-settings-divider,
.lime-settings-projection-row,
.lime-setting-row,
.lime-general-section,
.lime-model-side {
  border-color: var(--lime-platform-line);
}
.lime-toggle.checked,
.lime-theme-mode.active,
.lime-theme-check,
.lime-model-save-button,
.lime-settings-done {
  background: var(--lime-platform-accent);
  color: var(--lime-platform-accent-contrast);
}
.lime-model-ready-banner,
.lime-voice-model-title em,
.lime-voice-install-state.ready {
  background: var(--lime-platform-accent-soft);
}
.lime-settings-close,
.lime-account-entry-settings,
.lime-settings-nav-item,
.lime-settings-projection-note,
.lime-settings-extension-boundary,
.lime-theme-mode,
.lime-theme-palette,
.lime-theme-font-preview,
.lime-voice-hint,
.lime-voice-model-icon,
.lime-voice-shortcut-pill,
.lime-voice-install-state,
.lime-voice-outline-button,
.lime-voice-test-actions button,
.lime-voice-status,
.lime-voice-history-toggle,
.lime-voice-history-item,
.lime-voice-history-empty,
.lime-search-info,
.lime-search-enabled-card,
.lime-search-available-row,
.lime-search-status,
.lime-shortcut-control kbd,
.lime-model-empty-state,
.lime-model-provider-row,
.lime-model-add-button,
.lime-model-config-card,
.lime-model-ready-banner,
.lime-model-field input,
.lime-model-field select,
.lime-model-toggle-row,
.lime-model-priority-box,
.lime-model-priority-actions button,
.lime-model-test-button,
.lime-model-save-button,
.lime-model-intent-link,
.lime-model-status,
.lime-model-tabs,
.lime-model-tabs button,
.lime-model-catalog-card,
.lime-segmented-control,
.lime-segmented-control button,
.lime-logout-button,
.lime-account-secondary-action,
.lime-settings-reset,
.lime-settings-done {
  border-radius: var(--lime-platform-radius-sm);
}
.lime-settings-dialog,
.lime-model-config-card,
.lime-model-priority-box {
  border-radius: var(--lime-platform-radius-lg);
}
.lime-model-test-button,
.lime-model-save-button,
.lime-model-intent-link,
.lime-settings-reset,
.lime-settings-done,
.lime-theme-mode,
.lime-voice-shortcut-pill,
.lime-voice-outline-button,
.lime-voice-test-actions button,
.lime-shortcut-control kbd,
.lime-model-field input,
.lime-model-field select,
.lime-model-add-priority input,
.lime-model-tabs,
.lime-model-tabs button,
.lime-segmented-control,
.lime-segmented-control button,
.lime-logout-button,
.lime-account-secondary-action {
  border-radius: 999px;
}
.lime-settings-nav-item.active,
.lime-theme-palette.active,
.lime-model-config-card,
.lime-settings-done,
.lime-model-save-button {
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
}
`;
