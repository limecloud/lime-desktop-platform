import type { AgentExecutionRequest } from '../../../shared/types';
import { BlockedAgentExecutionBackend } from './blockedBackend';
import { ClaudeSdkExecutionBackend } from './claudeSdkBackend';
import { GenericTextExecutionBackend } from './genericTextBackend';
import { listAgentExecutionBackends } from './backendDescriptors';
import { PiSidecarExecutionBackend } from './piSidecarBackend';
import type { AgentExecutionBackend, AgentExecutionContext } from './types';

export class AgentExecutionBackendRouter {
  private readonly blockedBackend = new BlockedAgentExecutionBackend();
  private readonly genericTextBackend = new GenericTextExecutionBackend();
  private readonly claudeSdkBackend = new ClaudeSdkExecutionBackend();
  private readonly piSidecarBackend = new PiSidecarExecutionBackend();

  resolve(_request: AgentExecutionRequest, _context: AgentExecutionContext): AgentExecutionBackend {
    const requestedBackend = process.env.LIME_AGENT_EXECUTION_BACKEND;
    if (requestedBackend === 'generic-text') {
      return this.genericTextBackend;
    }
    if (requestedBackend === 'claude-sdk') {
      return this.claudeSdkBackend;
    }
    if (requestedBackend === 'pi-sidecar') {
      return this.piSidecarBackend;
    }
    return this.blockedBackend;
  }

  listBackends() {
    return listAgentExecutionBackends();
  }
}
