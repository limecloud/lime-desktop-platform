import type { AgentExecutionBackendKind } from '../../../shared/types';

export type AgentExecutionBackendStatus = 'available' | 'not-installed';

export interface AgentExecutionBackendDescriptor {
  kind: AgentExecutionBackendKind;
  status: AgentExecutionBackendStatus;
  reason?: string;
}

export function listAgentExecutionBackends(): AgentExecutionBackendDescriptor[] {
  return [
    { kind: 'blocked', status: 'available' },
    {
      kind: 'generic-text',
      status: 'not-installed',
      reason: 'Generic text backend 尚未接入 AgentExecutionService。',
    },
    {
      kind: 'claude-sdk',
      status: 'not-installed',
      reason: 'Claude SDK backend 待接入；provider SDK 不进入公开 contracts。',
    },
    {
      kind: 'pi-sidecar',
      status: 'not-installed',
      reason: 'Pi sidecar backend 待接入；后续通过 sidecar 协议隔离 SDK 依赖。',
    },
  ];
}
