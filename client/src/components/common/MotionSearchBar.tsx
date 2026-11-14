import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mic, MicOff, Loader2, Sparkles, ArrowRight } from 'lucide-react';

export interface MotionSuggestionItem {
  id: string;
  title: string;
  category?: string;
  subtitle?: string;
  onClick: () => void;
}

interface MotionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: MotionSuggestionItem[];
  isLoading?: boolean;
  className?: string;
  expandable?: boolean;
  onSelectSuggestion?: (item: MotionSuggestionItem) => void;
}

/**
 * Highlights matching letters within a string using bold text.
 */
export const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
};

export const MotionSearchBar: React.FC<MotionSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  suggestions = [],
  isLoading = false,
  className = '',
  expandable = false,
  onSelectSuggestion,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Voice Search (Web Speech API)
  const toggleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice Search is supported in Chrome, Edge, and Safari browsers.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onChange(transcript);
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions.length > 0 && isFocused) {
      const active = suggestions[selectedSuggestionIdx];
      if (active) {
        e.preventDefault();
        active.onClick();
        setIsFocused(false);
      }
    }
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 5. Focus Morph: Container morphs with glow and elevated shadow */}
      <motion.div
        layout
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className={`relative flex items-center rounded-2xl transition-all ${
          isFocused
            ? 'ring-2 ring-indigo-500/30 border-indigo-500 bg-white dark:bg-slate-900 shadow-lg shadow-indigo-500/10'
            : 'border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        {/* Search Icon / 6. Search Loading spinner */}
        <div className="pl-3.5 pr-2 flex items-center justify-center shrink-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          ) : (
            <Search
              className={`w-4 h-4 transition-colors ${
                isFocused ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`}
            />
          )}
        </div>

        {/* 1. Icon Expand & Input text */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening... Speak now' : placeholder}
          className={`w-full py-2 bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all ${
            isListening ? 'placeholder-rose-500 animate-pulse' : ''
          }`}
        />

        {/* Right Controls: 3. Clear Field + 4. Voice Search */}
        <div className="pr-2 flex items-center gap-1 shrink-0">
          {/* Clear Field Button (Falls away / Pops in) */}
          <AnimatePresence>
            {value && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                onClick={handleClear}
                title="Clear input"
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* 4. Voice Search with Pulsing Concentric Sound Waves */}
          <button
            type="button"
            onClick={toggleVoiceSearch}
            title={isListening ? 'Stop listening' : 'Voice search'}
            className={`relative p-1.5 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-xl bg-rose-500 animate-ping opacity-50" />
            )}
            {isListening ? (
              <MicOff className="w-3.5 h-3.5 relative z-10" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Cancel badge on focus */}
          {isFocused && (
            <motion.button
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              type="button"
              onClick={() => {
                setIsFocused(false);
                inputRef.current?.blur();
              }}
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              ESC
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* 2. Live Suggestions Dropdown: drops in one-by-one with staggered entrance */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl overflow-hidden p-1.5 space-y-0.5 max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Suggested Matches</span>
              <span>{suggestions.length} available</span>
            </div>

            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedSuggestionIdx;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                  onClick={() => {
                    item.onClick();
                    setIsFocused(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">
                      <HighlightMatch text={item.title} query={value} />
                    </span>
                    {item.category && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
