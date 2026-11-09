import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Logo } from '../common/Logo.js';
import { CommandPalette } from '../common/CommandPalette.js';
import { ChangePasswordModal } from '../common/ChangePasswordModal.js';
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
  CheckCircle2,
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
  const isMasterAdmin = Boolean(isAdmin || user?.role === 'ADMIN' || user?.email?.toLowerCase() === 'logicqarena@gmail.com' || user?.prn === 'LOGICQARENA');
  const isFacultyUser = (isFaculty || user?.role === 'FACULTY') && user?.prn !== '2126PMIM1039' && !isMasterAdmin;
  const isStudent = !isFacultyUser && !isMasterAdmin;
  const { theme, toggleTheme } = useTheme();
  const isStandalone = useIsStandalonePwa();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
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
        if (path === '/practice') {
      return location.pathname === '/practice' || location.pathname.startsWith('/practice/');
    }
    if (path === '/lab-internal') {
      return location.pathname === '/lab-internal' || location.pathname.startsWith('/lab-internal/');
    }
    if (path === '/student/tests') {
      return location.pathname === '/student/tests' || location.pathname.startsWith('/exam/');
    }
    if (path === '/history') {
      return location.pathname === '/history';
    }
    if (path === '/analytics') {
      return location.pathname === '/analytics' || location.pathname.startsWith('/student/analytics');
    }
    return location.pathname === path;
  };

  // Signed-in navbar items: Students see learning modules, Admin/Faculty see instructor/management links
  const appNavLinks = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Practice', path: '/practice', icon: Code2 },
    { label: 'Lab Internal', path: '/lab-internal', icon: BookOpen },
    { label: 'Submissions', path: '/history', icon: FileCode2 },
    { label: 'Analytics', path: '/analytics', icon: Brain },
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
      className="sticky top-0 z-50 w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-white/85 dark:bg-[#0c0f14]/85 backdrop-blur-xl text-slate-900 dark:text-white transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand (links to /dashboard when signed in, / when signed out) */}
        <Logo size="md" to={user ? (isAdmin || user?.email?.toLowerCase() === 'logicqarena@gmail.com' ? '/admin' : '/dashboard') : '/'} />

        {/* Desktop Navigation (Apple HIG Segmented Capsule) */}
        {user && (
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center p-1 rounded-full bg-slate-200/50 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.05] shadow-xs">
            {appNavLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 whitespace-nowrap select-none active:scale-[0.98] ${
                    active
                      ? 'bg-white dark:bg-[#1c2230] text-blue-600 dark:text-blue-400 shadow-xs font-bold border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition text-xs font-medium shadow-xs select-none active:scale-95"
                  title="Search topics & actions (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline text-xs">Search...</span>
                  <kbd className="text-[10px] font-mono bg-white dark:bg-white/10 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* Admin Console Indicator Badge */}
              {isMasterAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Admin Master Console</span>
                </span>
              )}

              {/* User Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/10 transition-all text-xs font-medium select-none active:scale-95 shadow-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                    {(user.displayName || user.username || 'S').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[110px] truncate">
                    {user?.prn === '2126PMIM1039' ? 'Pratik Thorat' : (user.displayName || user.maskedPrn || user.username)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] shadow-lg p-2.5 z-50 animate-in fade-in duration-100"
                  >
                    {/* User Card */}
                    <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
                          {(user.displayName || user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                              {user?.prn === '2126PMIM1039' ? 'Pratik Thorat' : (user.displayName || user.fullName || user.username)}
                            </p>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                              'Student'
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate mt-0.5">
                            {user.maskedPrn || user.email || `@${user.username}`}
                          </p>
                        </div>
                      </div>

                      {/* Student Stats Pill Strip */}
                      {isStudent && (
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{Math.max(user?.totalSolved || 0, (() => { try { const s = localStorage.getItem('logicq_solved_practice_topics'); return s ? JSON.parse(s).length : 0; } catch { return 0; } })())} Solved</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Active</span>
                        </div>
                      )}
                    </div>

                    {/* Apple Style Menu Items */}
                    <div className="space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>View Profile</span>
                      </Link>

                      {isStudent && (
                        <>
                          <Link
                            to="/student/tests"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <FileCode2 className="w-4 h-4 text-indigo-500" />
                            <span>My Assigned Tests</span>
                          </Link>



                          {!isStandalone && (
                            <button
                              type="button"
                              onClick={handleInstallClick}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer text-left"
                            >
                              <Download className="w-4 h-4 text-teal-500" />
                              <span>Install LogicQ App</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Faculty Items */}
                      {isFaculty && (
                        <>
                          <div className="pt-1.5 pb-1 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">
                            Faculty Portal
                          </div>
                          <Link
                            to="/faculty/sections"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <span>Sections & Rosters</span>
                          </Link>
                          <Link
                            to="/faculty/questions"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span>Question Bank & AI</span>
                          </Link>
                          <Link
                            to="/faculty/tests"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <FileCode2 className="w-4 h-4 text-cyan-500" />
                            <span>Assign Tests</span>
                          </Link>
                          <Link
                            to="/faculty/analytics"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <Brain className="w-4 h-4 text-indigo-500" />
                            <span>Cohort Analytics</span>
                          </Link>
                        </>
                      )}

                      

                      {/* Preferences Section */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setIsChangePasswordModalOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            <span>Change Password</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTheme()}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            {theme === 'dark' ? (
                              <Sun className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Moon className="w-4 h-4 text-indigo-500" />
                            )}
                            <span>Appearance</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold">
                            {theme === 'dark' ? 'Dark' : 'Light'}
                          </span>
                        </button>
                      </div>

                      {/* Sign Out */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shadow-xs"
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
              className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shadow-xs"
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
                  className="w-full flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shadow-xs"
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
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </header>
  );
};
