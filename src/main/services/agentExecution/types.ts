import type { AgentExecutionRequest, AgentExecutionResult, ModelSettings } from '../../../shared/types';
import type { AgentToolRegistry } from './toolRegistry';

export interface AgentExecutionStartInput {
  appId: string;
  entryKey: string;
  input?: unknown;
}

export interface AgentExecutionContext {
  modelSettings: ModelSettings;
  toolRegistry: AgentToolRegistry;
}

export interface AgentExecutionBackend {
  readonly kind: AgentExecutionResult['backend'];
  start(request: AgentExecutionRequest, context: AgentExecutionContext): AgentExecutionResult;
}
