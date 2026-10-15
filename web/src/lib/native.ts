import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { supabase } from './supabase';

export const isNative = Capacitor.isNativePlatform();

/** The app's own link scheme: email links open AURA instead of a browser. */
export const NATIVE_AUTH_CALLBACK = 'com.eryza.aura://auth/callback';

/** Where Supabase auth emails send people back to. */
export function authRedirectUrl(): string {
  return isNative ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/`;
}

/** 'android' | 'ios' | 'browser' — recorded on scans as device_hint. */
export function deviceHint(): 'android' | 'ios' | 'browser' {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'browser';
}

/**
 * Signs in from an auth email link, e.g. com.eryza.aura://auth/callback#access_token=…&refresh_token=…
 * (or ?code=… when PKCE is used). Ignores links that aren't auth callbacks.
 */
export async function handleAuthLink(url: string): Promise<void> {
  if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return;
  const parsed = new URL(url.replace('com.eryza.aura://', 'https://app.invalid/'));
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const code = parsed.searchParams.get('code');
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (code) await supabase.auth.exchangeCodeForSession(code);
  else if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
}

/** Native-only setup. Safe to call in the browser (does nothing). */
export function initNative(): void {
  if (!isNative) return;
  void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  void App.addListener('appUrlOpen', ({ url }) => void handleAuthLink(url));
  // Cold start from a link: the URL arrives before listeners exist.
  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleAuthLink(launch.url);
  });
  // Hide the splash once the first screen has painted (launchAutoHide is off).
  requestAnimationFrame(() => requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 200 })));
}
