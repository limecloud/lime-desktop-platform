import type { AgentExecutionRequest, AgentExecutionResult } from '../../../shared/types';

export type AgentSidecarProtocol = 'lime.agentExecution.sidecar';

export interface AgentSidecarEnvelope<T = unknown> {
  protocol: AgentSidecarProtocol;
  version: 1;
  id: string;
  type: 'init' | 'prompt' | 'abort' | 'register_tools' | 'tool_result' | 'event' | 'shutdown';
  payload: T;
}

export interface AgentSidecarInitPayload {
  backend: 'pi-sidecar' | 'claude-sdk';
  appId: string;
  entryKey: string;
  modelId?: string;
}

export interface AgentSidecarPromptPayload {
  request: AgentExecutionRequest;
}

export interface AgentSidecarEventPayload {
  result: AgentExecutionResult;
}
