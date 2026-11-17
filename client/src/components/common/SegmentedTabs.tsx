import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

interface SegmentedTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeId,
  onChange,
  layoutId = 'segmented-tab-pill',
  className = '',
  size = 'md',
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-xs sm:text-sm';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 relative select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            type="button"
            className={`relative z-10 flex items-center justify-center gap-2 font-semibold transition-colors duration-200 cursor-pointer rounded-xl ${sizeClasses} ${
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300'
                    : 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}

            {/* Apple / Linear Spring Sliding Pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 -z-1"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
