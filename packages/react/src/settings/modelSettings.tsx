import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
  HostSnapshot,
  ModelProviderConfig,
  ModelSettings,
  PlatformBootstrap,
  PlatformNavigationIntent,
} from '@limecloud/desktop-platform-contracts';

export interface PlatformModelProviderProjection {
  id: string;
  displayName: string;
  description?: string;
  protocol?: ModelProviderConfig['protocol'] | string;
  capabilityKinds?: ModelProviderConfig['capabilityKinds'];
  enabled?: boolean;
  apiKeyConfigured?: boolean;
  authType?: ModelProviderConfig['authType'];
  baseUrl?: string;
  useResponsesApi?: boolean;
  models: string[];
}

export interface PlatformModelSettingsProjection {
  version?: string;
  updatedAt?: string;
  defaultAgentProviderId?: string;
  defaultTextModelId?: string;
  defaultImageModelId?: string;
  defaultVideoModelId?: string;
  providers: PlatformModelProviderProjection[];
}

export type PlatformModelSelectorCapability = 'text' | 'image' | 'video';

export interface PlatformModelSelection {
  capability: PlatformModelSelectorCapability;
  providerId?: string;
  modelId: string;
}

export interface ProviderDraftState {
  apiKey: string;
  apiKeyConfigured: boolean;
  authType: ModelProviderConfig['authType'];
  baseUrl: string;
  displayName: string;
  enabled: boolean;
  modelInput: string;
  models: string[];
  protocol: ModelProviderConfig['protocol'];
  useResponsesApi: boolean;
}

export interface BuildModelSettingsFromDraftsInput {
  current: PlatformModelSettingsProjection;
  providers: PlatformModelProviderProjection[];
  drafts: Record<string, ProviderDraftState>;
  selectedProviderId: string;
}

export function getModelSettingsProjectionFromHostSnapshot(snapshot?: HostSnapshot | null): PlatformModelSettingsProjection {
  const settings = snapshot?.modelSettings;
  if (settings) {
    return {
      version: settings.version,
      updatedAt: settings.updatedAt,
      defaultAgentProviderId: settings.defaultAgentProviderId,
      defaultTextModelId: settings.defaultTextModelId,
      defaultImageModelId: settings.defaultImageModelId,
      defaultVideoModelId: settings.defaultVideoModelId,
      providers: settings.providers.map((provider) => ({
        id: provider.id,
        displayName: provider.displayName,
        protocol: provider.protocol,
        capabilityKinds: provider.capabilityKinds,
        enabled: provider.enabled,
        apiKeyConfigured: provider.apiKeyConfigured,
        authType: provider.authType,
        baseUrl: provider.baseUrl,
        useResponsesApi: provider.useResponsesApi,
        models: provider.models,
      })),
    };
  }

  return {
    version: snapshot?.modelSettingsVersion,
    defaultTextModelId: undefined,
    providers: [],
  };
}

export function getModelSettingsProjectionFromBootstrap(bootstrap?: PlatformBootstrap | null): PlatformModelSettingsProjection {
  if (!bootstrap) {
    return { providers: [] };
  }

  return {
    version: bootstrap.modelSettings.version,
    updatedAt: bootstrap.modelSettings.updatedAt,
    defaultAgentProviderId: bootstrap.modelSettings.defaultAgentProviderId,
    defaultTextModelId: bootstrap.modelSettings.defaultTextModelId,
    defaultImageModelId: bootstrap.modelSettings.defaultImageModelId,
    defaultVideoModelId: bootstrap.modelSettings.defaultVideoModelId,
    providers: bootstrap.modelSettings.providers.map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      protocol: provider.protocol,
      capabilityKinds: provider.capabilityKinds,
      enabled: provider.enabled,
      apiKeyConfigured: provider.apiKeyConfigured,
      authType: provider.authType,
      baseUrl: provider.baseUrl,
      useResponsesApi: provider.useResponsesApi,
      models: provider.models,
    })),
  };
}

