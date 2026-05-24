import type { AgentExecutionRequest } from '../../../shared/types';

export interface AgentToolDefinition {
  id: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permission: {
    mode: 'safe' | 'ask' | 'allow-all';
    mutatesState: boolean;
  };
}

export class AgentToolRegistry {
  private readonly platformTools: AgentToolDefinition[] = [
    {
      id: 'lime.platform.openSettings',
      description: '请求宿主打开模型、OAuth、billing、OEM、更新或诊断入口。',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['auth-settings', 'model-settings', 'branding-settings', 'billing-settings', 'updates', 'diagnostics'],
          },
          reason: { type: 'string' },
        },
        required: ['target'],
      },
      permission: {
        mode: 'safe',
        mutatesState: false,
      },
    },
    {
      id: 'lime.platform.readSnapshot',
      description: '读取当前 Host Snapshot 的非敏感平台投影。',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      permission: {
        mode: 'safe',
        mutatesState: false,
      },
    },
  ];

  listForRequest(_request: AgentExecutionRequest): AgentToolDefinition[] {
    return this.platformTools;
  }
}
