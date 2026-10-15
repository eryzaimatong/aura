import type { CapacitorConfig } from '@capacitor/cli';

/**
 * `npm run android:dev` points the app at the API on your computer (http://10.0.2.2:8000 from
 * the emulator). That needs plain-HTTP and mixed-content exceptions, which are switched on ONLY
 * for that script — release builds never get them.
 */
const devApi = process.env.npm_lifecycle_event === 'android:dev';

// Native config takes literal colours: this is surface/cream (#FDF6EC) from the design tokens.
const CREAM = '#FDF6EC';

const config: CapacitorConfig = {
  appId: 'com.eryza.aura',
  appName: 'AURA',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: devApi,
  },
  android: {
    allowMixedContent: devApi,
  },
  plugins: {
    SplashScreen: {
      // Hidden by the app once the first screen has rendered (src/lib/native.ts).
      launchAutoHide: false,
      backgroundColor: CREAM,
      showSpinner: false,
    },
    StatusBar: {
      // Dark icons on the cream background. (Android 15+ always draws the app behind the
      // status bar, so there's no bar colour to set — the page's cream shows through.)
      style: 'LIGHT',
    },
    SystemBars: {
      // Capacitor injects --safe-area-inset-* CSS variables; layout pads with them (index.css).
      insetsHandling: 'css',
    },
  },
};

export default config;