export function PlatformModelSelector(props: {
  modelSettings?: PlatformModelSettingsProjection | null;
  capability: PlatformModelSelectorCapability;
  value?: string;
  providerId?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  onChange: (selection: PlatformModelSelection) => void;
  onOpenModelSettings?: () => void;
}): ReactElement {
  const providers = getSelectableModelProviders(props.modelSettings, props.capability);
  const selectedProvider =
    providers.find((provider) => props.providerId && provider.id === props.providerId) ??
    findProviderForModel(providers, props.value) ??
    providers[0];
  const models = uniquePlatformModels(selectedProvider?.models ?? []);
  const selectedModel = props.value && models.includes(props.value)
    ? props.value
    : getDefaultModelForCapability(props.modelSettings, props.capability, selectedProvider) ?? models[0] ?? '';
  const ready = Boolean(selectedProvider && selectedModel);
  const rootClassName = ['lime-model-selector', props.className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} data-capability={props.capability} data-ready={ready ? 'ready' : 'blocked'}>
      <div className="lime-model-selector-head">
        <div>
          <strong>{props.label}</strong>
          {props.description ? <span>{props.description}</span> : null}
        </div>
        {props.onOpenModelSettings ? (
          <button type="button" onClick={props.onOpenModelSettings}>
            管理
          </button>
        ) : null}
      </div>
      {providers.length > 0 ? (
        <div className="lime-model-selector-body">
          <label>
            <span>Provider</span>
            <select
              value={selectedProvider?.id ?? ''}
              disabled={props.disabled || providers.length <= 1}
              onChange={(event) => {
                const nextProvider = providers.find((provider) => provider.id === event.target.value);
                const nextModel = getDefaultModelForCapability(props.modelSettings, props.capability, nextProvider) ?? nextProvider?.models[0] ?? '';
                props.onChange({
                  capability: props.capability,
                  providerId: nextProvider?.id,
                  modelId: nextModel,
                });
              }}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>模型</span>
            <select
              value={selectedModel}
              disabled={props.disabled || !models.length}
              onChange={(event) =>
                props.onChange({
                  capability: props.capability,
                  providerId: selectedProvider?.id,
                  modelId: event.target.value,
                })
              }
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="lime-model-selector-empty">
          {props.emptyLabel ?? '未配置可用模型，请先在平台模型设置中添加 Provider。'}
        </div>
      )}
    </div>
  );
}

