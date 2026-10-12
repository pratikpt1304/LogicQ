import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Logo } from '../common/Logo.js';
import {
  clearPwaUserCachesAndDrafts,
  triggerPwaInstallPrompt,
  useIsStandalonePwa,
} from '../common/PwaManager.js';
import {
  Home,
  Flame,
  Trophy,
  Code2,
  Calendar,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Download,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, isChecker, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isStandalone = useIsStandalonePwa();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/challenge'
      ? location.pathname === '/challenge' || location.pathname.startsWith('/challenge/')
      : location.pathname === path;

  // Signed-in navbar items in exact canonical order: Home, Daily Challenge, Leaderboard
  const appNavLinks = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Daily Challenge', path: '/challenge', icon: Calendar },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  const handleLogout = async () => {
    await clearPwaUserCachesAndDrafts();
    await logout();
    navigate('/');
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleInstallClick = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await triggerPwaInstallPrompt();
  };

  return (
    <header
      style={{
        minHeight: 'var(--navbar-height, 4rem)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
      className="sticky top-0 z-50 w-full border-b border-[var(--border-line)] bg-[var(--bg-panel)] text-[var(--text-main)] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand (links to /dashboard when signed in, / when signed out) */}
        <Logo size="md" to={user ? '/dashboard' : '/'} />

        {/* Desktop Navigation (Only shown for logged-in users) */}
        {user && (
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {appNavLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'text-[var(--color-accent)] bg-[var(--bg-surface)] border border-[var(--color-accent)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Section: Stats, Theme Toggle & User or Auth CTAs */}
        <div className="hidden md:flex items-center gap-2.5">
          {user ? (
            <>
              {/* Daily Streak Pill */}
              <div
                title="Current Daily Challenge Streak"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-warning)] text-xs font-mono font-semibold"
              >
                <Flame className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
                <span>{user.currentStreak}d streak</span>
              </div>

              {/* Total Points Pill */}
              <div
                title="Total LogicQ Score"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-accent)] text-xs font-mono font-semibold"
              >
                <span>PTS</span>
                <span>{user.totalPoints}</span>
              </div>

              {/* Admin Gateway Pill */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-accent)] text-xs font-mono font-semibold hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                  <span>Admin</span>
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] hover:border-[var(--color-accent)] transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--color-accent)]" />
                )}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 min-h-[40px] pl-2 pr-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] hover:border-[var(--color-accent)] transition-colors text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#8B9BFF] to-[#46D9A0] flex items-center justify-center text-xs font-bold text-[#0C0F1F]">
                    {(user.displayName || user.username || 'S').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-[var(--text-main)] text-xs max-w-[110px] truncate">
                    {user.displayName || user.maskedPrn || user.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>

                {profileDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] shadow-xl py-1.5 z-50"
                  >
                    <div className="px-4 py-2 border-b border-[var(--border-line)] text-xs">
                      <p className="font-semibold text-[var(--text-main)] truncate">
                        {user.displayName || user.fullName}
                      </p>
                      <p className="text-[var(--text-muted)] font-mono text-xs truncate">
                        {user.maskedPrn || `@${user.username}`}
                      </p>
                    </div>

                    <Link
                      to={`/profile/${user.username}`}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>View Profile</span>
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                    >
                      <Code2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>My Submissions</span>
                    </Link>

                    {!isStandalone && (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] text-left"
                      >
                        <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>Install LogicQ</span>
                      </button>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--color-accent)] hover:bg-[var(--bg-surface)]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    {(isChecker || isAdmin) && (
                      <Link
                        to="/checker/reviews"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-400 hover:bg-[var(--bg-surface)]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>My Reviews (Checker)</span>
                      </Link>
                    )}

                    <div className="border-t border-[var(--border-line)] my-1"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--color-error)] hover:bg-[var(--bg-surface)] transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[var(--color-error)]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] hover:border-[var(--color-accent)] transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--color-accent)]" />
                )}
              </button>

              <Link
                to="/login"
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface)] border border-[var(--border-line)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-md transition-all font-mono"
              >
                Register Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Actions (minimum 44x44px tap targets) */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)]"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[var(--color-warning)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--color-accent)]" />
            )}
          </button>

          {user ? (
            <>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-warning)] text-xs font-mono">
                <Flame className="w-3.5 h-3.5 text-[var(--color-warning)]" />
                <span>{user.currentStreak}d</span>
              </div>
              <button
                type="button"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/login"
                className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-line)]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Only shown when authenticated) */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-b border-[var(--border-line)] bg-[var(--bg-panel)] px-4 pt-2 pb-6 space-y-3">
          <nav aria-label="Mobile Navigation" className="space-y-1">
            {appNavLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active
                      ? 'text-[var(--color-accent)] bg-[var(--bg-surface)] border border-[var(--color-accent)] font-semibold'
                      : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--border-line)] pt-3 space-y-1">
            <div className="flex items-center justify-between px-3 py-1 text-xs font-mono text-[var(--text-muted)]">
              <span>{user.maskedPrn || `@${user.username}`}</span>
              <span className="text-[var(--color-accent)] font-bold">{user.totalPoints} PTS</span>
            </div>
            <Link
              to={`/profile/${user.username}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
            >
              My Profile
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
            >
              Submission History
            </Link>
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--color-accent)] hover:bg-[var(--bg-surface)] text-left"
              >
                <Download className="w-4 h-4" />
                <span>Install LogicQ</span>
              </button>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--color-accent)] hover:bg-[var(--bg-surface)]"
              >
                Admin Portal
              </Link>
            )}
            {(isChecker || isAdmin) && (
              <Link
                to="/checker/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-emerald-400 hover:bg-[var(--bg-surface)]"
              >
                My Reviews (Checker)
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center min-h-[44px] text-left px-3 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-[var(--bg-surface)]"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
