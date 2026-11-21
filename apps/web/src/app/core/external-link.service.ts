import { Injectable } from '@angular/core';

interface TauriInternals {
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
}

interface RuntimeWindow extends Window {
  __TAURI_INTERNALS__?: TauriInternals;
  __TAURI__?: unknown;
  __TAURI_METADATA__?: unknown;
  Capacitor?: CapacitorBridge;
}

/**
 * Cross-platform service for opening external URLs.
 * Ensures consistent handling across Desktop (Tauri), Native Mobile (Capacitor),
 * and standard Web browsers.
 */
@Injectable({
  providedIn: 'root',
})
export class ExternalLinkService {
  constructor() {
    this.initGlobalClickListener();
  }

  /**
   * Returns true when running inside a native Desktop (Tauri) or Mobile (Capacitor) wrapper.
   */
  public isNativeApp(): boolean {
    if (typeof window === 'undefined') return false;
    const runtimeWindow = window as RuntimeWindow;
    const isTauri = !!(
      runtimeWindow.__TAURI_INTERNALS__ ||
      runtimeWindow.__TAURI__ ||
      runtimeWindow.__TAURI_METADATA__
    );
    const isCapacitor = !!(
      runtimeWindow.Capacitor?.isNativePlatform &&
      runtimeWindow.Capacitor.isNativePlatform()
    );
    return isTauri || isCapacitor;
  }

  /**
   * Opens an external URL in the system default browser.
   */
  public async open(url: string, event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!url || typeof window === 'undefined') return;

    const runtimeWindow = window as RuntimeWindow;

    // 1. Desktop Tauri Environment: delegate to Tauri opener plugin
    const isTauri = !!(
      runtimeWindow.__TAURI_INTERNALS__ ||
      runtimeWindow.__TAURI__ ||
      runtimeWindow.__TAURI_METADATA__
    );

    if (isTauri) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
        return;
      } catch (tauriErr) {
        console.warn('[ExternalLinkService] Tauri plugin-opener failed, falling back:', tauriErr);
      }

      // Direct IPC fallback via __TAURI_INTERNALS__ if plugin module fails
      try {
        const internals = runtimeWindow.__TAURI_INTERNALS__;
        if (internals && typeof internals.invoke === 'function') {
          await internals.invoke('plugin:opener|open_url', {
            rule: { type: 'url', value: url },
          });
          return;
        }
      } catch { }
    }

    // 2. Mobile Native Environment (Capacitor)
    const isCapacitor = !!(
      runtimeWindow.Capacitor?.isNativePlatform &&
      runtimeWindow.Capacitor.isNativePlatform()
    );
    if (isCapacitor) {
      try {
        window.open(url, '_system');
        return;
      } catch { }
    }

    // 3. Web Browser fallback
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  /**
   * Intercepts external and target="_blank" links in desktop and native containers
   * to ensure they are directed to the OS default browser.
   */
  private initGlobalClickListener(): void {
    if (typeof window === 'undefined' || !window.document) return;

    window.document.addEventListener(
      'click',
      (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor || !anchor.href) return;

        const href = anchor.href;
        if (!href.startsWith('http://') && !href.startsWith('https://')) return;

        const isExternalOrigin = !href.startsWith(window.location.origin);
        const hasBlankTarget = anchor.target === '_blank';

        const runtimeWindow = window as RuntimeWindow;
        const isNativeOrDesktop = !!(
          runtimeWindow.__TAURI_INTERNALS__ ||
          runtimeWindow.__TAURI__ ||
          runtimeWindow.__TAURI_METADATA__ ||
          (runtimeWindow.Capacitor?.isNativePlatform &&
            runtimeWindow.Capacitor.isNativePlatform())
        );

        if (isNativeOrDesktop && (isExternalOrigin || hasBlankTarget)) {
          event.preventDefault();
          event.stopPropagation();
          this.open(href);
        }
      },
      true
    );
  }
}
