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
import { TermsPage } from './pages/TermsPage.js';
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
import { StudentVerificationPage } from './pages/StudentVerificationPage.js';
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
import { FacultyPortalPage } from './pages/faculty/FacultyPortalPage.js';
import { AdminPortalPage } from './pages/admin/AdminPortalPage.js';
import { LiveAssessmentConsolePage } from './pages/admin/LiveAssessmentConsolePage.js';
import { FirestoreDataService } from './services/firestoreData.service.js';
import { BindEmailModal } from './components/common/BindEmailModal.js';
import { ChangePasswordModal } from './components/common/ChangePasswordModal.js';
import { StudentLiveAlertListener } from './components/common/StudentLiveAlertListener.js';
import { RadialActionMenu } from './components/common/RadialActionMenu.js';
import { CookieConsentBanner } from './components/common/CookieConsentBanner.js';
import { MaintenancePage } from './pages/MaintenancePage.js';

// Branded Auth Loading Screen (eliminates flash of login/landing on refresh)
const AuthLoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Authenticating LogicQ session...',
}) => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none bg-[var(--bg-main)] text-[var(--text-main)]">
    <div className="mb-4 animate-pulse">
      <Logo size="lg" />
    </div>
    <div className="boot-progress-bar">
      <div className="boot-progress-fill" />
    </div>
    <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent)] tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
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

  const isAuthorized = isFaculty || isAdmin || user?.email?.toLowerCase() === 'logicqarena@gmail.com' || user?.email?.toLowerCase() === 'hariprasathset@sanjivani.edu.in';
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

  const isGlobalAdmin = Boolean(
    isAdmin ||
    user?.role === 'ADMIN' ||
    user?.role === 'FACULTY' ||
    user?.role === 'INSTITUTIONAL_ADMIN' ||
    (user?.email || '').toLowerCase().trim() === 'logicqarena@gmail.com' ||
    (user?.email || '').toLowerCase().trim() === 'hariprasathset@sanjivani.edu.in' ||
    (user?.prn || '').toUpperCase().trim() === 'LOGICQARENA' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/faculty')
  );

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
      (user.email || '').toLowerCase().trim() === 'hariprasathset@sanjivani.edu.in' ||
      (user.prn || '').toUpperCase().trim() === 'LOGICQARENA';

    if (isAdminAccount) {
      setIsAutoBindEmailOpen(false);
      setIsAutoChangePasswordOpen(false);
      return;
    }

    if (user.role === 'STUDENT') {
      const prnUpper = (user.prn || '').toUpperCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      const boundEmail = ((user as any).boundEmail || '').toLowerCase().trim();

      // Demo accounts or showcase students never get interrupted by email binding
      if (prnUpper.includes('DEMO') || prnUpper === 'DUMMY' || (user.id && user.id.includes('demo'))) {
        setIsAutoBindEmailOpen(false);
        setIsAutoChangePasswordOpen(false);
        return;
      }

      // Check if student has bound email in localStorage or Firestore
      const storedBoundV2 = prnUpper ? localStorage.getItem(`logicq_bound_v2_${prnUpper}`) === 'true' : false;
      const storedBoundStatus = prnUpper ? localStorage.getItem(`logicq_bound_status_${prnUpper}`) === 'true' : false;
      const storedBoundEmail = prnUpper ? localStorage.getItem(`logicq_bound_email_${prnUpper}`) : null;
      const isDismissed = false; // Email binding is mandatory — dismiss is no longer allowed

      const hasPersonalEmail = Boolean(
        (userEmail && !userEmail.endsWith('@sanjivani.edu.in') && !userEmail.includes('placeholder') && userEmail.includes('@')) ||
        (storedBoundEmail && !storedBoundEmail.endsWith('@sanjivani.edu.in') && storedBoundEmail.includes('@')) ||
        (boundEmail && !boundEmail.endsWith('@sanjivani.edu.in') && boundEmail.includes('@'))
      );

      const hasBoundEmail = Boolean(
        storedBoundV2 ||
        storedBoundStatus ||
        hasPersonalEmail ||
        (user as any).isEmailBoundV2 === true ||
        (user as any).isEmailBound === true ||
        (user as any).identityStatus === 'BOUND'
      );

      // If already bound, never show popup. Dismiss is no longer an option — email binding is mandatory.
      if (hasBoundEmail) {
        setIsAutoBindEmailOpen(false);
        setIsAutoChangePasswordOpen(false);
        return;
      }

      if (location.pathname !== '/login') {
        const timer = setTimeout(() => setIsAutoBindEmailOpen(true), 2500);
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

    // Ensure Lab Internal is unlocked by default and stale test/lab caches are purged
    try {
      localStorage.removeItem('logicq_lab_internal_faculty_locked');
      localStorage.removeItem('logicq_fallback_practice_progress_v1');
      localStorage.removeItem('logicq_practice_report_control-structures');
      localStorage.removeItem('logicq_practice_report_pointers-and-functions');
      localStorage.removeItem('logicq_practice_report_arrays-and-strings');
      localStorage.removeItem('logicq_practice_report_recursion-and-bit-manipulation');
      localStorage.removeItem('logicq_practice_report_structures-unions-and-dma');
      const labWipedFlag = localStorage.getItem('logicq_lab_purged_v2026_nov22_v3');
      if (!labWipedFlag) {
        localStorage.removeItem('logicq_assessment_submissions');
        localStorage.removeItem('logicq_assessment_test_submissions');
        localStorage.removeItem('logicq_lab_submissions');
        localStorage.removeItem('logicq_cie_marks');
        localStorage.removeItem('logicq_lab_internal_faculty_locked');
        localStorage.removeItem('logicq_fallback_practice_progress_v1');
        Object.keys(localStorage).forEach((k) => {
          if (
            k.startsWith('logicq_exam_') ||
            k.startsWith('logicq_test_') ||
            k.startsWith('logicq_lab_') ||
            k.startsWith('logicq_practice_report_') ||
            k.includes('assessment')
          ) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem('logicq_lab_purged_v2026_nov22_v3', 'true');
      }

      // Reset 2126PMIM1049 caches if student was reset by faculty
      const reset1049Flag = localStorage.getItem('logicq_reset_done_2126PMIM1049_v2');
      if (!reset1049Flag) {
        Object.keys(localStorage).forEach((k) => {
          if (k.toUpperCase().includes('2126PMIM1049')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem('logicq_reset_done_2126PMIM1049_v2', 'true');
      }

      // Clean slate for Assessment 4 (Fresh Test preparation)
      const a4FreshFlag = localStorage.getItem('logicq_a4_fresh_clean_v2026_nov23_v1');
      if (!a4FreshFlag) {
        Object.keys(localStorage).forEach((k) => {
          if (
            k.includes('test-continuous-arrays-search-sort') ||
            k.includes('test-assessment-4') ||
            k.includes('assessment-4') ||
            k.startsWith('logicq_exam_locked_') ||
            k.startsWith('logicq_exam_proctor_locked') ||
            k.startsWith('logicq_exam_student_submitted_') ||
            k.startsWith('logicq_exam_student_sub_') ||
            k.startsWith('logicq_code_sub_')
          ) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem('logicq_a4_fresh_clean_v2026_nov23_v1', 'true');
      }


    } catch {}

    // Clear stale cached test records from local storage
    try {
      const wipedFlag = localStorage.getItem('logicq_tests_purged_v2');
      if (!wipedFlag) {
        localStorage.removeItem('logicq_admin_tests');
        localStorage.removeItem('logicq_assessment_tests_backup_v1');
        localStorage.removeItem('logicq_assessment_submissions');
        localStorage.removeItem('logicq_master_test_status');
        localStorage.removeItem('logicq_exam_status_v2026');
        localStorage.removeItem('logicq_exam_confirmed_v2026');
        localStorage.removeItem('logicq_present_prns_v2026');
        localStorage.setItem('logicq_tests_purged_v2', 'true');
      }
    } catch {}

    return () => clearInterval(intervalId);
  }, []);

  const isWorkspaceRoute =
    (location.pathname.startsWith('/practice/') && location.pathname.split('/').filter(Boolean).length >= 3) ||
    (location.pathname.startsWith('/lab-internal/') && location.pathname.split('/').filter(Boolean).length >= 3) ||
    location.pathname.startsWith('/exam/') ||
    location.pathname.startsWith('/mini-project/') ||
    location.pathname.startsWith('/compiler') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/faculty');

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

  // Platform 404 Lockdown Mode (Set true to put entire website on 404 Not Found)
  const IS_WEBSITE_404 = true;

  // Scheduled Platform Maintenance Gate (Set false to open platform live to all students)
  const IS_MAINTENANCE_ACTIVE = false;
  const isFacultyOrAdmin = Boolean(
    isAdmin ||
    user?.role === 'ADMIN' ||
    user?.role === 'FACULTY' ||
    user?.email?.toLowerCase() === 'logicqarena@gmail.com' ||
    user?.email?.toLowerCase() === 'hariprasathset@sanjivani.edu.in' ||
    user?.prn === 'LOGICQARENA'
  );
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login';

  if (IS_WEBSITE_404) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] justify-center items-center">
        <NotFoundPage />
        <PwaManager />
      </div>
    );
  }

  if (IS_MAINTENANCE_ACTIVE && !isAdminRoute && !isFacultyOrAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <MaintenancePage />
        <PwaManager />
      </div>
    );
  }

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
      <StudentLiveAlertListener />

      <main className={`flex-1 w-full overflow-x-hidden ${isWorkspaceRoute ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        <Routes>
          {/* Root: if loading show splash, if authenticated go to admin or dashboard, else landing */}
          <Route
            path="/"
            element={
              authState === 'loading' ? (
                <AuthLoadingScreen message="Restoring LogicQ session..." />
              ) : user ? (
                user.role === 'ADMIN' || user.role === 'FACULTY' || user.email?.toLowerCase() === 'logicqarena@gmail.com' || user.email?.toLowerCase() === 'hariprasathset@sanjivani.edu.in' || user.prn === 'LOGICQARENA' ? (
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
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/how-to-install" element={<HowToInstallPage />} />
          <Route path="/verify" element={<StudentVerificationPage />} />
          <Route path="/verify/:identifier" element={<StudentVerificationPage />} />
          <Route path="/verify/student/:identifier" element={<StudentVerificationPage />} />
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
                {isAdmin || user?.email?.toLowerCase() === 'logicqarena@gmail.com' || user?.email?.toLowerCase() === 'hariprasathset@sanjivani.edu.in' || user?.prn === 'LOGICQARENA' ? (
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

          {/* Standalone Apple-Grade Live Assessment Command Center */}
          <Route
            path="/admin/live-assessment/:testId"
            element={
              <FacultyRoute>
                <LiveAssessmentConsolePage />
              </FacultyRoute>
            }
          />
          <Route
            path="/faculty/live-assessment/:testId"
            element={
              <FacultyRoute>
                <LiveAssessmentConsolePage />
              </FacultyRoute>
            }
          />

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

          {/* Dedicated Section Faculty Portal */}
          <Route
            path="/faculty"
            element={
              <FacultyRoute>
                <AdminPortalPage />
              </FacultyRoute>
            }
          />
          <Route
            path="/faculty/dashboard"
            element={
              <FacultyRoute>
                <AdminPortalPage />
              </FacultyRoute>
            }
          />
          <Route
            path="/faculty/*"
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
          // Only close after successful binding (onSuccess) — not via dismiss
          // Modal is mandatory; this onClose is called only after email bind success
          setIsAutoBindEmailOpen(false);
        }}
        onSuccess={() => {
          setIsAutoBindEmailOpen(false);
        }}
        forcePrompt={false}
      />
      <ChangePasswordModal
        isOpen={isAutoChangePasswordOpen}
        onClose={() => setIsAutoChangePasswordOpen(false)}
      />

      {/* 360 Radial Neumorphic Bubble Quick Action Menu */}
      <RadialActionMenu />

      {/* Global DPDP & Essential Storage Consent Notice */}
      <CookieConsentBanner />
    </div>
  );
};
