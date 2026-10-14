import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PublicOnly, RequireAuth } from './components/RouteGuards';
import { AuthProvider } from './lib/auth/AuthProvider';
import { DevCheckScreen } from './screens/DevCheckScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PrivacyNoticeScreen } from './screens/PrivacyNoticeScreen';
import { RoomPlaceholderScreen } from './screens/RoomPlaceholderScreen';
import { AddItemScreen } from './screens/closet/AddItemScreen';
import { ClosetScreen } from './screens/closet/ClosetScreen';
import { ItemDetailScreen } from './screens/closet/ItemDetailScreen';
import { QuickStartScreen } from './screens/closet/QuickStartScreen';
import { DiaryScreen } from './screens/diary/DiaryScreen';
import { LookbookScreen } from './screens/looks/LookbookScreen';
import { TodayScreen } from './screens/looks/TodayScreen';
import { ComponentsScreen } from './screens/components/ComponentsScreen';
import { AuraCardScreen } from './screens/mirror/card/AuraCardScreen';
import { ConsentScreen } from './screens/mirror/ConsentScreen';
import { CorrectionScreen } from './screens/mirror/correct/CorrectionScreen';
import { RequireScanConsent } from './screens/mirror/RequireScanConsent';
import { UndertoneQuizScreen } from './screens/mirror/UndertoneQuizScreen';
import { AgeBlockedScreen } from './screens/onboarding/AgeBlockedScreen';
import { AgeCheckScreen } from './screens/onboarding/AgeCheckScreen';
import { CheckEmailScreen } from './screens/onboarding/CheckEmailScreen';
import { GuardianScreen } from './screens/onboarding/GuardianScreen';
import { LoginScreen } from './screens/onboarding/LoginScreen';
import { SignUpScreen } from './screens/onboarding/SignUpScreen';
import { WelcomeScreen } from './screens/onboarding/WelcomeScreen';
import { SplashScreen } from './screens/SplashScreen';

// MediaPipe is ~400 KB of JS: load it only when someone actually scans.
const ScanScreen = lazy(() => import('./screens/mirror/scan/ScanScreen').then((m) => ({ default: m.ScanScreen })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/welcome" element={<WelcomeScreen />} />
            <Route path="/age" element={<AgeCheckScreen />} />
            <Route path="/age/guardian" element={<GuardianScreen />} />
            <Route path="/age/blocked" element={<AgeBlockedScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/check-email" element={<CheckEmailScreen />} />
            <Route path="/login" element={<LoginScreen />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/mirror" element={<Navigate to="/mirror/scan" replace />} />
            <Route path="/mirror/consent" element={<ConsentScreen />} />
            {/* No camera before consent (hard rule 3). */}
            <Route element={<RequireScanConsent />}>
              <Route
                path="/mirror/scan"
                element={
                  <Suspense fallback={<SplashScreen />}>
                    <ScanScreen />
                  </Suspense>
                }
              />
            </Route>
            <Route path="/mirror/quiz" element={<UndertoneQuizScreen />} />
            <Route path="/mirror/card" element={<AuraCardScreen />} />
            <Route path="/mirror/correct" element={<CorrectionScreen />} />
            <Route path="/closet" element={<ClosetScreen />} />
            <Route path="/closet/add" element={<AddItemScreen />} />
            <Route path="/closet/start" element={<QuickStartScreen />} />
            <Route path="/closet/item/:id" element={<ItemDetailScreen />} />
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/looks" element={<LookbookScreen />} />
            <Route path="/diary" element={<DiaryScreen />} />
            <Route path="/rooms/:room" element={<RoomPlaceholderScreen />} />
          </Route>

          {/* Readable signed in or out. */}
          <Route path="/privacy" element={<PrivacyNoticeScreen />} />

          {/* Dev-only pages never ship in the Play build. */}
          {import.meta.env.DEV && <Route path="/dev" element={<DevCheckScreen />} />}
          {import.meta.env.DEV && <Route path="/components" element={<ComponentsScreen />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
