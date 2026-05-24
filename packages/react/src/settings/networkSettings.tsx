import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

const autoBypassDomains = [
  'api.anthropic.com',
  'api.openai.com',
  'api.deepseek.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.groq.com',
  'api.perplexity.ai',
  'openrouter.ai',
  'api.siliconflow.cn',
  'dashscope.aliyuncs.com',
  'api.moonshot.cn',
  'api.minimax.chat',
  'api.baichuan-ai.com',
  'api.01.ai',
  'api.zhipuai.cn',
  'ark.cn-beijing.volces.com',
  'api.together.xyz',
  'api.cohere.ai',
  'localhost',
];

const protocolOptions = [
  { label: 'HTTP/HTTPS', value: 'http' },
  { label: 'SOCKS5', value: 'socks5' },
];

export function PlatformNetworkSettingsPage(): ReactElement {
  const [proxyEnabled, setProxyEnabled] = useState(true);
  const [protocol, setProtocol] = useState('http');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('7890');
  const [authEnabled, setAuthEnabled] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bypassList, setBypassList] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [expandedAutoBypass, setExpandedAutoBypass] = useState(false);

  const proxyPreview = useMemo(() => {
    const schema = protocol === 'socks5' ? 'socks5' : 'http';
    const normalizedHost = host.trim() || '127.0.0.1';
    const normalizedPort = port.trim() || '7890';
    const credential = authEnabled && username.trim()
      ? `${encodeURIComponent(username.trim())}${password ? `:${encodeURIComponent(password)}` : ''}@`
      : '';
    return `${schema}://${credential}${normalizedHost}:${normalizedPort}`;
  }, [authEnabled, host, password, port, protocol, username]);

  const markManual = (): void => {
    setManualMode(true);
  };

  return (
    <div className="lime-network-settings">
      <div className="lime-network-info" role="status">
        <span aria-hidden="true">ⓘ</span>
        <p>
          {manualMode
            ? '当前为手动代理配置。真实保存后由 host-core 写入 AI 子进程环境。'
            : '已自动检测到系统代理并启用。修改任一字段后将切换为手动模式。'}
        </p>
      </div>

      <section className="lime-network-section">
        <div className="lime-network-row">
          <div>
            <h2>代理服务器</h2>
            <p>为 AI 模型请求配置网络代理</p>
          </div>
          <button
            className={proxyEnabled ? 'lime-toggle checked' : 'lime-toggle'}
            type="button"
            aria-pressed={proxyEnabled}
            aria-label={proxyEnabled ? '关闭代理服务器' : '开启代理服务器'}
            onClick={() => {
              markManual();
              setProxyEnabled((current) => !current);
            }}
          >
            <span />
          </button>
        </div>

        {proxyEnabled ? (
          <div className="lime-network-proxy-grid">
            <label className="lime-network-field">
              <span>代理协议</span>
              <select
                value={protocol}
                onChange={(event) => {
                  markManual();
                  setProtocol(event.target.value);
                }}
              >
                {protocolOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="lime-network-field">
              <span>服务器地址</span>
              <input
                value={host}
                onChange={(event) => {
                  markManual();
                  setHost(event.target.value);
                }}
                placeholder="127.0.0.1"
              />
            </label>
            <label className="lime-network-field">
              <span>端口</span>
              <div className="lime-network-host-port">
                <span aria-hidden="true">:</span>
                <input
                  value={port}
                  inputMode="numeric"
                  onChange={(event) => {
                    markManual();
                    setPort(event.target.value.replace(/\D/g, '').slice(0, 5));
                  }}
                  placeholder="7890"
                />
              </div>
            </label>
          </div>
        ) : null}
      </section>

      <section className="lime-network-section">
        <div className="lime-network-row compact">
          <div>
            <h2>代理认证</h2>
            <p>仅在代理服务器需要用户名和密码时开启</p>
          </div>
          <button
            className={authEnabled ? 'lime-toggle checked' : 'lime-toggle'}
            type="button"
            aria-pressed={authEnabled}
            aria-label={authEnabled ? '关闭代理认证' : '开启代理认证'}
            onClick={() => {
              markManual();
              setAuthEnabled((current) => !current);
            }}
          >
            <span />
          </button>
        </div>
        {authEnabled ? (
          <div className="lime-network-auth-grid">
            <label className="lime-network-field">
              <span>用户名</span>
              <input
                value={username}
                onChange={(event) => {
                  markManual();
                  setUsername(event.target.value);
                }}
                placeholder="proxy-user"
              />
            </label>
            <label className="lime-network-field">
              <span>密码</span>
              <input
                value={password}
                onChange={(event) => {
                  markManual();
                  setPassword(event.target.value);
                }}
                placeholder="proxy-password"
                type="password"
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="lime-network-section">
        <label className="lime-network-bypass">
          <span>代理白名单</span>
          <input
            value={bypassList}
            onChange={(event) => {
              markManual();
              setBypassList(event.target.value);
            }}
            placeholder="metaso.cn, baidu.com"
          />
        </label>
        <p className="lime-network-caption">
          这些域名将绕过代理直连，多个用逗号分隔。适用于国内搜索服务等无需代理的地址
        </p>
        <button
          className="lime-network-auto-bypass"
          type="button"
          aria-expanded={expandedAutoBypass}
          onClick={() => setExpandedAutoBypass((current) => !current)}
        >
          <span>{expandedAutoBypass ? '收起' : '展开'}</span>
          已自动添加 {autoBypassDomains.length} 个域名（来自模型供应商）
        </button>
        {expandedAutoBypass ? (
          <div className="lime-network-auto-domain-list">
            {autoBypassDomains.map((domain) => (
              <span key={domain}>{domain}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="lime-network-section">
        <div className="lime-network-preview">
          <span>代理地址预览</span>
          <code>{proxyEnabled ? proxyPreview : '未启用代理'}</code>
          <small>将设置 HTTP_PROXY / HTTPS_PROXY 环境变量</small>
        </div>
      </section>

      <div className="lime-network-footnote">
        代理仅作用于 AI 模型请求（Claude CLI 子进程），不影响应用自身网络。常见端口：Clash 7890，V2Ray 10809
      </div>
    </div>
  );
}

export const networkSettingsStyles = `
.lime-network-settings {
  display: grid;
  gap: 0;
  margin-top: 24px;
}
.lime-network-info {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
}
.lime-network-info,
.lime-network-footnote {
  border-radius: 12px;
  background: #f0f2f4;
  color: #7b8791;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.55;
}
.lime-network-info p,
.lime-network-footnote {
  margin: 0;
}
.lime-network-section {
  display: grid;
  gap: 14px;
  border-bottom: 1px solid #e4eaee;
  padding: 20px 0;
}
.lime-network-section:last-of-type {
  border-bottom: 0;
}
.lime-network-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
}
.lime-network-row.compact {
  min-height: 42px;
}
.lime-network-row h2 {
  margin: 0;
  color: #26333b;
  font-size: 14px;
  font-weight: 650;
}
.lime-network-row p {
  margin: 6px 0 0;
  color: #8a96a0;
  font-size: 12px;
  line-height: 1.5;
}
.lime-network-proxy-grid {
  display: grid;
  grid-template-columns: 156px minmax(0, 1fr) 112px;
  align-items: end;
  gap: 12px;
}
.lime-network-auth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.lime-network-field,
.lime-network-bypass {
  display: grid;
  min-width: 0;
  gap: 8px;
}
.lime-network-field > span,
.lime-network-bypass > span,
.lime-network-preview > span {
  color: #7f8b94;
  font-size: 12px;
  font-weight: 650;
}
.lime-network-field input,
.lime-network-field select,
.lime-network-bypass input {
  width: 100%;
  height: 34px;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid #dfe5e9;
  border-radius: 999px;
  background: #ffffff;
  color: #34424c;
  padding: 0 13px;
  font-size: 12px;
  outline: none;
}
.lime-network-field select {
  cursor: pointer;
}
.lime-network-field input:focus,
.lime-network-field select:focus,
.lime-network-bypass input:focus {
  border-color: #aebac3;
  box-shadow: 0 0 0 3px rgba(95, 104, 117, 0.08);
}
.lime-network-field input::placeholder,
.lime-network-bypass input::placeholder {
  color: #c0c8ce;
}
.lime-network-host-port {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}
.lime-network-host-port > span {
  color: #8d98a1;
  font-size: 15px;
  font-weight: 650;
}
.lime-network-caption {
  margin: -4px 0 0;
  color: #8a96a0;
  font-size: 12px;
  line-height: 1.55;
}
.lime-network-auto-bypass {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: #6b7780;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  text-align: left;
}
.lime-network-auto-bypass span {
  color: #26333b;
  font-weight: 650;
}
.lime-network-auto-domain-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.lime-network-auto-domain-list span {
  border-radius: 999px;
  background: #eef2f4;
  color: #5e6b75;
  padding: 5px 9px;
  font-size: 11px;
}
.lime-network-preview {
  display: grid;
  gap: 8px;
}
.lime-network-preview code {
  display: block;
  min-height: 42px;
  box-sizing: border-box;
  border-radius: 12px;
  background: #f0f2f4;
  color: #26333b;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.lime-network-preview small {
  color: #8a96a0;
  font-size: 12px;
}
@media (max-width: 760px) {
  .lime-network-proxy-grid,
  .lime-network-auth-grid {
    grid-template-columns: 1fr;
  }
}
`;
