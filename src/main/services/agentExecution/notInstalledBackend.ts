import { randomUUID } from 'node:crypto';
import type {
  AgentExecutionBackendKind,
  AgentExecutionEvent,
  AgentExecutionRequest,
  AgentExecutionResult,
  ReadinessResult,
} from '../../../shared/types';
import type { AgentExecutionBackend, AgentExecutionContext } from './types';

function createBlockedEvent(
  sessionId: string,
  backend: AgentExecutionBackendKind,
  message: string,
  readiness: ReadinessResult,
): AgentExecutionEvent {
  return {
    sessionId,
    sequence: 1,
    type: 'blocked',
    payload: {
      message,
      backend,
      readiness,
    },
  };
}

export class NotInstalledAgentExecutionBackend implements AgentExecutionBackend {
  constructor(
    readonly kind: Exclude<AgentExecutionBackendKind, 'blocked'>,
    private readonly installMessage: string,
  ) {}

  start(request: AgentExecutionRequest, _context: AgentExecutionContext): AgentExecutionResult {
    const sessionId = `agent-${randomUUID()}`;
    const readiness: ReadinessResult = {
      state: 'blocked',
      reasons: [
        {
          code: `${this.kind}-not-installed`,
          message: this.installMessage,
          fixable: false,
        },
      ],
      setupActions: [],
    };

    return {
      ok: false,
      state: 'blocked',
      sessionId,
      backend: this.kind,
      message: this.installMessage,
      readiness,
      request,
      events: [createBlockedEvent(sessionId, this.kind, this.installMessage, readiness)],
    };
  }
}
