import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/auth/context';
import { SplashScreen } from '../screens/SplashScreen';
import { AccountProblemScreen } from '../screens/onboarding/AccountProblemScreen';

/** Signed-in routes: needs a session and a profile row. */
export function RequireAuth() {
  const { state } = useAuth();
  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'signed_out') return <Navigate to="/welcome" replace />;
  if (state.status === 'error') return <AccountProblemScreen message={state.message} />;
  return <Outlet />;
}

/** Onboarding routes: bounce signed-in users to Home. */
export function PublicOnly() {
  const { state } = useAuth();
  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'ready') return <Navigate to="/" replace />;
  if (state.status === 'error') return <AccountProblemScreen message={state.message} />;
  return <Outlet />;
}
