import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Code2,
  Calendar,
  Trophy,
  BookOpen,
  Home,
  Sun,
  Moon,
  ArrowRight,
  CheckCircle2,
  Command,
  X,
  Sparkles,
  Brain,
  History,
  User,
  ShieldCheck,
} from 'lucide-react';
import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../../data/topic-practice.data.js';
import { useTheme } from '../../context/ThemeContext.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic?: (topic: TopicPracticeItem) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTopic,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static quick actions with Apple HIG iconography
  const quickActions = useMemo(() => [
    {
      id: 'nav-practice',
      category: 'Curriculum',
      title: 'Practice Hub (100 C Topics)',
      subtitle: 'Structured modules with compiler sandbox and test tips',
      icon: Code2,
      action: () => { navigate('/practice'); onClose(); },
    },
    {
      id: 'nav-analytics',
      category: 'Insights',
      title: 'Learning Analytics',
      subtitle: 'Review academic marks, question progress, and telemetry',
      icon: Brain,
      action: () => { navigate('/analytics'); onClose(); },
    },
    {
      id: 'nav-lab',
      category: 'Examinations',
      title: 'Lab Internal Exam',
      subtitle: 'Proctored continuous evaluation coursework',
      icon: BookOpen,
      action: () => { navigate('/lab-internal'); onClose(); },
    },
    {
      id: 'nav-history',
      category: 'Records',
      title: 'Submission History',
      subtitle: 'Verified test runs, compiler output, and AC evaluations',
      icon: History,
      action: () => { navigate('/history'); onClose(); },
    },
    {
      id: 'nav-leaderboard',
      category: 'Standings',
      title: 'College Leaderboard',
      subtitle: 'Check ranks, scores, and university standings',
      icon: Trophy,
      action: () => { navigate('/leaderboard'); onClose(); },
    },
    {
      id: 'nav-profile',
      category: 'Identity',
      title: 'Profile & Settings',
      subtitle: 'Manage PRN, bound email, and Google Drive backup',
      icon: User,
      action: () => { navigate('/profile'); onClose(); },
    },
    {
      id: 'action-theme',
      category: 'Appearance',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle platform aesthetic',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { toggleTheme(); onClose(); },
    },
  ], [navigate, onClose, theme, toggleTheme]);

  // Filtered practice topics (matching title, topic, module, difficulty)
  const matchedTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return top 8 suggested topics
      return TOPIC_PRACTICE_DATA.slice(0, 8);
    }
    return TOPIC_PRACTICE_DATA.filter((t) => {
      return (
        t.topicTitle.toLowerCase().includes(q) ||
        t.problem.title.toLowerCase().includes(q) ||
        t.moduleTitle.toLowerCase().includes(q) ||
        t.problem.difficulty.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q)
      );
    }).slice(0, 16);
  }, [query]);

  // Combined selectable items list for keyboard navigation
  const allItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredActions = q
      ? quickActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        )
      : quickActions;

    const topicItems = matchedTopics.map((topic) => ({
      id: `topic-${topic.id}`,
      category: `Module ${topic.moduleIndex}`,
      title: topic.topicTitle,
      subtitle: `${topic.problem.title} • ${topic.problem.difficulty}`,
      difficulty: topic.problem.difficulty,
      icon: Code2,
      action: () => {
        if (onSelectTopic) {
          onSelectTopic(topic);
        } else {
          try {
            localStorage.setItem('logicq_last_topic_id', topic.id);
          } catch {}
          navigate(`/practice?topic=${topic.id}`);
        }
        onClose();
      },
    }));

    return [...filteredActions, ...topicItems];
  }, [query, quickActions, matchedTopics, onSelectTopic, navigate, onClose]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999999] flex items-start justify-center pt-16 sm:pt-24 px-4 font-sans">
          {/* Apple Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
          />

          {/* Apple Spotlight Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10 max-h-[75vh]"
          >
            {/* Search Input Bar (macOS Spotlight Style) */}
            <div className="flex items-center px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/60 gap-3">
              <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search all 100 topics, pointers, arrays, modules, or pages..."
                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                <kbd>ESC</kbd>
              </div>
            </div>

            {/* Results List */}
            <div ref={listRef} className="overflow-y-auto p-2.5 space-y-1">
              {allItems.length === 0 ? (
                <div className="py-14 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Code2 className="w-9 h-9 mx-auto opacity-30" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs">Try searching for pointers, functions, arrays, recursion, or analytics</p>
                </div>
              ) : (
                allItems.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      data-selected={isSelected}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                              {item.category}
                            </span>
                            {Boolean((item as any).difficulty) && (
                              <span
                                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  (item as any).difficulty === 'HARD'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : (item as any).difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {String((item as any).difficulty)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 pl-2">
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Apple Style Footer Shortcut Bar */}
            <div className="px-5 py-3 border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">↵</kbd>
                  <span>Open</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100 Curriculum Topics</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