export function PlatformRuntimeModelMenu(props: {
  modelSettings?: PlatformModelSettingsProjection | null;
  capability: PlatformModelSelectorCapability;
  value?: string;
  providerId?: string;
  label?: string;
  contextLabel?: string;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  open?: boolean;
  placement?: 'top' | 'bottom';
  leadingIcon?: ReactNode;
  formatModelLabel?: (modelId: string) => ReactNode;
  modelFilter?: (modelId: string) => boolean;
  onChange: (selection: PlatformModelSelection) => void;
  onOpenChange?: (open: boolean) => void;
  onOpenModelSettings?: () => void;
}): ReactElement {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = (nextOpen: boolean): void => {
    setInternalOpen(nextOpen);
    props.onOpenChange?.(nextOpen);
  };
  const providers = getSelectableModelProviders(props.modelSettings, props.capability, props.modelFilter);
  const selectedProvider =
    providers.find((provider) => props.providerId && provider.id === props.providerId) ??
    findProviderForModel(providers, props.value) ??
    providers[0];
  const models = uniquePlatformModels(selectedProvider?.models ?? []).filter((model) => props.modelFilter?.(model) ?? true);
  const selectedModel = props.value && models.includes(props.value)
    ? props.value
    : getDefaultModelForCapability(props.modelSettings, props.capability, selectedProvider, props.modelFilter) ?? models[0] ?? '';
  const ready = Boolean(selectedProvider && selectedModel);
  const rootClassName = ['lime-runtime-model-menu', props.className].filter(Boolean).join(' ');
  const selectModel = (modelId: string): void => {
    props.onChange({
      capability: props.capability,
      providerId: selectedProvider?.id,
      modelId,
    });
    setOpen(false);
  };

  return (
    <div
      className={rootClassName}
      data-capability={props.capability}
      data-placement={props.placement ?? 'top'}
      data-ready={ready ? 'ready' : 'blocked'}
    >
      <style>{runtimeModelMenuStyles}</style>
      <button
        className="lime-runtime-model-trigger"
        type="button"
        disabled={props.disabled}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="lime-runtime-model-trigger-icon" aria-hidden="true">{props.leadingIcon ?? '✧'}</span>
        <strong>{selectedModel || props.emptyLabel || '未配置模型'}</strong>
        {props.label ? <span>{props.label}</span> : null}
        <span className="lime-runtime-model-trigger-chevron" aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="lime-runtime-model-popover" role="menu">
          <header className="lime-runtime-model-header">
            <strong>{props.label ?? '模型'}</strong>
            <span>{props.contextLabel ?? '当前工作区'}</span>
          </header>
          <div className="lime-runtime-model-list" role="group" aria-label={props.label ?? '模型'}>
            {models.length ? models.map((model) => (
              <button
                key={model}
                type="button"
                className={model === selectedModel ? 'active' : ''}
                onClick={() => selectModel(model)}
              >
                {props.formatModelLabel?.(model) ?? model}
              </button>
            )) : <p>{props.emptyLabel ?? '未配置可用模型，请先到模型设置中配置。'}</p>}
          </div>
          {!models.length && props.onOpenModelSettings ? (
            <footer className="lime-runtime-model-footer">
              <button type="button" onClick={() => {
                props.onOpenModelSettings?.();
                setOpen(false);
              }}>
                打开模型设置
              </button>
            </footer>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PlatformModelSettingsPage(props: {
  modelSettings: PlatformModelSettingsProjection;
  onSaveModelSettings?: (settings: ModelSettings) => Promise<ModelSettings> | ModelSettings;
  onOpenPlatformIntent: (intent: PlatformNavigationIntent) => Promise<unknown> | unknown;
}): ReactElement {
  const baseProviders = useMemo(
    () => normalizeModelProviders(props.modelSettings.providers),
    [props.modelSettings.providers],
  );
  const defaultProviderId = props.modelSettings.defaultAgentProviderId ?? props.modelSettings.providers[0]?.id;
  const initialProvider = baseProviders.find((provider) => provider.id === defaultProviderId) ?? baseProviders[0];
  const [selectedProviderId, setSelectedProviderId] = useState<string>(initialProvider?.id ?? '');
  const [mode, setMode] = useState<'details' | 'catalog'>(initialProvider ? 'details' : 'catalog');
  const [catalogProviders, setCatalogProviders] = useState<PlatformModelProviderProjection[]>([]);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraftState>>(() =>
    Object.fromEntries(baseProviders.map((provider) => [provider.id, createProviderDraft(provider)])),
  );
  const [testState, setTestState] = useState<'idle' | 'ok'>('idle');
  const [guideProviderId, setGuideProviderId] = useState<string>();
  const [saveStatus, setSaveStatus] = useState('provider 设置由平台统一保存，业务 App 只能读取投影或请求打开本页。');
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

  useEffect(() => {
    if (!selectedProviderId && normalizedProviders[0]) {
      setSelectedProviderId(normalizedProviders[0].id);
      setMode('details');
    }
  }, [normalizedProviders, selectedProviderId]);

  const selectProvider = (providerId: string): void => {
    setSelectedProviderId(providerId);
    setMode('details');
    setTestState('idle');
    setGuideProviderId(undefined);
  };

  const openCatalog = (): void => {
    const provider = createBlankProviderProjection(normalizedProviders);
    setCatalogProviders((current) => [...current, provider]);
    setProviderDrafts((current) => ({
      ...current,
      [provider.id]: createProviderDraft(provider),
    }));
    setSelectedProviderId(provider.id);
    setMode('details');
    setTestState('idle');
    setGuideProviderId(undefined);
  };

  const updateProviderDraft = (providerId: string, patch: Partial<ProviderDraftState>): void => {
    const fallbackProvider = normalizedProviders.find((provider) => provider.id === providerId) ?? normalizedProviders[0];
    if (!fallbackProvider) {
      return;
    }
    setProviderDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] ?? createProviderDraft(fallbackProvider)),
        ...patch,
      },
    }));
    setTestState('idle');
  };

  const addPriorityModel = (providerId: string): void => {
    const provider = normalizedProviders.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }
    const draft = providerDrafts[providerId] ?? createProviderDraft(provider);
    const model = draft.modelInput.trim();
    if (!model || draft.models.includes(model)) {
      return;
    }
    updateProviderDraft(providerId, { models: [...draft.models, model], modelInput: '' });
  };

  const removePriorityModel = (providerId: string, model: string): void => {
    const provider = normalizedProviders.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }
    const draft = providerDrafts[providerId] ?? createProviderDraft(provider);
    if (draft.models.length <= 1) {
      return;
    }
    updateProviderDraft(providerId, { models: draft.models.filter((item) => item !== model) });
  };

  const movePriorityModel = (providerId: string, model: string, direction: -1 | 1): void => {
    const provider = normalizedProviders.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }
    const draft = providerDrafts[providerId] ?? createProviderDraft(provider);
    const index = draft.models.indexOf(model);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draft.models.length) {
      return;
    }
    const nextModels = [...draft.models];
    [nextModels[index], nextModels[nextIndex]] = [nextModels[nextIndex], nextModels[index]];
    updateProviderDraft(providerId, { models: nextModels });
  };

  const selectedDraft = selectedProvider
    ? providerDrafts[selectedProvider.id] ?? createProviderDraft(selectedProvider)
    : undefined;
  const saveSelectedProvider = async (): Promise<void> => {
    if (!selectedProvider || !selectedDraft) {
      setSaveStatus('请先添加一个 Provider。');
      return;
    }
    const providerName = selectedDraft.displayName.trim();
    const models = selectedDraft.models.map((model) => model.trim()).filter(Boolean);
    if (!providerName) {
      setSaveStatus('请填写 Provider 名称。');
      return;
    }
    if (models.length === 0) {
      setSaveStatus('请至少添加一个模型 ID。');
      return;
    }
    const nextSettings = buildModelSettingsFromDrafts({
      current: props.modelSettings,
      providers: normalizedProviders,
      drafts: providerDrafts,
      selectedProviderId: selectedProvider.id,
    });
    if (!props.onSaveModelSettings) {
      setSaveStatus('当前宿主未接入 settings.saveModel，已停留在 UI 草稿。');
      return;
    }
    await props.onSaveModelSettings(nextSettings);
    setSaveStatus(`${selectedDraft.displayName || selectedProvider.displayName} 已保存为默认 Agent provider。`);
  };

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
          {normalizedProviders.length > 0 ? normalizedProviders.map((provider, index) => (
            <ProviderListItem
              provider={provider}
              active={mode === 'details' && provider.id === selectedProvider?.id}
              defaultLabel={index === 0}
              key={provider.id}
              onSelect={() => selectProvider(provider.id)}
            />
          )) : (
            <div className="lime-model-empty-state">
              <strong>尚未配置 Provider</strong>
              <span>添加自定义 Provider，填写协议、凭证和模型 ID 后保存。</span>
            </div>
          )}
        </div>
        <button className={mode === 'catalog' ? 'lime-model-add-button active' : 'lime-model-add-button'} type="button" onClick={openCatalog}>
          <span aria-hidden="true">+</span>
          添加模型
        </button>
      </div>

      <div className="lime-model-main">
        {mode === 'catalog' || !selectedProvider || !selectedDraft ? (
          <ProviderEmptyEditor onCreateProvider={openCatalog} />
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
            onSaveProvider={() => void saveSelectedProvider()}
            onTestConnection={() => setTestState('ok')}
            onUpdateDraft={(patch) => updateProviderDraft(selectedProvider.id, patch)}
          />
        )}
        <div className="lime-model-status">{saveStatus}</div>
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

