import type { CapabilityInvokeInput } from '../../shared/types';
import { redactSensitiveValue } from './sensitiveRedaction.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isAgentRuntimeCapability(capability: CapabilityInvokeInput['capability']): boolean {
  return capability === 'lime.agent' || capability === 'lime.agentExecution';
}

function createAgentRuntimeInputSummary(input: unknown): Record<string, unknown> {
  const payload = asRecord(input);
  const prompt = optionalString(payload.prompt);
  const runtimeOptions = asRecord(payload.runtimeOptions);
  const modelPolicy = asRecord(payload.modelPolicy);
  const toolPolicy = asRecord(payload.toolPolicy);
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const allowedToolIds = Array.isArray(toolPolicy.allowedToolIds) ? toolPolicy.allowedToolIds : [];

  return {
    hasPrompt: Boolean(prompt?.trim()),
    promptChars: prompt ? prompt.length : 0,
    attachmentCount: attachments.length,
    runtimeOptions: {
      capabilityId: optionalString(runtimeOptions.capabilityId),
      workflowId: optionalString(runtimeOptions.workflowId),
      modelId: optionalString(runtimeOptions.modelId),
      permissionMode: optionalString(runtimeOptions.permissionMode),
    },
    modelPolicy: {
      preferredModelId: optionalString(modelPolicy.preferredModelId),
      capability: optionalString(modelPolicy.capability),
    },
    toolPolicy: {
      allowedToolCount: allowedToolIds.length,
      permissionMode: optionalString(toolPolicy.permissionMode),
    },
  };
}

export function createSafeCapabilityEventPayload(input: CapabilityInvokeInput): Record<string, unknown> {
  if (input.capability === 'lime.storage') {
    const payload = asRecord(input.input);
    return {
      operation: input.operation,
      input: {
        namespace: payload.namespace,
        documentId: payload.documentId,
        scope: payload.scope ?? 'workspace',
        valueRedacted: input.operation === 'write',
      },
    };
  }

  if (isAgentRuntimeCapability(input.capability)) {
    return {
      operation: input.operation,
      inputSummary: createAgentRuntimeInputSummary(input.input),
    };
  }

  return {
    operation: input.operation,
    input: redactSensitiveValue(input.input),
  };
}
