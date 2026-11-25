import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useDemo } from '@/src/hooks/useDemo';
import {
  createBudget,
  createCategory,
  createTransaction,
  deleteBudget,
  deleteCategoryWithReassignment,
  deleteTransaction,
  subscribeUserBudgets,
  subscribeUserCategories,
  subscribeUserExchangeRates,
  subscribeUserTransactions,
  updateBudget,
  updateCategory,
  updateTransaction,
  upsertExchangeRate,
} from '@/src/lib/services/firestoreService';
import { updateUserProfileRecord } from '@/src/lib/services/authService';
import {
  compressProfileImageToDataUrl,
  removeProfilePicture,
  uploadProfilePicture,
} from '@/src/lib/services/storageService';
import { syncLiveExchangeRates } from '@/src/lib/services/exchangeRateService';
import {
  clearDemoPhotoUrl,
  createDemoBudget,
  createDemoCategory,
  createDemoTransaction,
  deleteDemoBudget,
  deleteDemoCategoryWithReassignment,
  deleteDemoTransaction,
  syncDemoLiveExchangeRates,
  updateDemoBudget,
  updateDemoCategory,
  updateDemoProfile,
  updateDemoTransaction,
  upsertDemoExchangeRate,
} from '@/src/lib/demo/demoStorage';
import { buildRateMap } from '@/src/lib/calculations/finance';
import type {
  BudgetFormValues,
  CategoryFormValues,
  TransactionFormValues,
} from '@/src/lib/validations/schemas';
import type {
  Budget,
  Category,
  CurrencyCode,
  ExchangeRateMap,
  ExchangeRateRecord,
  Transaction,
  UserPreferences,
  UserProfile,
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
  addTransaction: (values: TransactionFormValues, category: Category) => Promise<string>;
  editTransaction: (
    transactionId: string,
    values: TransactionFormValues,
    category: Category
  ) => Promise<void>;
  removeTransaction: (transactionId: string) => Promise<void>;
  addCategory: (values: CategoryFormValues) => Promise<string>;
  editCategory: (
    categoryId: string,
    values: Pick<CategoryFormValues, 'name' | 'icon' | 'color'>
  ) => Promise<void>;
  removeCategory: (
    categoryToDelete: Category,
    replacementCategory: Category | null,
    affectedTransactions: Transaction[],
    affectedBudgets: Budget[]
  ) => Promise<void>;
  addBudget: (values: BudgetFormValues, category: Category) => Promise<string>;
  editBudget: (
    budgetId: string,
    values: BudgetFormValues,
    category: Category
  ) => Promise<void>;
  removeBudget: (budgetId: string) => Promise<void>;
  saveManualRatePair: (
    baseCurrency: CurrencyCode,
    targetCurrency: CurrencyCode,
    rate: number,
    effectiveDate: string
  ) => Promise<void>;
  updateWorkspaceProfile: (updates: {
    fullName?: string;
    photoURL?: string;
    defaultCurrency?: UserProfile['defaultCurrency'];
    preferences?: UserPreferences;
  }) => Promise<void>;
  uploadWorkspaceAvatar: (
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ) => Promise<string>;
  removeWorkspaceAvatar: () => Promise<void>;
}

const FinanceDataContext = createContext<FinanceDataContextValue | undefined>(undefined);

