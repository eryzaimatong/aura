import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AgeCheckScreen } from './screens/onboarding/AgeCheckScreen';
import { AuthProvider } from './lib/auth/AuthProvider';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/onboarding/LoginScreen';
import { OfflineBanner } from './components/OfflineBanner';
import { PublicOnly, RequireAuth } from './components/RouteGuards';
import { RequireScanConsent } from './screens/mirror/RequireScanConsent';
import { SignUpScreen } from './screens/onboarding/SignUpScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WelcomeScreen } from './screens/onboarding/WelcomeScreen';

// Each screen downloads the first time it's opened, so the app starts fast on budget phones.
// MediaPipe alone is ~400 KB of JS, loaded only when someone actually scans.
const ScanScreen = lazy(() => import('./screens/mirror/scan/ScanScreen').then((m) => ({ default: m.ScanScreen })));
const AddGoalScreen = lazy(() => import('./screens/roadmap/AddGoalScreen').then((m) => ({ default: m.AddGoalScreen })));
const AddItemScreen = lazy(() => import('./screens/closet/AddItemScreen').then((m) => ({ default: m.AddItemScreen })));
const AgeBlockedScreen = lazy(() => import('./screens/onboarding/AgeBlockedScreen').then((m) => ({ default: m.AgeBlockedScreen })));
const AuraCardScreen = lazy(() => import('./screens/mirror/card/AuraCardScreen').then((m) => ({ default: m.AuraCardScreen })));
const CheckEmailScreen = lazy(() => import('./screens/onboarding/CheckEmailScreen').then((m) => ({ default: m.CheckEmailScreen })));
const ClosetScreen = lazy(() => import('./screens/closet/ClosetScreen').then((m) => ({ default: m.ClosetScreen })));
const ComponentsScreen = lazy(() => import('./screens/components/ComponentsScreen').then((m) => ({ default: m.ComponentsScreen })));
const ConsentScreen = lazy(() => import('./screens/mirror/ConsentScreen').then((m) => ({ default: m.ConsentScreen })));
const CorrectionScreen = lazy(() => import('./screens/mirror/correct/CorrectionScreen').then((m) => ({ default: m.CorrectionScreen })));
const DataPrivacyScreen = lazy(() => import('./screens/account/DataPrivacyScreen').then((m) => ({ default: m.DataPrivacyScreen })));
const DevCheckScreen = lazy(() => import('./screens/DevCheckScreen').then((m) => ({ default: m.DevCheckScreen })));
const DiaryScreen = lazy(() => import('./screens/diary/DiaryScreen').then((m) => ({ default: m.DiaryScreen })));
const EditItemScreen = lazy(() => import('./screens/closet/EditItemScreen').then((m) => ({ default: m.EditItemScreen })));
const ForgotPasswordScreen = lazy(() => import('./screens/onboarding/ForgotPasswordScreen').then((m) => ({ default: m.ForgotPasswordScreen })));
const GuardianScreen = lazy(() => import('./screens/onboarding/GuardianScreen').then((m) => ({ default: m.GuardianScreen })));
const HistoryScreen = lazy(() => import('./screens/diary/HistoryScreen').then((m) => ({ default: m.HistoryScreen })));
const ItemDetailScreen = lazy(() => import('./screens/closet/ItemDetailScreen').then((m) => ({ default: m.ItemDetailScreen })));
const LookbookScreen = lazy(() => import('./screens/looks/LookbookScreen').then((m) => ({ default: m.LookbookScreen })));
const MeasurementsScreen = lazy(() => import('./screens/account/MeasurementsScreen').then((m) => ({ default: m.MeasurementsScreen })));
const PackedAwayScreen = lazy(() => import('./screens/closet/PackedAwayScreen').then((m) => ({ default: m.PackedAwayScreen })));
const PlanTripScreen = lazy(() => import('./screens/trips/PlanTripScreen').then((m) => ({ default: m.PlanTripScreen })));
const PrivacyNoticeScreen = lazy(() => import('./screens/PrivacyNoticeScreen').then((m) => ({ default: m.PrivacyNoticeScreen })));
const ProfileScreen = lazy(() => import('./screens/account/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const QuickStartScreen = lazy(() => import('./screens/closet/QuickStartScreen').then((m) => ({ default: m.QuickStartScreen })));
const ReminderScreen = lazy(() => import('./screens/account/ReminderScreen').then((m) => ({ default: m.ReminderScreen })));
const ResetPasswordScreen = lazy(() => import('./screens/account/ResetPasswordScreen').then((m) => ({ default: m.ResetPasswordScreen })));
const RoadmapScreen = lazy(() => import('./screens/roadmap/RoadmapScreen').then((m) => ({ default: m.RoadmapScreen })));
const RoomPlaceholderScreen = lazy(() => import('./screens/RoomPlaceholderScreen').then((m) => ({ default: m.RoomPlaceholderScreen })));
const SavedLooksScreen = lazy(() => import('./screens/looks/SavedLooksScreen').then((m) => ({ default: m.SavedLooksScreen })));
const SettingsScreen = lazy(() => import('./screens/account/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const ShareCardScreen = lazy(() => import('./screens/mirror/card/ShareCardScreen').then((m) => ({ default: m.ShareCardScreen })));
const StylePrintScreen = lazy(() => import('./screens/style/StylePrintScreen').then((m) => ({ default: m.StylePrintScreen })));
const StyleQuizScreen = lazy(() => import('./screens/style/StyleQuizScreen').then((m) => ({ default: m.StyleQuizScreen })));
const TodayScreen = lazy(() => import('./screens/looks/TodayScreen').then((m) => ({ default: m.TodayScreen })));
const TripScreen = lazy(() => import('./screens/trips/TripScreen').then((m) => ({ default: m.TripScreen })));
const TripsScreen = lazy(() => import('./screens/trips/TripsScreen').then((m) => ({ default: m.TripsScreen })));
const UndertoneQuizScreen = lazy(() => import('./screens/mirror/UndertoneQuizScreen').then((m) => ({ default: m.UndertoneQuizScreen })));
const VanityScreen = lazy(() => import('./screens/vanity/VanityScreen').then((m) => ({ default: m.VanityScreen })));
const WeekScreen = lazy(() => import('./screens/looks/WeekScreen').then((m) => ({ default: m.WeekScreen })));

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OfflineBanner />
        <BrowserRouter>
          <Suspense fallback={<SplashScreen />}>
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
                  <Route path="/mirror/scan" element={<ScanScreen />} />
                </Route>
                <Route path="/mirror/quiz" element={<UndertoneQuizScreen />} />
                <Route path="/mirror/card" element={<AuraCardScreen />} />
                <Route path="/mirror/card/share" element={<ShareCardScreen />} />
                <Route path="/mirror/correct" element={<CorrectionScreen />} />
                <Route path="/closet" element={<ClosetScreen />} />
                <Route path="/closet/add" element={<AddItemScreen />} />
                <Route path="/closet/start" element={<QuickStartScreen />} />
              <Route path="/closet/packed" element={<PackedAwayScreen />} />
                <Route path="/closet/item/:id" element={<ItemDetailScreen />} />
                <Route path="/closet/item/:id/edit" element={<EditItemScreen />} />
                <Route path="/today" element={<TodayScreen />} />
                <Route path="/looks" element={<LookbookScreen />} />
                <Route path="/looks/saved" element={<SavedLooksScreen />} />
                <Route path="/looks/week" element={<WeekScreen />} />
                <Route path="/trips" element={<TripsScreen />} />
                <Route path="/trips/new" element={<PlanTripScreen />} />
                <Route path="/trips/:id" element={<TripScreen />} />
                <Route path="/diary" element={<DiaryScreen />} />
                <Route path="/diary/history" element={<HistoryScreen />} />
                <Route path="/vanity" element={<VanityScreen />} />
                <Route path="/rooms/:room" element={<RoomPlaceholderScreen />} />
                <Route path="/profile" element={<ProfileScreen />} />
                <Route path="/profile/measurements" element={<MeasurementsScreen />} />
                <Route path="/profile/style" element={<StylePrintScreen />} />
                <Route path="/profile/style/quiz" element={<StyleQuizScreen />} />
                <Route path="/profile/roadmap" element={<RoadmapScreen />} />
                <Route path="/profile/roadmap/add" element={<AddGoalScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/settings/notifications" element={<ReminderScreen />} />
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
