import type {
  ModelProviderAppServerSyncRecord,
  ModelProviderConfig,
  ModelProviderCredentialState,
  ModelSettings,
} from '../../shared/types';
import type { CredentialBroker } from './credentialBroker';

export function normalizeProviderAuthType(provider: ModelProviderConfig): NonNullable<ModelProviderConfig['authType']> {
  return provider.authType ?? 'api-key';
}

export function readModelProviderCredentialState(
  provider: ModelProviderConfig,
  credentialBroker: CredentialBroker,
  appServerSyncRecord?: ModelProviderAppServerSyncRecord,
): ModelProviderCredentialState {
  const authType = normalizeProviderAuthType(provider);
  if (authType === 'none') {
    return applyAppServerSyncRecord({
      providerId: provider.id,
      authType,
      configured: true,
      storageKind: 'none',
      keychainBacked: false,
      rotationRequired: false,
      runtimeStatus: 'not-required',
      plaintextSecrets: false,
    }, appServerSyncRecord);
  }

  return applyAppServerSyncRecord(credentialBroker.readModelProviderCredentialState({
    providerId: provider.id,
    authType,
  }), appServerSyncRecord);
}

export function applyModelSettingsCredentials(settings: ModelSettings, credentialBroker: CredentialBroker): ModelSettings {
  return {
    ...settings,
    providers: settings.providers.map((provider) => {
      const authType = normalizeProviderAuthType(provider);
      if ((authType === 'api-key' || authType === 'oauth') && provider.apiKey?.trim()) {
        credentialBroker.writeModelProviderCredential({
          providerId: provider.id,
          authType,
          value: provider.apiKey,
        });
      }

      const { apiKey: _apiKey, ...persistedProvider } = provider;
      return {
        ...persistedProvider,
        authType,
        apiKeyConfigured: readModelProviderCredentialState({ ...provider, authType }, credentialBroker).configured,
      };
    }),
  };
}

export function projectModelSettingsCredentialState(
  settings: ModelSettings,
  credentialBroker: CredentialBroker,
  appServerSyncRecords: Record<string, ModelProviderAppServerSyncRecord> = {},
): ModelSettings {
  return {
    ...settings,
    providers: settings.providers.map((provider) => {
      const authType = normalizeProviderAuthType(provider);
      const { apiKey: _apiKey, ...safeProvider } = provider;
      return {
        ...safeProvider,
        authType,
        apiKeyConfigured: readModelProviderCredentialState(
          { ...provider, authType },
          credentialBroker,
          appServerSyncRecords[provider.id],
        ).configured,
      };
    }),
  };
}

function applyAppServerSyncRecord(
  state: ModelProviderCredentialState,
  syncRecord: ModelProviderAppServerSyncRecord | undefined,
): ModelProviderCredentialState {
  if (!syncRecord) {
    return state;
  }

  const appServerFields = {
    appServerProviderId: syncRecord.appServerProviderId,
    appServerProviderType: syncRecord.appServerProviderType,
    appServerSyncStatus: syncRecord.status,
    appServerSyncedAt: syncRecord.syncedAt,
    appServerCredentialSyncedAt: syncRecord.credentialSyncedAt,
    appServerSyncError: syncRecord.lastError,
  };
  const runtimeStatus =
    state.configured &&
    !state.rotationRequired &&
    state.authType === 'api-key' &&
    syncRecord.status === 'synced' &&
    Boolean(syncRecord.appServerProviderId) &&
    Boolean(syncRecord.credentialSyncedAt)
      ? 'app-server-provider-ready'
      : state.runtimeStatus;

  return {
    ...state,
    ...appServerFields,
    runtimeStatus,
  };
}
