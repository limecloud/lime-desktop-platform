import { NotInstalledAgentExecutionBackend } from './notInstalledBackend';

export class PiSidecarExecutionBackend extends NotInstalledAgentExecutionBackend {
  constructor() {
    super('pi-sidecar', 'Pi sidecar backend 尚未安装；后续只能通过 sidecar 协议隔离 SDK 依赖。');
  }
}