function getSelectableModelProviders(
  modelSettings: PlatformModelSettingsProjection | null | undefined,
  capability: PlatformModelSelectorCapability,
  modelFilter?: (modelId: string) => boolean,
): PlatformModelProviderProjection[] {
  return (modelSettings?.providers ?? [])
    .filter((provider) => provider.enabled !== false)
    .filter((provider) => !provider.capabilityKinds || provider.capabilityKinds.includes(capability))
    .map((provider) => ({
      ...provider,
      models: uniquePlatformModels(provider.models).filter((model) => modelFilter?.(model) ?? true),
    }))
    .filter((provider) => provider.models.length > 0);
}

function uniquePlatformModels(models: string[] | undefined): string[] {
  return Array.from(new Set((models ?? []).map((model) => model.trim()).filter(Boolean)));
}

function findProviderForModel(
  providers: PlatformModelProviderProjection[],
  modelId: string | undefined,
): PlatformModelProviderProjection | undefined {
  if (!modelId) return undefined;
  return providers.find((provider) => provider.models.includes(modelId));
}

function getDefaultModelForCapability(
  modelSettings: PlatformModelSettingsProjection | null | undefined,
  capability: PlatformModelSelectorCapability,
  provider: PlatformModelProviderProjection | undefined,
  modelFilter?: (modelId: string) => boolean,
): string | undefined {
  const candidate =
    capability === 'image'
      ? modelSettings?.defaultImageModelId
      : capability === 'video'
        ? modelSettings?.defaultVideoModelId
        : modelSettings?.defaultTextModelId;
  if (candidate && provider?.models.includes(candidate) && (modelFilter?.(candidate) ?? true)) return candidate;
  return provider?.models[0];
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
  onSaveProvider: () => void;
  onTestConnection: () => void;
  onUpdateDraft: (patch: Partial<ProviderDraftState>) => void;
}): ReactElement {
  const ready = props.draft.authType === 'none' || props.draft.apiKeyConfigured || props.draft.apiKey.trim().length > 0 || props.testState === 'ok';
  return (
    <section className="lime-model-config-card">
      <div className="lime-model-card-title">
        <div className="lime-model-card-title-main">
          <ProviderIcon providerId={props.provider.id} />
          <h2>{props.draft.displayName || props.provider.displayName}</h2>
        </div>
        <button type="button" onClick={props.onOpenProviderGuide}>获取凭证 ↗</button>
      </div>
      {props.guideRequested ? (
        <div className="lime-model-guide-notice">
          已请求打开 {props.provider.displayName} 凭证获取入口；真实外部链接由平台 provider metadata 接入。
        </div>
      ) : null}
      <div className={ready ? 'lime-model-ready-banner' : 'lime-model-ready-banner pending'}>
        {ready ? '已具备调用条件' : '需要补齐凭证或启用无凭证本地运行时'}
      </div>
      <div className="lime-model-field-grid">
        <label className="lime-model-field">
          <span>Provider 名称</span>
          <input
            value={props.draft.displayName}
            onChange={(event) => props.onUpdateDraft({ displayName: event.target.value })}
            placeholder="供应商名称"
          />
        </label>
        <label className="lime-model-field">
          <span>Base URL</span>
          <input
            value={props.draft.baseUrl}
            onChange={(event) => props.onUpdateDraft({ baseUrl: event.target.value })}
            placeholder="https://api.example.com/v1"
          />
        </label>
      </div>
      <div className="lime-model-field-grid">
        <label className="lime-model-field">
          <span>API 格式</span>
          <select
            value={props.draft.protocol}
            onChange={(event) => props.onUpdateDraft({ protocol: event.target.value as ModelProviderConfig['protocol'] })}
          >
            <option value="openai-compatible">OpenAI Compatible</option>
            <option value="anthropic-compatible">Anthropic Compatible</option>
            <option value="gemini-native">Gemini Native</option>
            <option value="local">Local</option>
          </select>
        </label>
        <label className="lime-model-field">
          <span>认证方式</span>
          <select
            value={props.draft.authType}
            onChange={(event) => props.onUpdateDraft({ authType: event.target.value as ModelProviderConfig['authType'] })}
          >
            <option value="api-key">API Key</option>
            <option value="oauth">OAuth</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
      <PlatformEditableToggleRow
        checked={props.draft.useResponsesApi}
        description="OpenAI 兼容 provider 可优先使用 Responses API；其他格式由 App Server RuntimeCore 选择合适方法。"
        title="使用 Responses API"
        onToggle={() => props.onUpdateDraft({ useResponsesApi: !props.draft.useResponsesApi })}
      />
      <PlatformEditableToggleRow
        checked={props.draft.enabled}
        description="停用后不会出现在 Agent Runtime 可选 provider 中。"
        title="启用 Provider"
        onToggle={() => props.onUpdateDraft({ enabled: !props.draft.enabled })}
      />
      <label className="lime-model-field">
        <span>API 密钥</span>
        <input
          value={props.draft.apiKey}
          onChange={(event) => props.onUpdateDraft({ apiKey: event.target.value, apiKeyConfigured: event.target.value.trim().length > 0 })}
          placeholder={props.draft.apiKeyConfigured ? '已配置，输入新密钥后更新状态' : '输入 API 密钥'}
          type="password"
        />
      </label>
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
      <div className="lime-model-card-actions">
        <button className="lime-model-test-button" type="button" onClick={props.onTestConnection}>
          ↯ {props.testState === 'ok' ? '连接正常' : `测试连接${ready ? '' : '并激活'}`}
        </button>
        <button className="lime-model-save-button" type="button" onClick={props.onSaveProvider}>
          保存并设为默认
        </button>
      </div>
      <small className="lime-model-footnote">
        {props.modelSettings.version ? `配置版本 ${props.modelSettings.version}` : '模型设置由平台维护；API Key 明文不会写入普通设置 JSON。'}
      </small>
    </section>
  );
}

