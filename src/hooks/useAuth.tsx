import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase/errors';
import { DEFAULT_PREFERENCES, ensureUserProfile } from '@/src/lib/services/authService';
import type { ThemeOption, UserProfile } from '@/src/types/finance';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authReady: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyThemeToDocument(theme: ThemeOption) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const theme: ThemeOption = profile?.preferences?.theme ?? 'dark';

  useEffect(() => {
    applyThemeToDocument(theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyThemeToDocument('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setAuthReady(true);
        return;
      }

      setLoading(true);
      setUser(firebaseUser);
      try {
        const ensured = await ensureUserProfile(firebaseUser);
        setProfile(ensured);

        const userPath = `users/${firebaseUser.uid}`;
        unsubscribeProfile = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
            setLoading(false);
            setAuthReady(true);
          },
          (error) => {
            setLoading(false);
            setAuthReady(true);
            handleFirestoreError(error, OperationType.GET, userPath);
          }
        );
      } catch (err) {
        console.error('Failed loading user profile:', err);
        setProfile({
          uid: firebaseUser.uid,
          fullName: firebaseUser.displayName || 'SpendWise User',
          email: firebaseUser.email || '',
          defaultCurrency: 'NGN',
          preferences: DEFAULT_PREFERENCES,
        });
        setLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const updated = await ensureUserProfile(auth.currentUser);
    setProfile(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, authReady, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