export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const { isDemo, demoState } = useDemo();

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

  // Subscribe to Firestore ONLY for real authenticated users (never in Demo Mode)
  useEffect(() => {
    if (isDemo) {
      setError(null);
      return;
    }

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
  }, [isDemo, user, authReady]);

  // Auto-sync live exchange rates once when a real user signs in and has no saved rates yet
  useEffect(() => {
    if (isDemo || !user || !loadedFlags.rates || exchangeRates.length > 0) return;
    void syncLiveExchangeRates(user.uid, 'USD', false).catch(() => {
      // Non-fatal: manual fallback remains available
    });
  }, [isDemo, user, loadedFlags.rates, exchangeRates.length]);

  const syncRates = useCallback(
    async (forceRefresh = false) => {
      if (isDemo) {
        setSyncingRates(true);
        try {
          return await syncDemoLiveExchangeRates('USD', forceRefresh);
        } finally {
          setSyncingRates(false);
        }
      }
      if (!user) return { synced: false, message: 'Sign in required to sync exchange rates.' };
      setSyncingRates(true);
      try {
        const result = await syncLiveExchangeRates(user.uid, 'USD', forceRefresh);
        return { synced: result.synced, message: result.message };
      } finally {
        setSyncingRates(false);
      }
    },
    [isDemo, user]
  );

  const addTransaction = useCallback(
    async (values: TransactionFormValues, category: Category) => {
      if (isDemo) {
        return createDemoTransaction(values, category);
      }
      if (!user) throw new Error('Sign in required.');
      return createTransaction(user.uid, values, category);
    },
    [isDemo, user]
  );

  const editTransaction = useCallback(
    async (transactionId: string, values: TransactionFormValues, category: Category) => {
      if (isDemo) {
        updateDemoTransaction(transactionId, values, category);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await updateTransaction(transactionId, values, category);
    },
    [isDemo, user]
  );

  const removeTransaction = useCallback(
    async (transactionId: string) => {
      if (isDemo) {
        deleteDemoTransaction(transactionId);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await deleteTransaction(transactionId);
    },
    [isDemo, user]
  );

  const addCategory = useCallback(
    async (values: CategoryFormValues) => {
      if (isDemo) {
        return createDemoCategory(values);
      }
      if (!user) throw new Error('Sign in required.');
      return createCategory(user.uid, values);
    },
    [isDemo, user]
  );

  const editCategory = useCallback(
    async (categoryId: string, values: Pick<CategoryFormValues, 'name' | 'icon' | 'color'>) => {
      if (isDemo) {
        updateDemoCategory(categoryId, values);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await updateCategory(categoryId, values);
    },
    [isDemo, user]
  );

  const removeCategory = useCallback(
    async (
      categoryToDelete: Category,
      replacementCategory: Category | null,
      affectedTransactions: Transaction[],
      affectedBudgets: Budget[]
    ) => {
      if (isDemo) {
        deleteDemoCategoryWithReassignment(
          categoryToDelete,
          replacementCategory,
          affectedTransactions,
          affectedBudgets
        );
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await deleteCategoryWithReassignment(
        categoryToDelete,
        replacementCategory,
        affectedTransactions,
        affectedBudgets
      );
    },
    [isDemo, user]
  );

  const addBudget = useCallback(
    async (values: BudgetFormValues, category: Category) => {
      if (isDemo) {
        return createDemoBudget(values, category);
      }
      if (!user) throw new Error('Sign in required.');
      return createBudget(user.uid, values, category);
    },
    [isDemo, user]
  );

  const editBudget = useCallback(
    async (budgetId: string, values: BudgetFormValues, category: Category) => {
      if (isDemo) {
        updateDemoBudget(budgetId, values, category);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await updateBudget(budgetId, values, category);
    },
    [isDemo, user]
  );

  const removeBudget = useCallback(
    async (budgetId: string) => {
      if (isDemo) {
        deleteDemoBudget(budgetId);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await deleteBudget(budgetId);
    },
    [isDemo, user]
  );

  const saveManualRatePair = useCallback(
    async (
      baseCurrency: CurrencyCode,
      targetCurrency: CurrencyCode,
      rate: number,
      effectiveDate: string
    ) => {
      const inverseRate = Number((1 / rate).toFixed(8));
      if (isDemo) {
        upsertDemoExchangeRate(baseCurrency, targetCurrency, rate, effectiveDate, 'manual');
        upsertDemoExchangeRate(targetCurrency, baseCurrency, inverseRate, effectiveDate, 'manual');
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await upsertExchangeRate(
        user.uid,
        baseCurrency,
        targetCurrency,
        rate,
        effectiveDate,
        'manual'
      );
      await upsertExchangeRate(
        user.uid,
        targetCurrency,
        baseCurrency,
        inverseRate,
        effectiveDate,
        'manual'
      );
    },
    [isDemo, user]
  );

  const updateWorkspaceProfile = useCallback(
    async (updates: {
      fullName?: string;
      photoURL?: string;
      defaultCurrency?: UserProfile['defaultCurrency'];
      preferences?: UserPreferences;
    }) => {
      if (isDemo) {
        updateDemoProfile(updates);
        return;
      }
      if (!user) throw new Error('Sign in required.');
      await updateUserProfileRecord(user.uid, updates);
    },
    [isDemo, user]
  );

  const uploadWorkspaceAvatar = useCallback(
    async (file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
      if (isDemo) {
        const dataUrl = await compressProfileImageToDataUrl(file, onProgress, signal);
        onProgress?.(85);
        updateDemoProfile({ photoURL: dataUrl });
        onProgress?.(100);
        return dataUrl;
      }
      if (!user) throw new Error('Please sign in again before uploading a profile picture.');
      return uploadProfilePicture(user.uid, file, onProgress, signal);
    },
    [isDemo, user]
  );

  const removeWorkspaceAvatar = useCallback(async () => {
    if (isDemo) {
      clearDemoPhotoUrl();
      return;
    }
    if (!user) throw new Error('Please sign in again before modifying your profile picture.');
    await removeProfilePicture(user.uid);
  }, [isDemo, user]);

  const activeCategories = isDemo ? demoState.categories : categories;
  const activeTransactions = isDemo ? demoState.transactions : transactions;
  const activeBudgets = isDemo ? demoState.budgets : budgets;
  const activeExchangeRates = isDemo ? demoState.exchangeRates : exchangeRates;

  const rateMap = useMemo(
    () => buildRateMap(activeExchangeRates),
    [activeExchangeRates]
  );

  const loading = isDemo
    ? false
    : !authReady ||
      (Boolean(user) &&
        (!loadedFlags.categories ||
          !loadedFlags.transactions ||
          !loadedFlags.budgets ||
          !loadedFlags.rates));

  return (
    <FinanceDataContext.Provider
      value={{
        categories: activeCategories,
        transactions: activeTransactions,
        budgets: activeBudgets,
        exchangeRates: activeExchangeRates,
        rateMap,
        loading,
        error: isDemo ? null : error,
        syncingRates,
        syncRates,
        addTransaction,
        editTransaction,
        removeTransaction,
        addCategory,
        editCategory,
        removeCategory,
        addBudget,
        editBudget,
        removeBudget,
        saveManualRatePair,
        updateWorkspaceProfile,
        uploadWorkspaceAvatar,
        removeWorkspaceAvatar,
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
