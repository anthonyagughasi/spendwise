import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from '@/src/hooks/useAuth';
import type { DemoStoreState } from '@/src/lib/demo/demoSeed';
import {
  getDemoStoreState,
  isDemoSessionActive,
  resetDemoStoreState,
  setDemoSessionActive,
  subscribeDemoStore,
} from '@/src/lib/demo/demoStorage';
import type { ThemeOption, UserProfile } from '@/src/types/finance';

interface DemoContextValue {
  isDemo: boolean;
  demoState: DemoStoreState;
  enterDemo: () => void;
  exitDemo: () => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

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

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [demoEnabled, setDemoEnabled] = useState<boolean>(() => isDemoSessionActive());
  const [demoState, setDemoState] = useState<DemoStoreState>(() => getDemoStoreState());

  // Subscribe to isolated demo store mutations
  useEffect(() => {
    setDemoState(getDemoStoreState());
    return subscribeDemoStore(() => {
      setDemoState(getDemoStoreState());
    });
  }, []);

  // A real Firebase session always takes precedence and clears the active demo flag
  // without deleting or modifying any stored demo sandbox data.
  useEffect(() => {
    if (user && demoEnabled) {
      setDemoSessionActive(false);
      setDemoEnabled(false);
    }
  }, [user, demoEnabled]);

  const isDemo = !user && demoEnabled;
  const demoTheme: ThemeOption = demoState.profile.preferences.theme ?? 'dark';

  useEffect(() => {
    if (!isDemo) {
      if (!user) {
        applyThemeToDocument('dark');
      }
      return;
    }

    applyThemeToDocument(demoTheme);
    if (demoTheme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyThemeToDocument('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [isDemo, user, demoTheme]);

  const enterDemo = useCallback(() => {
    if (user) return;
    setDemoSessionActive(true);
    setDemoState(getDemoStoreState());
    setDemoEnabled(true);
  }, [user]);

  const exitDemo = useCallback(() => {
    setDemoSessionActive(false);
    setDemoEnabled(false);
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = resetDemoStoreState();
    setDemoState(fresh);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo, demoState, enterDemo, exitDemo, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemo must be used inside DemoProvider');
  }
  return ctx;
}

export interface WorkspaceAuthValue {
  isDemo: boolean;
  userId: string | null;
  profile: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  authReady: boolean;
}

export function useWorkspaceAuth(): WorkspaceAuthValue {
  const { user, profile, loading, authReady } = useAuth();
  const { isDemo, demoState } = useDemo();

  if (isDemo) {
    return {
      isDemo: true,
      userId: demoState.profile.uid,
      profile: demoState.profile,
      firebaseUser: null,
      loading: false,
      authReady: true,
    };
  }

  return {
    isDemo: false,
    userId: user?.uid ?? null,
    profile,
    firebaseUser: user,
    loading,
    authReady,
  };
}
