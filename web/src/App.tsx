import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PublicOnly, RequireAuth } from './components/RouteGuards';
import { AuthProvider } from './lib/auth/AuthProvider';
import { DevCheckScreen } from './screens/DevCheckScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PrivacyNoticeScreen } from './screens/PrivacyNoticeScreen';
import { DataPrivacyScreen } from './screens/account/DataPrivacyScreen';
import { MeasurementsScreen } from './screens/account/MeasurementsScreen';
import { AddGoalScreen } from './screens/roadmap/AddGoalScreen';
import { RoadmapScreen } from './screens/roadmap/RoadmapScreen';
import { StylePrintScreen } from './screens/style/StylePrintScreen';
import { StyleQuizScreen } from './screens/style/StyleQuizScreen';
import { ProfileScreen } from './screens/account/ProfileScreen';
import { ResetPasswordScreen } from './screens/account/ResetPasswordScreen';
import { SettingsScreen } from './screens/account/SettingsScreen';
import { ForgotPasswordScreen } from './screens/onboarding/ForgotPasswordScreen';
import { RoomPlaceholderScreen } from './screens/RoomPlaceholderScreen';
import { AddItemScreen } from './screens/closet/AddItemScreen';
import { ClosetScreen } from './screens/closet/ClosetScreen';
import { ItemDetailScreen } from './screens/closet/ItemDetailScreen';
import { QuickStartScreen } from './screens/closet/QuickStartScreen';
import { DiaryScreen } from './screens/diary/DiaryScreen';
import { ShareCardScreen } from './screens/mirror/card/ShareCardScreen';
import { LookbookScreen } from './screens/looks/LookbookScreen';
import { PlanTripScreen } from './screens/trips/PlanTripScreen';
import { TripScreen } from './screens/trips/TripScreen';
import { TripsScreen } from './screens/trips/TripsScreen';
import { TodayScreen } from './screens/looks/TodayScreen';
import { VanityScreen } from './screens/vanity/VanityScreen';
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
            <Route path="/forgot" element={<ForgotPasswordScreen />} />
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
            <Route path="/mirror/card/share" element={<ShareCardScreen />} />
            <Route path="/mirror/correct" element={<CorrectionScreen />} />
            <Route path="/closet" element={<ClosetScreen />} />
            <Route path="/closet/add" element={<AddItemScreen />} />
            <Route path="/closet/start" element={<QuickStartScreen />} />
            <Route path="/closet/item/:id" element={<ItemDetailScreen />} />
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/looks" element={<LookbookScreen />} />
            <Route path="/trips" element={<TripsScreen />} />
            <Route path="/trips/new" element={<PlanTripScreen />} />
            <Route path="/trips/:id" element={<TripScreen />} />
            <Route path="/diary" element={<DiaryScreen />} />
            <Route path="/vanity" element={<VanityScreen />} />
            <Route path="/rooms/:room" element={<RoomPlaceholderScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/profile/measurements" element={<MeasurementsScreen />} />
            <Route path="/profile/style" element={<StylePrintScreen />} />
            <Route path="/profile/style/quiz" element={<StyleQuizScreen />} />
            <Route path="/profile/roadmap" element={<RoadmapScreen />} />
            <Route path="/profile/roadmap/add" element={<AddGoalScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/privacy/data" element={<DataPrivacyScreen />} />
            <Route path="/account/password" element={<ResetPasswordScreen />} />
          </Route>

          {/* Readable signed in or out. */}
          <Route path="/privacy" element={<PrivacyNoticeScreen />} />
          {/* Reset-email landing: the link signs the user in, the screen handles expired links. */}
          <Route path="/reset-password" element={<ResetPasswordScreen />} />

          {/* Dev-only pages never ship in the Play build. */}
          {import.meta.env.DEV && <Route path="/dev" element={<DevCheckScreen />} />}
          {import.meta.env.DEV && <Route path="/components" element={<ComponentsScreen />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