function ProviderEmptyEditor(props: { onCreateProvider: () => void }): ReactElement {
  return (
    <section className="lime-model-catalog">
      <div className="lime-model-empty-state">
        <strong>添加自定义 Provider</strong>
        <span>平台不预置品牌 Provider。请显式创建 Provider，并填写真实 Base URL、API 格式、认证方式和模型 ID。</span>
      </div>
      <div className="lime-model-catalog-grid">
        <button className="lime-model-catalog-card" type="button" onClick={props.onCreateProvider}>
          <strong>
            <ProviderIcon providerId="custom" />
            自定义 Provider
          </strong>
          <span>从空白配置开始，不写入固定服务商或默认模型。</span>
          <small>openai-compatible / anthropic-compatible / gemini-native / local</small>
        </button>
      </div>
    </section>
  );
}

function PlatformEditableToggleRow(props: {
  checked: boolean;
  description: string;
  title: string;
  onToggle: () => void;
}): ReactElement {
  return (
    <div className="lime-model-toggle-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.description}</span>
      </div>
      <button
        className={props.checked ? 'lime-toggle checked' : 'lime-toggle'}
        type="button"
        aria-pressed={props.checked}
        onClick={props.onToggle}
      >
        <span />
      </button>
    </div>
  );
}

const runtimeModelMenuStyles = `
.lime-runtime-model-menu {
  position: relative;
  display: inline-flex;
  min-width: 0;
  color: #31423a;
  font-family: inherit;
  letter-spacing: 0;
}
.lime-runtime-model-trigger {
  display: inline-grid;
  grid-template-columns: auto minmax(0, auto) auto auto;
  align-items: center;
  gap: 5px;
  min-width: 0;
  min-height: 34px;
  border: 1px solid #d9e2dd;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #31423a;
  cursor: pointer;
  padding: 0 12px;
  box-shadow: 0 4px 14px rgba(32, 43, 51, 0.05);
  font: inherit;
}
.lime-runtime-model-trigger:disabled {
  cursor: default;
  opacity: 0.58;
}
.lime-runtime-model-trigger strong,
.lime-runtime-model-trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime-runtime-model-trigger strong {
  max-width: min(260px, 36vw);
  font-size: 12px;
  font-weight: 760;
}
.lime-runtime-model-trigger span {
  color: #8a9a92;
  font-size: 10px;
}
.lime-runtime-model-trigger-icon,
.lime-runtime-model-trigger-chevron {
  color: #4a5b52;
}
.lime-runtime-model-popover {
  position: absolute;
  right: 0;
  z-index: 100;
  display: grid;
  gap: 10px;
  width: min(520px, calc(100vw - 32px));
  border: 1px solid #dce5df;
  border-radius: 14px;
  background: #ffffff;
  color: #31423a;
  padding: 12px;
  box-shadow: 0 18px 48px rgba(32, 43, 51, 0.14);
}
.lime-runtime-model-menu[data-placement="top"] .lime-runtime-model-popover {
  bottom: calc(100% + 10px);
}
.lime-runtime-model-menu[data-placement="bottom"] .lime-runtime-model-popover {
  top: calc(100% + 10px);
}
.lime-runtime-model-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.lime-runtime-model-header strong {
  color: #25352e;
  font-size: 13px;
  font-weight: 760;
}
.lime-runtime-model-header span {
  overflow: hidden;
  color: #8a9a92;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.lime-runtime-model-list {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.lime-runtime-model-list button,
.lime-runtime-model-list p,
.lime-runtime-model-footer button {
  min-width: 0;
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: #edf3ef;
  color: #405148;
  padding: 0 12px;
  text-align: left;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
}
.lime-runtime-model-list button,
.lime-runtime-model-footer button {
  cursor: pointer;
}
.lime-runtime-model-list button:hover,
.lime-runtime-model-footer button:hover {
  background: #e4ece7;
}
.lime-runtime-model-list button.active {
  outline: 1px solid #9fb1a8;
  background: #f8faf8;
  color: #23352d;
}
.lime-runtime-model-list button:disabled,
.lime-runtime-model-footer button:disabled {
  cursor: default;
  opacity: 0.55;
}
.lime-runtime-model-list p {
  display: grid;
  align-items: center;
  margin: 0;
  color: #7a8d83;
  line-height: 1.45;
}
.lime-runtime-model-footer {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}
@media (max-width: 720px) {
  .lime-runtime-model-popover {
    right: auto;
    left: 0;
    width: min(420px, calc(100vw - 32px));
  }
}
`;

