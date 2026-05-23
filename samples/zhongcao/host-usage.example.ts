import type {
  CapabilityInvokeInput,
  HostSnapshot,
  PlatformChangeEvent,
  PlatformCapability,
} from '@limecloud/desktop-platform-contracts';

declare global {
  interface Window {
    limeDesktop?: {
      platform: {
        onChanged(listener: (event: PlatformChangeEvent) => void): () => void;
      };
      apps: {
        getRuntimeSnapshot(input: { appId: string; entryKey: string }): Promise<HostSnapshot | undefined>;
        uninstall(input: { appId: string; keepData?: boolean }): Promise<unknown>;
        invokeCapability(input: CapabilityInvokeInput): Promise<unknown>;
      };
    };
  }
}

export async function readZhongcaoHostSnapshot(): Promise<HostSnapshot | undefined> {
  return window.limeDesktop?.apps.getRuntimeSnapshot({
    appId: 'lime.zhongcao',
    entryKey: 'diary-workbench',
  });
}

export async function invokeZhongcaoCapability(capability: PlatformCapability): Promise<unknown> {
  return window.limeDesktop?.apps.invokeCapability({
    appId: 'lime.zhongcao',
    entryKey: 'diary-workbench',
    capability,
    operation: 'zhongcao-preview',
  });
}

export function subscribeZhongcaoPlatformChanges(
  onRefreshRequired: (event: PlatformChangeEvent) => void,
): (() => void) | undefined {
  return window.limeDesktop?.platform.onChanged((event) => {
    if (
      event.appId === 'lime.zhongcao' ||
      event.reason === 'settings-updated' ||
      event.reason === 'auth-updated' ||
      event.reason === 'billing-updated'
    ) {
      onRefreshRequired(event);
    }
  });
}

export async function uninstallZhongcaoFromPlatform(): Promise<unknown> {
  return window.limeDesktop?.apps.uninstall({
    appId: 'lime.zhongcao',
    keepData: true,
  });
}
