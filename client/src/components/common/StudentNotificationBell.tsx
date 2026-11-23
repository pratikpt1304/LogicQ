import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, CheckCircle2, Flag, Sparkles, X, ChevronRight, Clock, ShieldCheck, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { db } from '../../config/firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { StudentIssuesModal } from './StudentIssuesModal.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { IssueSyncService } from '../../services/issueSync.service.js';

interface NotificationItem {
  id: string;
  type: 'ISSUE_RESOLVED' | 'ISSUE_OPEN' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  questionId?: string;
}

export const StudentNotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isIssuesModalOpen, setIsIssuesModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanPrn = (user?.prn || '').toUpperCase().trim();
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userId = user?.id || '';

  const readStorageKey = `logicq_read_notifications_${cleanPrn || userId}`;
  const dismissedStorageKey = `logicq_dismissed_notifications_${cleanPrn || userId}`;

  const getReadIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(readStorageKey) || '[]');
    } catch {
      return [];
    }
  };

  const getDismissedIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(dismissedStorageKey) || '[]');
    } catch {
      return [];
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(allIds));
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (notifId: string) => {
    try {
      const existing = new Set<string>(getDismissedIds());
      existing.add(notifId);
      localStorage.setItem(dismissedStorageKey, JSON.stringify(Array.from(existing)));
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleClearAll = () => {
    try {
      const existing = new Set<string>(getDismissedIds());
      notifications.forEach((n) => existing.add(n.id));
      localStorage.setItem(dismissedStorageKey, JSON.stringify(Array.from(existing)));
    } catch {}
    setNotifications([]);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Load and listen to raised_issues for notifications (Supabase Realtime + Mesh)
  useEffect(() => {
    if (!cleanPrn && !userEmail && !userId) return;

    const unsub = IssueSyncService.listenToStudentIssues(cleanPrn, userEmail, userId, (issues) => {
      const readIds = getReadIds();
      const items: NotificationItem[] = [];

      issues.forEach((data) => {
        const isResolved = data.status === 'RESOLVED';
        const notifId = `issue-${data.id}-${data.status}`;

        items.push({
          id: notifId,
          type: isResolved ? 'ISSUE_RESOLVED' : 'ISSUE_OPEN',
          title: isResolved
            ? `Faculty Resolved: ${data.questionTitle || 'Reported Problem'}`
            : `Issue Under Review: ${data.questionTitle || 'Reported Problem'}`,
          description: isResolved
            ? (`Verified & resolved by faculty (${data.resolvedBy || 'Faculty Team'}).`)
            : 'Your issue has been queued for faculty review.',
          timestamp: data.resolvedAt || data.createdAt || new Date().toISOString(),
          read: readIds.includes(notifId),
          questionId: data.questionId,
        });
      });

      // Always add a baseline system welcome / clean status
      items.push({
        id: 'system-proctor-clean',
        type: 'SYSTEM',
        title: 'Institutional Anti-Cheat Guard',
        description: 'Your proctoring integrity profile is active and verified clean.',
        timestamp: new Date().toISOString(),
        read: true,
      });

      const dismissedIds = new Set(getDismissedIds());
      const visibleItems = items.filter((item) => !dismissedIds.has(item.id));
      visibleItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(visibleItems);
    });

    return () => {
      unsub();
    };
  }, [cleanPrn, userEmail, userId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-slate-200/50 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/10 transition-all text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 shadow-xs"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Notifications
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} new update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No New Notifications</p>
                <p className="text-[11px]">When faculty resolves your issues or updates tests, you will see alerts here.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isResolved = item.type === 'ISSUE_RESOLVED';
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !item.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isResolved
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : item.type === 'ISSUE_OPEN'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : item.type === 'ISSUE_OPEN' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-1 shrink-0">
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(item.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete this notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer action */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsIssuesModalOpen(true);
              }}
              className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Track All My Reported Issues</span>
            </button>
          </div>
        </div>
      )}

      {/* Reported Issues Modal */}
      <StudentIssuesModal
        isOpen={isIssuesModalOpen}
        onClose={() => setIsIssuesModalOpen(false)}
      />
    </div>
  );
};
