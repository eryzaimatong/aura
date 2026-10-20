import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** A calm pill at the top while the device is offline. Nothing is lost; requests just wait for the user to retry. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.5rem)] z-50 flex justify-center px-gutter">
      <p className="flex items-center gap-2 rounded-pill bg-cocoa px-4 py-2 text-label text-paper shadow-soft">
        <WifiOff size={16} aria-hidden="true" />
        You’re offline. Mira will catch up when you’re back.
      </p>
    </div>
  );
}
