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
  Flame,
  CheckCircle2,
  Command,
  X,
  Sparkles,
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

  // Static quick actions
  const quickActions = useMemo(() => [
    {
      id: 'nav-home',
      category: 'Navigation',
      title: 'Home Dashboard',
      subtitle: 'View overall progress and recent activity',
      icon: Home,
      action: () => { navigate('/dashboard'); onClose(); },
    },
    {
      id: 'nav-daily',
      category: 'Navigation',
      title: 'Daily Practice Arena',
      subtitle: 'Browse 100 curated C problems & daily challenges',
      icon: Calendar,
      action: () => { navigate('/daily'); onClose(); },
    },
    {
      id: 'nav-lab',
      category: 'Navigation',
      title: 'Lab Internal Exam',
      subtitle: 'Proctored academic C programming examinations',
      icon: BookOpen,
      action: () => { navigate('/lab-internal'); onClose(); },
    },
    {
      id: 'nav-leaderboard',
      category: 'Navigation',
      title: 'College Leaderboard',
      subtitle: 'Check ranks, streaks, and university standings',
      icon: Trophy,
      action: () => { navigate('/leaderboard'); onClose(); },
    },
    {
      id: 'action-theme',
      category: 'Quick Action',
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
    }).slice(0, 15);
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
      category: topic.moduleTitle.split(':')[0] || 'Topic Practice',
      title: topic.topicTitle,
      subtitle: `${topic.problem.title} • ${topic.problem.difficulty}`,
      difficulty: topic.problem.difficulty,
      icon: Code2,
      action: () => {
        if (onSelectTopic) {
          onSelectTopic(topic);
        } else {
          navigate('/practice');
          try {
            localStorage.setItem('logicq_last_topic_id', topic.id);
          } catch {}
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
        <div className="fixed inset-0 z-[9999999] flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10 max-h-[75vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/50 gap-3">
              <Search className="w-5 h-5 text-indigo-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search all 100 topics, commands, or navigation... (e.g. pointers, kadane, loop)"
                className="w-full bg-transparent text-sm font-sans text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-muted)]">
                <kbd>ESC</kbd>
              </div>
            </div>

            {/* Results List */}
            <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
              {allItems.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                  <Code2 className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs">Try searching for loops, kadane, structs, or navigation</p>
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
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate text-[var(--text-main)]">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)] shrink-0">
                              {item.category}
                            </span>
                            {Boolean((item as any).difficulty) && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                  (item as any).difficulty === 'HARD'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : (item as any).difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {String((item as any).difficulty)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0 pl-2">
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1 text-indigo-400 font-mono text-[11px] font-bold"
                          >
                            <span>Jump</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="px-4 py-2 border-t border-[var(--border-line)] bg-[var(--bg-surface)]/50 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">↵</kbd>
                  <span>Open</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-indigo-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100 Curated Problems</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
