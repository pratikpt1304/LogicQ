import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';
import { signInWithPopup } from 'firebase/auth';
import { auth as firebaseAuth, googleAuthProvider } from '../config/firebase.js';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    college?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes for shared lab computers

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res?.success && res?.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { identifier, password });
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Login failed');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const cred = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    const res = await api.post('/auth/google', {
      idToken,
      email: cred.user.email,
      fullName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Challenger',
      avatarUrl: cred.user.photoURL,
      googleUid: cred.user.uid,
    });
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Google sign-in failed');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    college?: string;
  }): Promise<User> => {
    const res = await api.post('/auth/register', data);
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Registration failed');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      await firebaseAuth.signOut().catch(() => {});
    } finally {
      setUser(null);
    }
  };

  const logoutAllDevices = async () => {
    try {
      await api.post('/auth/logout-all');
      await firebaseAuth.signOut().catch(() => {});
    } finally {
      setUser(null);
    }
  };

  // Shared lab safety: 30-minute idle timeout auto-logout
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user]);

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        login,
        loginWithGoogle,
        register,
        logout,
        logoutAllDevices,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