export function createDefaultModelProviderProjection(_version?: string): PlatformModelProviderProjection[] {
  return [];
}

export function normalizeModelProviders(
  providers: PlatformModelProviderProjection[],
): PlatformModelProviderProjection[] {
  return providers.map((provider) => ({
    ...provider,
    authType: provider.authType ?? (provider.protocol === 'local' ? 'none' : 'api-key'),
    enabled: provider.enabled ?? false,
    apiKeyConfigured: provider.apiKeyConfigured ?? false,
    models: uniquePlatformModels(provider.models),
  }));
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
    apiKey: '',
    apiKeyConfigured: provider.apiKeyConfigured ?? false,
    authType: provider.authType ?? (normalizeModelProtocol(provider.protocol) === 'local' ? 'none' : 'api-key'),
    baseUrl: provider.baseUrl ?? '',
    displayName: provider.displayName,
    enabled: provider.enabled ?? false,
    modelInput: '',
    models: uniquePlatformModels(provider.models),
    protocol: normalizeModelProtocol(provider.protocol),
    useResponsesApi: provider.useResponsesApi ?? normalizeModelProtocol(provider.protocol) === 'openai-compatible',
  };
}

function createBlankProviderProjection(providers: PlatformModelProviderProjection[]): PlatformModelProviderProjection {
  const existingIds = new Set(providers.map((provider) => provider.id));
  let index = providers.length + 1;
  let id = `custom-provider-${index}`;
  while (existingIds.has(id)) {
    index += 1;
    id = `custom-provider-${index}`;
  }
  return {
    id,
    displayName: `自定义 Provider ${index}`,
    description: '用户显式创建的模型 Provider。',
    protocol: 'openai-compatible',
    enabled: true,
    apiKeyConfigured: false,
    authType: 'api-key',
    useResponsesApi: true,
    models: [],
  };
}

