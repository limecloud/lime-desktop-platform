import { NotInstalledAgentExecutionBackend } from './notInstalledBackend';

export class GenericTextExecutionBackend extends NotInstalledAgentExecutionBackend {
  constructor() {
    super('generic-text', 'Generic text backend 尚未接入 AgentExecutionService。');
  }
}
