import type { AgentExecutionRequest } from '../../../shared/types';
import type { AgentExecutionStartInput } from './types';

export function normalizeExecutionRequest(input: AgentExecutionStartInput): AgentExecutionRequest {
  const candidate = input.input && typeof input.input === 'object' ? (input.input as Partial<AgentExecutionRequest>) : {};
  return {
    appId: input.appId,
    entryKey: input.entryKey,
    agentAppId: typeof candidate.agentAppId === 'string' ? candidate.agentAppId : undefined,
    taskId: typeof candidate.taskId === 'string' ? candidate.taskId : undefined,
    prompt: typeof candidate.prompt === 'string' && candidate.prompt.trim() ? candidate.prompt : 'Agent execution readiness probe.',
    attachments: Array.isArray(candidate.attachments) ? candidate.attachments : undefined,
    modelPolicy:
      candidate.modelPolicy && typeof candidate.modelPolicy === 'object'
        ? {
            preferredModelId:
              typeof candidate.modelPolicy.preferredModelId === 'string' ? candidate.modelPolicy.preferredModelId : undefined,
            capability:
              candidate.modelPolicy.capability === 'vision' || candidate.modelPolicy.capability === 'text'
                ? candidate.modelPolicy.capability
                : 'agent',
          }
        : { capability: 'agent' },
    toolPolicy:
      candidate.toolPolicy && typeof candidate.toolPolicy === 'object'
        ? {
            allowedToolIds: Array.isArray(candidate.toolPolicy.allowedToolIds) ? candidate.toolPolicy.allowedToolIds : undefined,
            permissionMode:
              candidate.toolPolicy.permissionMode === 'allow-all' || candidate.toolPolicy.permissionMode === 'safe'
                ? candidate.toolPolicy.permissionMode
                : 'ask',
          }
        : { permissionMode: 'ask' },
  };
}