export function buildModelSettingsFromDrafts(input: BuildModelSettingsFromDraftsInput): ModelSettings {
  const providers = input.providers.map((provider) => {
    const draft = input.drafts[provider.id] ?? createProviderDraft(provider);
    const models = draft.models.map((model) => model.trim()).filter(Boolean);
    const apiKey = draft.authType === 'none' ? '' : draft.apiKey.trim();
    const apiKeyConfigured = draft.authType === 'none' ? true : draft.apiKeyConfigured || draft.apiKey.trim().length > 0;
    return {
      id: provider.id,
      displayName: draft.displayName.trim() || provider.displayName,
      protocol: draft.protocol,
      capabilityKinds: provider.capabilityKinds ?? (['text'] as ModelProviderConfig['capabilityKinds']),
      enabled: draft.enabled,
      apiKeyConfigured,
      apiKey: apiKey || undefined,
      authType: draft.authType,
      baseUrl: draft.baseUrl.trim() || undefined,
      useResponsesApi: draft.protocol === 'openai-compatible' ? draft.useResponsesApi : undefined,
      models,
    };
  });
  const selectedProvider = providers.find((provider) => provider.id === input.selectedProviderId) ?? providers[0];
  return {
    version: input.current.version ?? '0',
    updatedAt: input.current.updatedAt ?? new Date().toISOString(),
    defaultAgentProviderId: selectedProvider?.id,
    defaultTextModelId: selectedProvider?.models[0] ?? input.current.defaultTextModelId,
    defaultImageModelId: input.current.defaultImageModelId,
    defaultVideoModelId: input.current.defaultVideoModelId,
    providers,
  };
}

function normalizeModelProtocol(protocol?: ModelProviderConfig['protocol'] | string): ModelProviderConfig['protocol'] {
  if (protocol === 'gemini') {
    return 'gemini-native';
  }
  if (protocol === 'anthropic-compatible' || protocol === 'gemini-native' || protocol === 'local') {
    return protocol;
  }
  return 'openai-compatible';
}

function ProviderIcon(_props: { providerId: string }): ReactElement {
  return (
    <span aria-hidden="true" className="lime-provider-icon">
      <svg fill="currentColor" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 4v2h10V8H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z" />
      </svg>
    </span>
  );
}
