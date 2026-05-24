import { NotInstalledAgentExecutionBackend } from './notInstalledBackend';

export class ClaudeSdkExecutionBackend extends NotInstalledAgentExecutionBackend {
  constructor() {
    super('claude-sdk', 'Claude SDK backend 尚未安装；后续只能作为 host-core backend adapter 接入。');
  }
}
