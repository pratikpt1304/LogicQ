import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { PwaManager } from './components/common/PwaManager.js';
import { Logo } from './components/common/Logo.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { CompleteProfilePage } from './pages/CompleteProfilePage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { HowToInstallPage } from './pages/HowToInstallPage.js';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ChallengePage } from './pages/ChallengePage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { CheckerReviewsPage } from './pages/checker/CheckerReviewsPage.js';
import { PracticeModulesPage } from './pages/PracticeModulesPage.js';
import { PracticeModuleProblemsPage } from './pages/PracticeModuleProblemsPage.js';
import { PracticeWorkspacePage } from './pages/PracticeWorkspacePage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Branded Auth Loading Screen (eliminates flash of login/landing on refresh)
const AuthLoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Authenticating LogicQ session...',
}) => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
    <div className="mb-4 animate-pulse">
      <Logo size="lg" />
    </div>
    <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
      <span>{message}</span>
    </div>
  </div>
);

// Route Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authState } = useAuth();
  const location = useLocation();

  // Render branded loading state until session state is known (zero flash of login)
  if (authState === 'loading') {
    return <AuthLoadingScreen message="Restoring LogicQ session..." />;
  }

  // Redirect only when definitively signed out
  if (authState === 'signedOut' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block dashboard/feature access if student has not completed PRN/College/Department/Year
  if (
    user.role === 'STUDENT' &&
    user.profileComplete === false &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, authState } = useAuth();
  const location = useLocation();

  if (authState === 'loading') {
    return <AuthLoadingScreen message="Verifying administrator privileges..." />;
  }

  if (authState === 'signedOut' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const CheckerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isChecker, authState } = useAuth();
  const location = useLocation();

  if (authState === 'loading') {
    return <AuthLoadingScreen message="Verifying review privileges..." />;
  }

  if (authState === 'signedOut' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allowed for CHECKER or ADMIN (for supervisor review)
  if (!isChecker && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { user, authState } = useAuth();
  const location = useLocation();
  const isWorkspaceRoute = location.pathname.startsWith('/challenge');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors overflow-x-hidden">
      <Navbar />
      <PwaManager />

      <main className="flex-1 w-full overflow-x-hidden">
        <Routes>
          {/* Root: if loading show splash, if authenticated go to dashboard, else landing */}
          <Route
            path="/"
            element={
              authState === 'loading' ? (
                <AuthLoadingScreen message="Restoring LogicQ session..." />
              ) : user ? (
                user.role === 'STUDENT' && user.profileComplete === false ? (
                  <Navigate to="/complete-profile" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <LandingPage />
              )
            }
          />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/how-to-install" element={<HowToInstallPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Daily Challenge Workspace & Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challenge"
            element={
              <ProtectedRoute>
                <ChallengePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challenge/:slug"
            element={
              <ProtectedRoute>
                <ChallengePage />
              </ProtectedRoute>
            }
          />

          {/* Practice Modules Track */}
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <PracticeModulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/:moduleSlug"
            element={
              <ProtectedRoute>
                <PracticeModuleProblemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/:moduleSlug/:problemSlug"
            element={
              <ProtectedRoute>
                <PracticeWorkspacePage />
              </ProtectedRoute>
            }
          />

          {/* Leaderboard & History */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Profiles */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:identifier"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Portal */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />

          {/* Checker Protected Review Portal */}
          <Route
            path="/checker/reviews"
            element={
              <CheckerRoute>
                <CheckerReviewsPage />
              </CheckerRoute>
            }
          />

          {/* Fallback (404 Page) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isWorkspaceRoute && <Footer />}
    </div>
  );
};
