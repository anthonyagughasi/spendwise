import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import {
  subscribeUserBudgets,
  subscribeUserCategories,
  subscribeUserExchangeRates,
  subscribeUserTransactions,
} from '@/src/lib/services/firestoreService';
import { syncLiveExchangeRates } from '@/src/lib/services/exchangeRateService';
import { buildRateMap } from '@/src/lib/calculations/finance';
import type {
  Budget,
  Category,
  ExchangeRateMap,
  ExchangeRateRecord,
  Transaction,
} from '@/src/types/finance';

interface FinanceDataContextValue {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  exchangeRates: ExchangeRateRecord[];
  rateMap: ExchangeRateMap;
  loading: boolean;
  error: string | null;
  syncingRates: boolean;
  syncRates: (forceRefresh?: boolean) => Promise<{ synced: boolean; message: string }>;
}

const FinanceDataContext = createContext<FinanceDataContextValue | undefined>(undefined);

export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRecord[]>([]);
  const [loadedFlags, setLoadedFlags] = useState({
    categories: false,
    transactions: false,
    budgets: false,
    rates: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [syncingRates, setSyncingRates] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setExchangeRates([]);
      setLoadedFlags({ categories: true, transactions: true, budgets: true, rates: true });
      setError(null);
      return;
    }

    setError(null);
    setLoadedFlags({ categories: false, transactions: false, budgets: false, rates: false });

    const unsubCategories = subscribeUserCategories(
      user.uid,
      (rows) => {
        setCategories(rows);
        setLoadedFlags((prev) => ({ ...prev, categories: true }));
      },
      (err) => {
        setError(err.message);
        setLoadedFlags((prev) => ({ ...prev, categories: true }));
      }
    );

    const unsubTransactions = subscribeUserTransactions(
      user.uid,
      (rows) => {
        setTransactions(rows);
        setLoadedFlags((prev) => ({ ...prev, transactions: true }));
      },
      (err) => {
        setError(err.message);
        setLoadedFlags((prev) => ({ ...prev, transactions: true }));
      }
    );

    const unsubBudgets = subscribeUserBudgets(
      user.uid,
      (rows) => {
        setBudgets(rows);
        setLoadedFlags((prev) => ({ ...prev, budgets: true }));
      },
      (err) => {
        setError(err.message);
        setLoadedFlags((prev) => ({ ...prev, budgets: true }));
      }
    );

    const unsubRates = subscribeUserExchangeRates(
      user.uid,
      (rows) => {
        setExchangeRates(rows);
        setLoadedFlags((prev) => ({ ...prev, rates: true }));
      },
      (err) => {
        setError(err.message);
        setLoadedFlags((prev) => ({ ...prev, rates: true }));
      }
    );

    return () => {
      unsubCategories();
      unsubTransactions();
      unsubBudgets();
      unsubRates();
    };
  }, [user, authReady]);

  const syncRates = useCallback(
    async (forceRefresh = false) => {
      if (!user) return { synced: false, message: 'Sign in required to sync exchange rates.' };
      setSyncingRates(true);
      try {
        const result = await syncLiveExchangeRates(user.uid, 'USD', forceRefresh);
        return { synced: result.synced, message: result.message };
      } finally {
        setSyncingRates(false);
      }
    },
    [user]
  );

  // Auto-sync live exchange rates once when user signs in and has no saved rates yet
  useEffect(() => {
    if (!user || !loadedFlags.rates || exchangeRates.length > 0) return;
    void syncLiveExchangeRates(user.uid, 'USD', false).catch(() => {
      // Non-fatal: manual fallback remains available
    });
  }, [user, loadedFlags.rates, exchangeRates.length]);

  const rateMap = useMemo(() => buildRateMap(exchangeRates), [exchangeRates]);
  const loading =
    !authReady ||
    (Boolean(user) &&
      (!loadedFlags.categories ||
        !loadedFlags.transactions ||
        !loadedFlags.budgets ||
        !loadedFlags.rates));

  return (
    <FinanceDataContext.Provider
      value={{
        categories,
        transactions,
        budgets,
        exchangeRates,
        rateMap,
        loading,
        error,
        syncingRates,
        syncRates,
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData(): FinanceDataContextValue {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) {
    throw new Error('useFinanceData must be used inside FinanceDataProvider');
  }
  return ctx;
}
