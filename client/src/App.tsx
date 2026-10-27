import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { MobileBottomNav } from './components/layout/MobileBottomNav.js';
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
import { PublicReportVerificationPage } from './pages/PublicReportVerificationPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { SectionManagementPage } from './pages/faculty/SectionManagementPage.js';
import { QuestionBankPage } from './pages/faculty/QuestionBankPage.js';
import { CreateTestPage } from './pages/faculty/CreateTestPage.js';
import { InstantJoinPage } from './pages/InstantJoinPage.js';
import { StudentTestListPage } from './pages/exam/StudentTestListPage.js';
import { ExamWorkspacePage } from './pages/exam/ExamWorkspacePage.js';
import { MiniProjectWorkspacePage } from './pages/exam/MiniProjectWorkspacePage.js';
import { StudentDashboardAnalyticsPage } from './pages/analytics/StudentDashboardAnalyticsPage.js';
import { FacultyAnalyticsPage } from './pages/faculty/FacultyAnalyticsPage.js';
import { FirestoreDataService } from './services/firestoreData.service.js';

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

const FacultyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isFaculty, authState } = useAuth();
  const location = useLocation();

  if (authState === 'loading') {
    return <AuthLoadingScreen message="Verifying faculty privileges..." />;
  }

  if (authState === 'signedOut' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isFaculty) {
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

  // Background Pre-Warm & Keep-Alive for Render Backend
  useEffect(() => {
    const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    const pingEndpoint = `${rawApiUrl}/practice/modules`;

    const warmBackend = () => {
      fetch(pingEndpoint, { method: 'GET', credentials: 'omit' }).catch(() => {
        // Silent background ping
      });
    };

    // 1. Immediate pre-warm on initial page load / app visit
    warmBackend();

    // 2. Keep-alive ping every 8 minutes while user has tab open (prevents Render 15-min sleep)
    const intervalId = setInterval(warmBackend, 8 * 60 * 1000);

    // Purge any deleted/banned student profiles from local storage
    FirestoreDataService.purgeDeletedStudentsFromFirestore().catch(() => {});

    return () => clearInterval(intervalId);
  }, []);

  const isWorkspaceRoute =
    location.pathname.startsWith('/challenge') ||
    location.pathname.startsWith('/practice/') ||
    location.pathname.startsWith('/exam/') ||
    location.pathname.startsWith('/mini-project/');

  const isStaging =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('--staging') ||
      window.location.hostname.includes('staging') ||
      (window.location.hostname.endsWith('.web.app') && window.location.hostname !== 'logicq-clanguage.web.app') ||
      (import.meta as any).env?.VITE_IS_STAGING === 'true');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors overflow-x-hidden">
      {isStaging && (
        <div
          role="banner"
          aria-label="Staging Environment Indicator"
          className="w-full bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-1.5 px-4 text-center sticky top-0 z-[100] shadow-md flex items-center justify-center gap-2 border-b border-amber-600"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
          <span>STAGING ENVIRONMENT — TEST DATA ONLY (ISOLATED FROM PRODUCTION)</span>
        </div>
      )}
      <div className={isWorkspaceRoute ? 'hidden md:block' : 'block'}>
        <Navbar />
      </div>
      <PwaManager />

      <main className={`flex-1 w-full overflow-x-hidden ${isWorkspaceRoute ? 'pb-0' : 'pb-16 md:pb-0'}`}>
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
          <Route path="/verify/report/:reportId" element={<PublicReportVerificationPage />} />

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

          {/* Practice Modules Track (Protected for authenticated students) */}
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

          {/* Public Instant Student Join (Section 13) */}
          <Route path="/join/:joinToken" element={<InstantJoinPage />} />

          {/* Faculty & Admin Section Management (Section 11-12) */}
          <Route
            path="/faculty/sections"
            element={
              <FacultyRoute>
                <SectionManagementPage />
              </FacultyRoute>
            }
          />

          {/* Faculty Question Bank & AI Generator (Sections 16-18) */}
          <Route
            path="/faculty/questions"
            element={
              <FacultyRoute>
                <QuestionBankPage />
              </FacultyRoute>
            }
          />

          {/* Faculty Create & Assign Tests (Workflow 2, Sections 14-15) */}
          <Route
            path="/faculty/tests"
            element={
              <FacultyRoute>
                <CreateTestPage />
              </FacultyRoute>
            }
          />

          {/* Faculty Overview Analytics (Phase 5, Sections 48-56, 59-63) */}
          <Route
            path="/faculty/analytics"
            element={
              <FacultyRoute>
                <FacultyAnalyticsPage />
              </FacultyRoute>
            }
          />

          {/* Student Assessment Tests & Exam Workspace (Phase 3) */}
          <Route
            path="/student/tests"
            element={
              <ProtectedRoute>
                <StudentTestListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:assignmentId/:problemId"
            element={
              <ProtectedRoute>
                <ExamWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mini-project/:miniProjectId"
            element={
              <ProtectedRoute>
                <MiniProjectWorkspacePage />
              </ProtectedRoute>
            }
          />

          {/* Student Dual-Score Analytics Dashboard (Phase 5, Sections 40-47, 59-61) */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <StudentDashboardAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/analytics"
            element={
              <ProtectedRoute>
                <StudentDashboardAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback (404 Page) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isWorkspaceRoute && <Footer />}
      {!isWorkspaceRoute && <MobileBottomNav />}
    </div>
  );
};
