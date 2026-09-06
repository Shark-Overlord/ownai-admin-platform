import { lazy, Suspense } from "react";
import { RouteLoadBoundary } from "@/components/RouteLoadBoundary";
import { PromptUnlockProvider } from "@/components/prompt/PromptUnlockProvider";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteAnalyticsTracker } from "@/components/analytics/SiteAnalyticsTracker";
const ContactPage = lazy(() => import("@/pages/ContactPage").then(module => ({ default: module.ContactPage })));
const FrontendPromptLibraryPage = lazy(() => import("@/pages/FrontendPromptLibraryPage").then(module => ({ default: module.FrontendPromptLibraryPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then(module => ({ default: module.HomePage })));
const OwnAIDesignPage = lazy(() => import("@/pages/OwnAIDesignPage").then(module => ({ default: module.OwnAIDesignPage })));
const ImageStudio2Page = lazy(() => import("@/pages/ImageStudio2Page").then(module => ({ default: module.ImageStudio2Page })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then(module => ({ default: module.LoginPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(module => ({ default: module.ProfilePage })));
const PricingPage = lazy(() => import("@/pages/PricingPage").then(module => ({ default: module.PricingPage })));
const PricingPaymentResultPage = lazy(() => import("@/pages/PricingPaymentResultPage").then(module => ({ default: module.PricingPaymentResultPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then(module => ({ default: module.RegisterPage })));
const TutorialBookPage = lazy(() => import("@/pages/TutorialBookPage").then(module => ({ default: module.TutorialBookPage })));
const TutorialLibraryPage = lazy(() => import("@/pages/TutorialLibraryPage").then(module => ({ default: module.TutorialLibraryPage })));
const TutorialPostPage = lazy(() => import("@/pages/TutorialPostPage").then(module => ({ default: module.TutorialPostPage })));
const VideoBackgroundLibraryPage = lazy(() => import("@/pages/VideoBackgroundLibraryPage").then(module => ({ default: module.VideoBackgroundLibraryPage })));
import { useRobotsMeta } from "@/hooks/useDocumentMeta";
import { useTheme } from "@/lib/theme";
import { AnnouncementPopup } from "@/components/home/AnnouncementPopup";

function RouteRobotsPolicy() {
  const location = useLocation();
  const potentiallyIndexable =
    location.pathname === "/" ||
    location.pathname === "/ownai-design" ||
    location.pathname === "/tutorials" ||
    location.pathname.startsWith("/tutorials/books/") ||
    location.pathname.startsWith("/tutorials/posts/");

  useRobotsMeta(potentiallyIndexable ? null : "noindex, nofollow");
  return null;
}

function App() {
  useTheme(); // Initialize theme on load

  return (
    <>
      <SiteAnalyticsTracker />
      <RouteRobotsPolicy />
      <AnnouncementPopup />
      <PromptUnlockProvider>
      <RouteLoadBoundary><Suspense fallback={<main className="flex min-h-[60vh] items-center justify-center gap-3 bg-[var(--hero-surface)] text-[14px] text-[var(--hero-muted)]" role="status">正在加载页面…</main>}><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/ownai-design" element={<OwnAIDesignPage />} />
      <Route path="/image-studio" element={<Navigate to="/image-studio-2" replace />} />
      <Route
        path="/image-studio-2"
        element={
          <ProtectedRoute>
            <ImageStudio2Page />
          </ProtectedRoute>
        }
      />
      <Route
        path="/frontend-prompts"
        element={
          <ProtectedRoute>
            <FrontendPromptLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/video-backgrounds" element={<VideoBackgroundLibraryPage />} />
      <Route
        path="/tutorials"
        element={<TutorialLibraryPage />}
      />
      <Route
        path="/tutorials/books/:bookId"
        element={<TutorialBookPage />}
      />
      <Route
        path="/tutorials/posts/:postId"
        element={<TutorialPostPage />}
      />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/projects" element={<Navigate to="/profile" replace />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/pricing/payment-result" element={<PricingPaymentResultPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense></RouteLoadBoundary>
      </PromptUnlockProvider>
    </>
  );
}

export default App;
