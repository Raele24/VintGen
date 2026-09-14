import { Injectable, signal } from '@angular/core';

export interface ReleaseInfo {
  tag: string;
  version: string;
  name: string;
  body: string;
  apkDownloadUrl?: string;
  htmlUrl: string;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  public readonly currentVersion = '1.0.0';
  public hasNativeUpdate = signal<boolean>(false);
  public isWebUpdateReady = signal<boolean>(false);
  public latestRelease = signal<ReleaseInfo | null>(null);
  public isChecking = signal<boolean>(false);

  constructor() {
    this.initServiceWorkerListener();
    this.checkForUpdatesSilently();
  }

  private initServiceWorkerListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('vintgen-update-ready', () => {
      console.log('[UpdateService] New service worker version ready for activation');
      this.isWebUpdateReady.set(true);
    });
  }

  public async checkForUpdatesSilently(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      this.isChecking.set(true);
      const res = await fetch(
        'https://api.github.com/repos/Raele24/VinStack/releases/latest',
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );

      if (!res.ok) return;

      const data = await res.json();
      const tagName: string = data.tag_name || '';
      const cleanLatest = tagName.replace(/^v/, '').trim();
      const isNewer = this.compareSemver(cleanLatest, this.currentVersion) > 0;

      if (isNewer) {
        // Find APK asset if available
        let apkAssetUrl: string | undefined;
        if (Array.isArray(data.assets)) {
          const apkAsset = data.assets.find((a: any) =>
            a.name?.endsWith('.apk')
          );
          if (apkAsset) {
            apkAssetUrl = apkAsset.browser_download_url;
          }
        }

        this.latestRelease.set({
          tag: tagName,
          version: cleanLatest,
          name: data.name || tagName,
          body: data.body || '',
          apkDownloadUrl: apkAssetUrl,
          htmlUrl: data.html_url,
          publishedAt: data.published_at,
        });

        this.hasNativeUpdate.set(true);
      }
    } catch (err) {
      console.warn('[UpdateService] Update check failed:', err);
    } finally {
      this.isChecking.set(false);
    }
  }

  public reloadForUpdate(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  public downloadLatestApk(): void {
    const release = this.latestRelease();
    if (!release || typeof window === 'undefined') return;

    const url = release.apkDownloadUrl || release.htmlUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private compareSemver(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}