import type { AgentExecutionResult } from '../../../shared/types';
import { AgentExecutionBackendRouter } from './backendRouter';
import { normalizeExecutionRequest } from './request';
import { AgentToolRegistry } from './toolRegistry';
import type { AgentExecutionContext, AgentExecutionStartInput } from './types';

export class AgentExecutionService {
  private readonly backendRouter = new AgentExecutionBackendRouter();
  private readonly toolRegistry = new AgentToolRegistry();

  start(input: AgentExecutionStartInput, context: Omit<AgentExecutionContext, 'toolRegistry'>): AgentExecutionResult {
    const request = normalizeExecutionRequest(input);
    const fullContext: AgentExecutionContext = {
      ...context,
      toolRegistry: this.toolRegistry,
    };
    const backend = this.backendRouter.resolve(request, fullContext);
    return backend.start(request, fullContext);
  }

  describeRuntime() {
    return {
      backends: this.backendRouter.listBackends(),
      tools: this.toolRegistry.listForRequest({
        appId: 'lime.platform.runtime',
        entryKey: 'diagnostics',
        prompt: 'runtime diagnostics',
      }),
    };
  }
}
