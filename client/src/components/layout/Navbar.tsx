import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Logo } from '../common/Logo.js';
import {
  Flame,
  Trophy,
  Code2,
  Calendar,
  Award,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Swords,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { label: 'Daily Challenge', path: '/challenge', icon: Calendar },
    { label: 'Archive', path: '/archive', icon: Code2 },
    { label: 'Arena', path: '/arena', icon: Swords },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Badges', path: '/achievements', icon: Award },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-dark-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Logo size="md" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  active
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Stats & User or Auth CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Daily Streak Pill */}
              <div
                title="Current Daily Challenge Streak"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
                <span>{user.currentStreak}d streak</span>
              </div>

              {/* Total Points Pill */}
              <div
                title="Total LogicQ Score"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold"
              >
                <span className="text-[10px] text-cyan-400">PTS</span>
                <span>{user.totalPoints}</span>
              </div>

              {/* Admin Gateway Pill */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold hover:bg-purple-500/25 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Admin
                </Link>
              )}

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full bg-dark-850 border border-slate-700/60 hover:border-slate-500 transition-all text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-dark-950">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-200 text-xs max-w-[100px] truncate">
                    {user.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-dark-900 border border-slate-700/80 shadow-2xl py-1 z-50 backdrop-blur-xl">
                    <div className="px-4 py-2 border-b border-slate-800 text-xs">
                      <p className="font-semibold text-white truncate">{user.fullName}</p>
                      <p className="text-slate-400 font-mono text-[11px] truncate">@{user.username}</p>
                    </div>

                    <Link
                      to={`/profile/${user.username}`}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05]"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      View Profile
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05]"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      My Submissions
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-purple-300 hover:bg-purple-500/10"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-slate-800 mt-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all font-mono"
              >
                Register Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
              <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
              <span>{user.currentStreak}d</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.05]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/[0.08] bg-dark-900/95 px-4 pt-2 pb-6 space-y-3 backdrop-blur-2xl">
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.path)
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 pt-3 space-y-2">
            {user ? (
              <>
                <div className="flex items-center justify-between px-3 py-1 text-xs font-mono text-slate-400">
                  <span>@{user.username}</span>
                  <span className="text-cyan-400">{user.totalPoints} PTS</span>
                </div>
                <Link
                  to={`/profile/${user.username}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05]"
                >
                  My Profile
                </Link>
                <Link
                  to="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05]"
                >
                  Submission History
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-purple-300 hover:bg-purple-500/10"
                  >
                    Admin Portal
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 text-center rounded-lg text-sm font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 text-center rounded-lg text-sm font-semibold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono"
                >
                  Register Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
