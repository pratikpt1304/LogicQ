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
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { CheckerReviewsPage } from './pages/checker/CheckerReviewsPage.js';
import { PracticeModulesPage } from './pages/PracticeModulesPage.js';
import { PracticeModuleProblemsPage } from './pages/PracticeModuleProblemsPage.js';
import { PracticeWorkspacePage } from './pages/PracticeWorkspacePage.js';
import { TopicPracticeHubPage } from './pages/TopicPracticeHubPage.js';
import { PublicReportVerificationPage } from './pages/PublicReportVerificationPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { SectionManagementPage } from './pages/faculty/SectionManagementPage.js';
import { QuestionBankPage } from './pages/faculty/QuestionBankPage.js';
import { CreateTestPage } from './pages/faculty/CreateTestPage.js';
import { InstantJoinPage } from './pages/InstantJoinPage.js';
import { StudentTestListPage } from './pages/exam/StudentTestListPage.js';
import { ExamWorkspacePage } from './pages/exam/ExamWorkspacePage.js';
import { MiniProjectWorkspacePage } from './pages/exam/MiniProjectWorkspacePage.js';
import { CompilerPage } from './pages/CompilerPage.js';
import { StudentDashboardAnalyticsPage } from './pages/analytics/StudentDashboardAnalyticsPage.js';
import { FacultyAnalyticsPage } from './pages/faculty/FacultyAnalyticsPage.js';
import { AdminPortalPage } from './pages/admin/AdminPortalPage.js';
import { FirestoreDataService } from './services/firestoreData.service.js';
import { BindEmailModal } from './components/common/BindEmailModal.js';
import { ChangePasswordModal } from './components/common/ChangePasswordModal.js';

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
  const { user, isAdmin, authState } = useAuth();
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

const FacultyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isFaculty, isAdmin, authState } = useAuth();
  const location = useLocation();

  if (authState === 'loading') {
    return <AuthLoadingScreen message="Verifying faculty privileges..." />;
  }

  if (authState === 'signedOut' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAuthorized = isFaculty || isAdmin || user?.email?.toLowerCase() === 'logicqarena@gmail.com';
  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AnalyticsDispatcher: React.FC = () => {
  const { isAdmin, isFaculty } = useAuth();
  if (isAdmin || isFaculty) {
    return <FacultyAnalyticsPage />;
  }
  return <StudentDashboardAnalyticsPage />;
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
  const { user, isAdmin, authState } = useAuth();
  const location = useLocation();
  const [isAutoBindEmailOpen, setIsAutoBindEmailOpen] = React.useState(false);
  const [isAutoChangePasswordOpen, setIsAutoChangePasswordOpen] = React.useState(false);

  // Mandatory email binding for students who haven't bound their verified personal email yet (Epoch V2)
  useEffect(() => {
    if (!user) {
      setIsAutoBindEmailOpen(false);
      setIsAutoChangePasswordOpen(false);
      return;
    }

    // STRICT: Platform Administrator or Faculty NEVER get interrupted by student modals!
    const isAdminAccount =
      user.role === 'ADMIN' ||
      user.role === 'FACULTY' ||
      (user.email || '').toLowerCase().trim() === 'logicqarena@gmail.com' ||
      (user.prn || '').toUpperCase().trim() === 'LOGICQARENA';

    if (isAdminAccount) {
      setIsAutoBindEmailOpen(false);
      setIsAutoChangePasswordOpen(false);
      return;
    }

    if (user.role === 'STUDENT') {
      const prnUpper = (user.prn || '').toUpperCase();
      const userEmail = (user.email || '').toLowerCase();

      // Demo accounts or showcase students never get interrupted by email binding
      if (prnUpper.includes('DEMO') || prnUpper === 'DUMMY' || (user.id && user.id.includes('demo'))) {
        setIsAutoBindEmailOpen(false);
        setIsAutoChangePasswordOpen(false);
        return;
      }

      // Check if student has already bound a personal email or completed verification
      const hasBoundEmail = Boolean(
        (user as any).isEmailBoundV2 ||
        (user.email && (user.email.toLowerCase() === 'logicqarena@gmail.com' || (!user.email.endsWith('@sanjivani.edu.in') && user.email.includes('@')))) ||
        (prnUpper && localStorage.getItem(`logicq_bound_v2_${prnUpper}`) === 'true') ||
        (user.id && localStorage.getItem(`logicq_bound_v2_${user.id}`) === 'true') ||
        (prnUpper && localStorage.getItem(`logicq_bound_status_${prnUpper}`) === 'true')
      );

      // Strictly compulsory: no dismissal without actual verified binding
      if (hasBoundEmail) {
        setIsAutoBindEmailOpen(false);
        // If email is already bound, prompt Change Password if they haven't set a custom password yet
        const hasCustomPw = Boolean(
          (prnUpper && localStorage.getItem(`logicq_custom_password_${prnUpper}`)) ||
          (user.id && localStorage.getItem(`logicq_custom_password_${user.id}`))
        );
        const hasPrompted = sessionStorage.getItem(`logicq_pwd_prompt_${prnUpper || user.id}`) === 'true';
        if (!hasCustomPw && !hasPrompted && location.pathname !== '/login') {
          sessionStorage.setItem(`logicq_pwd_prompt_${prnUpper || user.id}`, 'true');
          const pwdTimer = setTimeout(() => setIsAutoChangePasswordOpen(true), 1500);
          return () => clearTimeout(pwdTimer);
        }
        return;
      }

      if (location.pathname !== '/login') {
        const timer = setTimeout(() => setIsAutoBindEmailOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    } else {
      setIsAutoBindEmailOpen(false);
      setIsAutoChangePasswordOpen(false);
    }
  }, [user, location.pathname]);


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
    (location.pathname.startsWith('/practice/') && location.pathname.split('/').filter(Boolean).length >= 3) ||
    (location.pathname.startsWith('/lab-internal/') && location.pathname.split('/').filter(Boolean).length >= 3) ||
    location.pathname.startsWith('/exam/') ||
    location.pathname.startsWith('/mini-project/') ||
    location.pathname.startsWith('/compiler') ||
    location.pathname.startsWith('/admin');

  const isInternalAppRoute =
    isWorkspaceRoute ||
    location.pathname === '/history' ||
    location.pathname === '/analytics' ||
    location.pathname === '/student/analytics' ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/checker') ||
    location.pathname.startsWith('/faculty');

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
      <div className={isWorkspaceRoute ? 'hidden' : 'block'}>
        <Navbar />
      </div>
      <PwaManager />

      <main className={`flex-1 w-full overflow-x-hidden ${isWorkspaceRoute ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        <Routes>
          {/* Root: if loading show splash, if authenticated go to admin or dashboard, else landing */}
          <Route
            path="/"
            element={
              authState === 'loading' ? (
                <AuthLoadingScreen message="Restoring LogicQ session..." />
              ) : user ? (
                user.role === 'ADMIN' || user.email?.toLowerCase() === 'logicqarena@gmail.com' || user.prn === 'LOGICQARENA' ? (
                  <Navigate to="/admin" replace />
                ) : user.role === 'STUDENT' && user.profileComplete === false ? (
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

          {/* Daily Challenge Workspace & Dashboard: Admin is strictly locked into /admin */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isAdmin || user?.email?.toLowerCase() === 'logicqarena@gmail.com' || user?.prn === 'LOGICQARENA' ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <DashboardPage />
                )}
              </ProtectedRoute>
            }
          />
          {/* Deprecated Daily Challenge routes: seamlessly redirect to Practice Hub */}
          <Route path="/challenge" element={<Navigate to="/practice" replace />} />
          <Route path="/challenge/:slug" element={<Navigate to="/practice" replace />} />
          <Route path="/daily" element={<Navigate to="/practice" replace />} />

          {/* Practice Arena (100 Topic Practice Problems) */}
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <TopicPracticeHubPage />
              </ProtectedRoute>
            }
          />

          {/* Standalone GCC 14 (C11) Online Compiler Workspace */}
          <Route
            path="/compiler"
            element={
              <ProtectedRoute>
                <CompilerPage />
              </ProtectedRoute>
            }
          />

          {/* Lab Internal Modules Track (4 Sequential Coursework Modules) */}
          <Route
            path="/lab-internal"
            element={
              <ProtectedRoute>
                <PracticeModulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab-internal/:moduleSlug"
            element={
              <ProtectedRoute>
                <PracticeModulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab-internal/:moduleSlug/:problemSlug"
            element={
              <ProtectedRoute>
                <PracticeWorkspacePage />
              </ProtectedRoute>
            }
          />

          {/* Backward compatibility aliases */}
          <Route
            path="/practice/:moduleSlug"
            element={
              <ProtectedRoute>
                <PracticeModulesPage />
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

          {/* Leaderboard redirect to Analytics */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Navigate to="/analytics" replace />
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

          {/* Admin Portal Removed - Redirect to Dashboard */}
          <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

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
          <Route path="/join" element={<InstantJoinPage />} />
          <Route path="/join/:joinToken" element={<InstantJoinPage />} />

          {/* Master Admin & Faculty Portal (Specification V2.0) */}
          <Route
            path="/admin"
            element={
              <FacultyRoute>
                <AdminPortalPage />
              </FacultyRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <FacultyRoute>
                <AdminPortalPage />
              </FacultyRoute>
            }
          />

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

          {/* Unified Role-Aware Analytics Dashboard */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDispatcher />
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

      {!isInternalAppRoute && <Footer />}
      {!isWorkspaceRoute && <MobileBottomNav />}

      <BindEmailModal
        isOpen={isAutoBindEmailOpen}
        onClose={() => {
          localStorage.setItem('logicq_dismiss_bind_modal', 'true');
          sessionStorage.setItem('logicq_dismiss_bind_modal', 'true');
          setIsAutoBindEmailOpen(false);
        }}
        onSuccess={() => {
          setIsAutoBindEmailOpen(false);
          setTimeout(() => {
            setIsAutoChangePasswordOpen(true);
          }, 400);
        }}
        forcePrompt={false}
      />
      <ChangePasswordModal
        isOpen={isAutoChangePasswordOpen}
        onClose={() => setIsAutoChangePasswordOpen(false)}
      />
    </div>
  );
};
