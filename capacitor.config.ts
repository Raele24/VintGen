import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vintgen.app',
  appName: 'VintGen',
  webDir: 'apps/web/dist/web/browser',
  server: {
    androidScheme: 'https',
    // When CAPACITOR_LIVE_URL is set (e.g. your deployed URL), the APK loads directly from the live web app for instant OTA updates.
    // If not set, it loads from local bundled assets with offline service worker.
    url: process.env.CAPACITOR_LIVE_URL || 'https://vintgen-ai.vercel.app',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;