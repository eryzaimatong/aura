import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { hasCurrentConsent } from '../../lib/consent';
import { AccountProblemScreen } from '../onboarding/AccountProblemScreen';
import { SplashScreen } from '../SplashScreen';

type Check = 'checking' | 'granted' | 'missing' | { error: string };

/**
 * Hard rule 3: no camera until the user has agreed to the current notice.
 * (The API enforces this too, but the camera must not even open without it.)
 */
export function RequireScanConsent() {
  const profile = useProfile();
  const [check, setCheck] = useState<Check>('checking');

  useEffect(() => {
    let cancelled = false;
    hasCurrentConsent(profile.id, 'face_scan')
      .then((ok) => !cancelled && setCheck(ok ? 'granted' : 'missing'))
      .catch((err: unknown) => !cancelled && setCheck({ error: authErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  if (check === 'checking') return <SplashScreen />;
  if (check === 'missing') return <Navigate to="/mirror/consent" replace />;
  if (typeof check === 'object') return <AccountProblemScreen message={check.error} />;
  return <Outlet />;
}
