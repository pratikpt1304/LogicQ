import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Home,
  Calendar,
  Code2,
  Trophy,
  User as UserIcon,
  BookOpen,
  FileCode2,
  Brain,
  ShieldCheck,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user, isAdmin, isFaculty } = useAuth();
  const location = useLocation();
  const isStudent = !isFaculty && !isAdmin;

  // Do not show on unauthenticated views or during high-stakes exam workspaces
  if (!user) return null;
  if (
    location.pathname.startsWith('/exam/') ||
    location.pathname.startsWith('/mini-project/')
  ) {
    return null;
  }

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
    if (path === '/faculty/sections') {
      return location.pathname.startsWith('/faculty/sections');
    }
    if (path === '/faculty/tests') {
      return location.pathname.startsWith('/faculty/tests');
    }
    if (path === '/faculty/analytics') {
      return location.pathname.startsWith('/faculty/analytics');
    }
    if (path === '/admin') {
      return location.pathname.startsWith('/admin');
    }
    if (path === '/profile') {
      return location.pathname.startsWith('/profile');
    }
    return location.pathname === path;
  };

  const navItems = isStudent
    ? [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Daily', path: '/challenge', icon: Calendar },
        { label: 'Practice', path: '/practice', icon: Code2 },
        { label: 'Lab', path: '/lab-internal', icon: BookOpen },
        { label: 'Ranks', path: '/leaderboard', icon: Trophy },
      ]
    : isAdmin
    ? [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Admin', path: '/admin', icon: ShieldCheck },
        { label: 'Sections', path: '/faculty/sections', icon: BookOpen },
        { label: 'Tests', path: '/faculty/tests', icon: FileCode2 },
        { label: 'Profile', path: '/profile', icon: UserIcon },
      ]
    : [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Sections', path: '/faculty/sections', icon: BookOpen },
        { label: 'Tests', path: '/faculty/tests', icon: FileCode2 },
        { label: 'Analytics', path: '/faculty/analytics', icon: Brain },
        { label: 'Profile', path: '/profile', icon: UserIcon },
      ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-panel)]/95 backdrop-blur-xl border-t border-[var(--border-line)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-colors pb-[max(env(safe-area-inset-bottom,0px),6px)] pt-1.5"
    >
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all select-none min-h-[48px] relative ${
                active
                  ? 'text-[var(--color-accent)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] active:scale-95'
              }`}
            >
              {active && (
                <span className="absolute top-0 w-8 h-1 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
              )}
              <div
                className={`p-1 rounded-lg transition-transform ${
                  active ? 'scale-110' : ''
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] tracking-tight leading-none mt-0.5 font-medium truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
