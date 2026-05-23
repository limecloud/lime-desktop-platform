/// <reference types="vite/client" />

import type { LimeDesktopApi } from '../../shared/types';

declare global {
  interface Window {
    limeDesktop: LimeDesktopApi;
  }
}

export {};
