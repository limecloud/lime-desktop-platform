import type { ModelSettings } from '../../../shared/types';

export function hasUsableAgentModel(settings: ModelSettings, preferredModelId?: string): boolean {
  const targetModel = preferredModelId ?? settings.defaultTextModelId;
  if (!targetModel) {
    return false;
  }

  return settings.providers.some(
    (provider) =>
      provider.enabled &&
      provider.apiKeyConfigured &&
      provider.capabilityKinds.includes('text') &&
      provider.models.includes(targetModel),
  );
}
