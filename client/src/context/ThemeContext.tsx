import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('logicq_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return getSystemTheme();
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  const meta = document.getElementById('meta-theme-color');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0C0F1F' : '#F4F6FB');
  }
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Synchronize with Firestore profile when user is authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        // Read active user cache to see if theme preference is stored on account
        try {
          const raw = localStorage.getItem('logicq_active_user');
          if (raw) {
            const user = JSON.parse(raw);
            if (user?.themePreference === 'light' || user?.themePreference === 'dark') {
              if (user.themePreference !== theme) {
                setThemeState(user.themePreference);
                applyThemeToDocument(user.themePreference);
                localStorage.setItem('logicq_theme', user.themePreference);
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('logicq_theme');
        if (saved !== 'dark' && saved !== 'light') {
          setThemeState(e.matches ? 'dark' : 'light');
        }
      } catch {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    try {
      localStorage.setItem('logicq_theme', nextTheme);
    } catch {
      // Ignore storage quota/privacy errors
    }
    applyThemeToDocument(nextTheme);
    setThemeState(nextTheme);

    // Sync themePreference to Firestore users/{userId} if signed in
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      updateDoc(userRef, {
        themePreference: nextTheme,
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Offline or rule update failed gracefully
      });
    }
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
