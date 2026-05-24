import { randomUUID } from 'node:crypto';
import type {
  AgentExecutionEvent,
  AgentExecutionRequest,
  AgentExecutionResult,
  ReadinessReason,
  ReadinessResult,
} from '../../../shared/types';
import { hasUsableAgentModel } from './modelReadiness';
import type { AgentExecutionBackend, AgentExecutionContext } from './types';

function createEvent(
  sessionId: string,
  type: AgentExecutionEvent['type'],
  payload: unknown,
  sequence = 1,
): AgentExecutionEvent {
  return {
    sessionId,
    sequence,
    type,
    payload,
  };
}

export class BlockedAgentExecutionBackend implements AgentExecutionBackend {
  readonly kind = 'blocked' as const;

  start(request: AgentExecutionRequest, context: AgentExecutionContext): AgentExecutionResult {
    const sessionId = `agent-${randomUUID()}`;
    const reasons: ReadinessReason[] = [];
    const setupActions: string[] = [];
    const tools = context.toolRegistry.listForRequest(request);

    if (!hasUsableAgentModel(context.modelSettings, request.modelPolicy?.preferredModelId)) {
      reasons.push({
        code: 'agent-model-required',
        message: 'Agent Execution Runtime 需要至少一个已启用且已配置凭证的文本模型。',
        fixable: true,
      });
      setupActions.push('open-model-settings');
    }

    reasons.push({
      code: 'agent-backend-not-installed',
      message: 'Claude SDK backend、Pi sidecar backend 和 Tool Registry 尚未安装到当前平台运行时。',
      fixable: false,
    });

    const state = reasons.some((reason) => !reason.fixable) ? 'blocked' : 'needs-setup';
    const readiness: ReadinessResult = {
      state,
      reasons,
      setupActions,
    };
    const eventType = state === 'blocked' ? 'blocked' : 'needs-setup';
    const message =
      state === 'blocked'
        ? 'Agent Execution Runtime 已接入平台契约，但真实 backend 尚未安装。'
        : 'Agent Execution Runtime 需要先补齐模型设置。';

    return {
      ok: false,
      state,
      sessionId,
      backend: this.kind,
      message,
      readiness,
      request,
      events: [
        createEvent(sessionId, eventType, {
          message,
          readiness,
          backend: this.kind,
          toolCount: tools.length,
        }),
      ],
    };
  }
}
