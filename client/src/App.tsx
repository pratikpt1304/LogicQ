import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ChallengePage } from './pages/ChallengePage.js';
import { ArchivePage } from './pages/ArchivePage.js';
import { ArenaPage } from './pages/ArenaPage.js';
import { ContestDetailPage } from './pages/ContestDetailPage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { AchievementsPage } from './pages/AchievementsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Route Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center font-mono text-cyan-400 text-xs">
        Authenticating LogicQ session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center font-mono text-purple-400 text-xs">
        Verifying administrator privileges...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 text-slate-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        <Routes>
          {/* Root: if authenticated go to dashboard, else landing */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Challenger Workspace & Catalog */}
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
          <Route
            path="/archive"
            element={
              <ProtectedRoute>
                <ArchivePage />
              </ProtectedRoute>
            }
          />

          {/* Arena & Competitions */}
          <Route
            path="/arena"
            element={
              <ProtectedRoute>
                <ArenaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arena/:slug"
            element={
              <ProtectedRoute>
                <ContestDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Leaderboard & Achievements */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
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
            path="/profile/:username"
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

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};
