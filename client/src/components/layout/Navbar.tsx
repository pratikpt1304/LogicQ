import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Logo } from '../common/Logo.js';
import { CommandPalette } from '../common/CommandPalette.js';
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
  KeyRound,
  Download,
  BookOpen,
  Sparkles,
  FileCode2,
  Brain,
  Search,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, isFaculty, isChecker, logout } = useAuth();
  const isStudent = !isFaculty && !isAdmin;
  const { theme, toggleTheme } = useTheme();
  const isStandalone = useIsStandalonePwa();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener (Students only)
  useEffect(() => {
    if (!isStudent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudent]);

  const isActive = (path: string) => {
    if (path === '/challenge' || path === '/daily') {
      return location.pathname === '/challenge' || location.pathname.startsWith('/challenge/') || location.pathname === '/daily';
    }
    if (path === '/practice') {
      return location.pathname === '/practice' || location.pathname.startsWith('/practice/');
    }
    if (path === '/lab-internal') {
      return location.pathname === '/lab-internal' || location.pathname.startsWith('/lab-internal/');
    }
    if (path === '/student/tests') {
      return location.pathname === '/student/tests' || location.pathname.startsWith('/exam/');
    }
    if (path === '/analytics') {
      return location.pathname === '/analytics' || location.pathname.startsWith('/student/analytics');
    }
    return location.pathname === path;
  };

  // Signed-in navbar items: Students see learning modules, Admin/Faculty see instructor/management links
  const appNavLinks = isStudent
    ? [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Daily Challenge', path: '/challenge', icon: Calendar },
        { label: 'Practice', path: '/practice', icon: Code2 },
        { label: 'Lab Internal', path: '/lab-internal', icon: BookOpen },
        { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      ]
    : [
        { label: 'Dashboard', path: '/dashboard', icon: Home },
        { label: 'Sections', path: '/faculty/sections', icon: BookOpen },
        { label: 'Question Bank', path: '/faculty/questions', icon: Sparkles },
        { label: 'Tests', path: '/faculty/tests', icon: FileCode2 },
        ...(isAdmin ? [{ label: 'Admin Console', path: '/admin', icon: ShieldCheck }] : []),
        { label: 'Analytics', path: '/faculty/analytics', icon: Brain },
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

        {/* Desktop Navigation (Home, Daily Challenge, Practice, Leaderboard) - only for signed-in students */}
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
              {/* Global Command Palette Search Pill (Students only) */}
              {isStudent && (
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] hover:border-indigo-500/50 text-[var(--text-muted)] hover:text-[var(--text-main)] transition text-xs font-mono shadow-sm group"
                  title="Search topics & actions (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline">Search...</span>
                  <kbd className="text-[10px] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-line)] text-[var(--text-muted)]">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* User Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
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
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    {/* User Header */}
                    <div className="px-3.5 py-2.5 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/50">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-[var(--text-main)] text-xs truncate">
                          {user.displayName || user.fullName || user.username}
                        </p>
                        {isAdmin ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider shrink-0">
                            Admin
                          </span>
                        ) : isFaculty ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider shrink-0">
                            Faculty
                          </span>
                        ) : isChecker ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                            Evaluator
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider shrink-0">
                            Student
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] font-mono text-[11px] truncate">
                        {user.maskedPrn || user.email || `@${user.username}`}
                      </p>

                      {/* Student Stats Badges (Streak & Total Points) inside Profile Dropdown */}
                      {isStudent && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-line)]/60 font-mono text-[11px]">
                          <div
                            title="Daily Streak"
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 dark:text-amber-400 font-semibold"
                          >
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                            <span>{user.currentStreak}d streak</span>
                          </div>
                          <div
                            title="Total Points"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-500 dark:text-indigo-400 font-semibold"
                          >
                            <span className="text-[10px] text-slate-400">PTS</span>
                            <span>{user.totalPoints}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="max-h-[80vh] overflow-y-auto py-1 divide-y divide-[var(--border-line)]">
                      {/* Section 1: Account & Learning */}
                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {isStudent ? 'My Learning' : 'Account'}
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>View Profile</span>
                        </Link>

                        {isStudent && (
                          <>
                            <Link
                              to="/student/tests"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                            >
                              <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>My Assigned Tests</span>
                            </Link>

                            <Link
                              to="/history"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                            >
                              <Code2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>My Submissions</span>
                            </Link>

                            <Link
                              to="/analytics"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                            >
                              <Brain className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                              <span>Learning Analytics</span>
                            </Link>

                            {!isStandalone && (
                              <button
                                type="button"
                                onClick={handleInstallClick}
                                className="w-[calc(100%-8px)] flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors text-left"
                              >
                                <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                                <span>Install LogicQ App</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Section 2: Faculty Suite */}
                      {isFaculty && (
                        <div className="py-1">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            Faculty Portal
                          </div>
                          <Link
                            to="/faculty/sections"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Sections & Rosters</span>
                          </Link>
                          <Link
                            to="/faculty/questions"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Question Bank & AI</span>
                          </Link>
                          <Link
                            to="/faculty/tests"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                          >
                            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Assign Tests</span>
                          </Link>
                          <Link
                            to="/faculty/analytics"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                          >
                            <Brain className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Cohort Analytics</span>
                          </Link>
                        </div>
                      )}

                      {/* Section 3: Administration & Evaluation */}
                      {(isAdmin || isChecker) && (
                        <div className="py-1">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Administration
                          </div>
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>Admin Dashboard</span>
                            </Link>
                          )}

                        </div>
                      )}

                      {/* Change Password Button */}
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            const key = `logicq_pw_change_${user?.id || 'u'}`;
                            try {
                              const raw = localStorage.getItem(key);
                              const data = raw ? JSON.parse(raw) : { count: 0, weekStart: Date.now() };
                              const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
                              const now = Date.now();
                              if (now - data.weekStart > oneWeekMs) {
                                data.count = 0;
                                data.weekStart = now;
                              }
                              if (data.count >= 2) {
                                alert('You can only change your password 2 times per week. Please try again next week.');
                                return;
                              }
                              const np = prompt('Enter your new password (min 6 characters):');
                              if (!np || np.length < 6) { alert('Password must be at least 6 characters.'); return; }
                              const np2 = prompt('Confirm new password:');
                              if (np !== np2) { alert('Passwords do not match.'); return; }
                              fetch('/api/auth/change-password', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('logicq_token')}` },
                                body: JSON.stringify({ newPassword: np }),
                              })
                                .then((r) => r.json())
                                .then((res) => {
                                  if (res.success || res.message) {
                                    data.count++;
                                    localStorage.setItem(key, JSON.stringify(data));
                                    alert(`Password changed successfully! You have ${2 - data.count} change(s) left this week.`);
                                  } else {
                                    alert(res.error || 'Failed to change password. Please try again.');
                                  }
                                })
                                .catch(() => alert('Network error. Please try again.'));
                            } catch { alert('Something went wrong. Please try again.'); }
                          }}
                          className="w-[calc(100%-8px)] flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors text-left group"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-cyan-500 group-hover:rotate-12 transition-transform" />
                          <span className="font-medium">Change Password</span>
                          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">2/week</span>
                        </button>
                      </div>

                      {/* Theme Toggle (Inside profile menu, directly above Sign Out) */}
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => toggleTheme()}
                          className="w-[calc(100%-8px)] flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            {theme === 'dark' ? (
                              <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
                            ) : (
                              <Moon className="w-3.5 h-3.5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
                            )}
                            <span className="font-medium">
                              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)] group-hover:border-indigo-400/40 transition-colors">
                            {theme === 'dark' ? 'Switch' : 'Switch'}
                          </span>
                        </button>
                      </div>

                      {/* Section 4: Sign Out */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-[calc(100%-8px)] flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-md mx-1 transition-colors text-left font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5 text-[var(--color-error)]" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
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
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-md transition-all font-mono"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Actions (minimum 44x44px tap targets) */}
        <div className="flex md:hidden items-center gap-2">
          {!user && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] active:scale-95 transition-transform"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[var(--color-warning)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--color-accent)]" />
              )}
            </button>
          )}

          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono shadow-sm"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-surface)] active:scale-95 transition-transform"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Accessible to everyone) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-line)] bg-[var(--bg-panel)] px-4 pt-2 pb-6 space-y-3">
          {user && (
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
          )}

          <div className="border-t border-[var(--border-line)] pt-3 space-y-1">
            {user ? (
              <>
                <div className="flex items-center justify-between px-3 py-1 text-xs font-mono text-[var(--text-muted)]">
                  <span>{user.maskedPrn || user.displayName || (isAdmin ? 'Admin' : isFaculty ? 'Faculty' : 'Student')}</span>
                  {isStudent && (
                    <span className="text-[var(--color-accent)] font-bold">{user.totalPoints} PTS</span>
                  )}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                >
                  My Profile
                </Link>
                {isStudent && (
                  <>
                    <Link
                      to="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                    >
                      Submission History
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-cyan-400 hover:bg-[var(--bg-surface)]"
                    >
                      Analytics & Reports
                    </Link>
                  </>
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
                {isFaculty && (
                  <>
                    <Link
                      to="/faculty/sections"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-[var(--bg-surface)]"
                    >
                      Sections & Rosters
                    </Link>
                    <Link
                      to="/faculty/questions"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-purple-400 hover:bg-[var(--bg-surface)]"
                    >
                      Question Bank & AI
                    </Link>
                    <Link
                      to="/faculty/tests"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-cyan-400 hover:bg-[var(--bg-surface)]"
                    >
                      Assign Tests
                    </Link>
                    <Link
                      to="/faculty/analytics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-[var(--bg-surface)]"
                    >
                      Faculty Analytics
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between min-h-[44px] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface)] text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-medium">
                      Theme ({theme === 'dark' ? 'Dark Mode' : 'Light Mode'})
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)] font-mono">
                    {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center min-h-[44px] text-left px-3 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-[var(--bg-surface)]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            )}
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
          </div>
        </div>
      )}
      {/* Global Apple/Raycast-style Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </header>
  );
};
