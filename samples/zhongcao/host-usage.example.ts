import type {
  CapabilityInvokeInput,
  HostSnapshot,
  PlatformCapability,
} from '@limecloud/desktop-platform-contracts';

declare global {
  interface Window {
    limeDesktop?: {
      apps: {
        getRuntimeSnapshot(input: { appId: string; entryKey: string }): Promise<HostSnapshot | undefined>;
        invokeCapability(input: CapabilityInvokeInput): Promise<unknown>;
      };
    };
  }
}

export async function readZhongcaoHostSnapshot(): Promise<HostSnapshot | undefined> {
  return window.limeDesktop?.apps.getRuntimeSnapshot({
    appId: 'zhongcao',
    entryKey: 'diary',
  });
}

export async function invokeZhongcaoCapability(capability: PlatformCapability): Promise<unknown> {
  return window.limeDesktop?.apps.invokeCapability({
    appId: 'zhongcao',
    entryKey: 'diary',
    capability,
    operation: 'zhongcao-preview',
  });
}
