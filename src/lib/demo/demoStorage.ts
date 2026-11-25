import { CURRENCY_CODES } from '@/src/constants/finance';
import {
  createInitialDemoState,
  DEMO_USER_ID,
  type DemoStoreState,
} from '@/src/lib/demo/demoSeed';
import type {
  BudgetFormValues,
  CategoryFormValues,
  TransactionFormValues,
} from '@/src/lib/validations/schemas';
import type {
  Budget,
  Category,
  CurrencyCode,
  ExchangeRateRecord,
  Transaction,
  UserPreferences,
  UserProfile,
} from '@/src/types/finance';

export const DEMO_ACTIVE_STORAGE_KEY = 'spendwise:demo:active';
export const DEMO_DATA_STORAGE_KEY = 'spendwise:demo:store:v1';

const STORE_VERSION = 1;
const listeners = new Set<() => void>();
let cachedState: DemoStoreState | null = null;

function isValidDemoState(value: unknown): value is DemoStoreState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DemoStoreState>;
  return (
    candidate.version === STORE_VERSION &&
    Boolean(candidate.profile && typeof candidate.profile.uid === 'string') &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.transactions) &&
    Array.isArray(candidate.budgets) &&
    Array.isArray(candidate.exchangeRates)
  );
}

function readDemoStoreFromStorage(): DemoStoreState {
  if (typeof window === 'undefined') {
    return createInitialDemoState();
  }
  try {
    const raw = window.localStorage.getItem(DEMO_DATA_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidDemoState(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted demo storage recovers cleanly to fresh sample seed
  }
  const fresh = createInitialDemoState();
  writeDemoStoreToStorage(fresh);
  return fresh;
}

function writeDemoStoreToStorage(next: DemoStoreState): void {
  cachedState = next;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_DATA_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function createDemoId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `demo-${prefix}-${Date.now()}-${randomPart}`;
}

function sortCategories(rows: Category[]): Category[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

function sortTransactions(rows: Transaction[]): Transaction[] {
  return [...rows].sort((a, b) =>
    a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
  );
}

function sortBudgets(rows: Budget[]): Budget[] {
  return [...rows].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );
}

export function isDemoSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_ACTIVE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDemoSessionActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) {
      window.localStorage.setItem(DEMO_ACTIVE_STORAGE_KEY, '1');
      getDemoStoreState();
    } else {
      window.localStorage.removeItem(DEMO_ACTIVE_STORAGE_KEY);
    }
  } catch {
    // Non-fatal
  }
}

export function getDemoStoreState(): DemoStoreState {
  if (!cachedState) {
    cachedState = readDemoStoreFromStorage();
  }
  return cachedState;
}

export function subscribeDemoStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetDemoStoreState(): DemoStoreState {
  const fresh = createInitialDemoState();
  writeDemoStoreToStorage(fresh);
  notifyListeners();
  return fresh;
}

// --- Demo Transactions CRUD ---
export function createDemoTransaction(
  values: TransactionFormValues,
  category: Category
): string {
  const state = getDemoStoreState();
  const id = createDemoId('tx');
  const nextTx: Transaction = {
    id,
    userId: DEMO_USER_ID,
    type: values.type,
    title: values.title.trim().slice(0, 120),
    description: (values.description ?? '').trim().slice(0, 500),
    amount: values.amount,
    currency: values.currency,
    categoryId: category.id,
    categoryName: category.name.slice(0, 60),
    date: values.date,
    paymentMethod: values.paymentMethod,
    ...(values.notes && values.notes.trim().length > 0
      ? { notes: values.notes.trim().slice(0, 1000) }
      : {}),
  };

  writeDemoStoreToStorage({
    ...state,
    transactions: sortTransactions([nextTx, ...state.transactions]),
  });
  notifyListeners();
  return id;
}

export function updateDemoTransaction(
  transactionId: string,
  values: TransactionFormValues,
  category: Category
): void {
  const state = getDemoStoreState();
  const updated = state.transactions.map((tx) =>
    tx.id === transactionId
      ? {
          ...tx,
          type: values.type,
          title: values.title.trim().slice(0, 120),
          description: (values.description ?? '').trim().slice(0, 500),
          amount: values.amount,
          currency: values.currency,
          categoryId: category.id,
          categoryName: category.name.slice(0, 60),
          date: values.date,
          paymentMethod: values.paymentMethod,
          notes: values.notes ? values.notes.trim().slice(0, 1000) : '',
        }
      : tx
  );
  writeDemoStoreToStorage({
    ...state,
    transactions: sortTransactions(updated),
  });
  notifyListeners();
}

export function deleteDemoTransaction(transactionId: string): void {
  const state = getDemoStoreState();
  writeDemoStoreToStorage({
    ...state,
    transactions: state.transactions.filter((tx) => tx.id !== transactionId),
  });
  notifyListeners();
}

// --- Demo Categories CRUD ---
export function createDemoCategory(values: CategoryFormValues): string {
  const state = getDemoStoreState();
  const id = createDemoId('cat');
  const nextCat: Category = {
    id,
    userId: DEMO_USER_ID,
    name: values.name.trim().slice(0, 60),
    type: values.type,
    icon: values.icon.slice(0, 40),
    color: values.color,
    isDefault: false,
  };
  writeDemoStoreToStorage({
    ...state,
    categories: sortCategories([...state.categories, nextCat]),
  });
  notifyListeners();
  return id;
}

export function updateDemoCategory(
  categoryId: string,
  values: Pick<CategoryFormValues, 'name' | 'icon' | 'color'>
): void {
  const state = getDemoStoreState();
  const trimmedName = values.name.trim().slice(0, 60);
  const nextCategories = state.categories.map((cat) =>
    cat.id === categoryId
      ? {
          ...cat,
          name: trimmedName,
          icon: values.icon.slice(0, 40),
          color: values.color,
        }
      : cat
  );
  const nextTransactions = state.transactions.map((tx) =>
    tx.categoryId === categoryId ? { ...tx, categoryName: trimmedName } : tx
  );
  const nextBudgets = state.budgets.map((b) =>
    b.categoryId === categoryId ? { ...b, categoryName: trimmedName } : b
  );
  writeDemoStoreToStorage({
    ...state,
    categories: sortCategories(nextCategories),
    transactions: nextTransactions,
    budgets: nextBudgets,
  });
  notifyListeners();
}

export function deleteDemoCategoryWithReassignment(
  categoryToDelete: Category,
  replacementCategory: Category | null,
  affectedTransactions: Transaction[],
  affectedBudgets: Budget[]
): void {
  if ((affectedTransactions.length > 0 || affectedBudgets.length > 0) && !replacementCategory) {
    throw new Error('Select a replacement category before deleting a category with existing records.');
  }
  const state = getDemoStoreState();
  const nextTransactions = replacementCategory
    ? state.transactions.map((tx) =>
        tx.categoryId === categoryToDelete.id
          ? {
              ...tx,
              categoryId: replacementCategory.id,
              categoryName: replacementCategory.name.slice(0, 60),
            }
          : tx
      )
    : state.transactions;

  const nextBudgets = replacementCategory
    ? state.budgets.map((b) =>
        b.categoryId === categoryToDelete.id
          ? {
              ...b,
              categoryId: replacementCategory.id,
              categoryName: replacementCategory.name.slice(0, 60),
            }
          : b
      )
    : state.budgets;

  writeDemoStoreToStorage({
    ...state,
    categories: state.categories.filter((c) => c.id !== categoryToDelete.id),
    transactions: nextTransactions,
    budgets: nextBudgets,
  });
  notifyListeners();
}

// --- Demo Budgets CRUD ---
export function createDemoBudget(values: BudgetFormValues, category: Category): string {
  const state = getDemoStoreState();
  const id = createDemoId('budget');
  const nextBudget: Budget = {
    id,
    userId: DEMO_USER_ID,
    name: values.name.trim().slice(0, 100),
    categoryId: category.id,
    categoryName: category.name.slice(0, 60),
    amount: values.amount,
    currency: values.currency,
    period: 'monthly',
    month: values.month,
    year: values.year,
  };
  writeDemoStoreToStorage({
    ...state,
    budgets: sortBudgets([...state.budgets, nextBudget]),
  });
  notifyListeners();
  return id;
}

export function updateDemoBudget(
  budgetId: string,
  values: BudgetFormValues,
  category: Category
): void {
  const state = getDemoStoreState();
  const nextBudgets = state.budgets.map((b) =>
    b.id === budgetId
      ? {
          ...b,
          name: values.name.trim().slice(0, 100),
          categoryId: category.id,
          categoryName: category.name.slice(0, 60),
          amount: values.amount,
          currency: values.currency,
          month: values.month,
          year: values.year,
        }
      : b
  );
  writeDemoStoreToStorage({
    ...state,
    budgets: sortBudgets(nextBudgets),
  });
  notifyListeners();
}

export function deleteDemoBudget(budgetId: string): void {
  const state = getDemoStoreState();
  writeDemoStoreToStorage({
    ...state,
    budgets: state.budgets.filter((b) => b.id !== budgetId),
  });
  notifyListeners();
}

// --- Demo Exchange Rates ---
export function upsertDemoExchangeRate(
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  rate: number,
  effectiveDate: string,
  source: 'api' | 'manual'
): void {
  const state = getDemoStoreState();
  const id = `${DEMO_USER_ID}_${baseCurrency}_${targetCurrency}`;
  const nextRecord: ExchangeRateRecord = {
    id,
    userId: DEMO_USER_ID,
    baseCurrency,
    targetCurrency,
    rate,
    effectiveDate,
    source,
  };
  const filtered = state.exchangeRates.filter((r) => r.id !== id);
  writeDemoStoreToStorage({
    ...state,
    exchangeRates: [...filtered, nextRecord],
  });
  notifyListeners();
}

export async function syncDemoLiveExchangeRates(
  baseCurrency: CurrencyCode = 'USD',
  forceRefresh = false
): Promise<{ synced: boolean; message: string }> {
  try {
    const url = `/api/exchange-rates?base=${encodeURIComponent(baseCurrency)}${
      forceRefresh ? '&refresh=1' : ''
    }`;
    const response = await fetch(url);
    if (!response.ok) {
      return {
        synced: false,
        message: 'Exchange rate service returned an error. Using sample demo rates instead.',
      };
    }

    const data = (await response.json()) as {
      available: boolean;
      baseCurrency: CurrencyCode;
      rates?: Record<string, number>;
      effectiveDate?: string;
      message?: string;
    };

    if (!data.available || !data.rates || !data.effectiveDate) {
      return {
        synced: false,
        message:
          data.message ??
          'Live market rates unavailable. Sample demo rates remain active.',
      };
    }

    const state = getDemoStoreState();
    const rateMap = new Map<string, ExchangeRateRecord>(
      state.exchangeRates.map((r) => [r.id, r])
    );

    const setPair = (
      from: CurrencyCode,
      to: CurrencyCode,
      rate: number,
      effectiveDate: string
    ) => {
      const id = `${DEMO_USER_ID}_${from}_${to}`;
      rateMap.set(id, {
        id,
        userId: DEMO_USER_ID,
        baseCurrency: from,
        targetCurrency: to,
        rate,
        effectiveDate,
        source: 'api',
      });
    };

    for (const target of CURRENCY_CODES) {
      if (target === baseCurrency) continue;
      const rate = data.rates[target];
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue;
      setPair(baseCurrency, target, rate, data.effectiveDate);
      setPair(target, baseCurrency, Number((1 / rate).toFixed(8)), data.effectiveDate);
    }

    if (baseCurrency === 'USD' && data.rates.NGN && data.rates.GBP) {
      setPair(
        'GBP',
        'NGN',
        Number((data.rates.NGN / data.rates.GBP).toFixed(6)),
        data.effectiveDate
      );
      setPair(
        'NGN',
        'GBP',
        Number((data.rates.GBP / data.rates.NGN).toFixed(8)),
        data.effectiveDate
      );
    }

    writeDemoStoreToStorage({
      ...state,
      exchangeRates: Array.from(rateMap.values()),
    });
    notifyListeners();

    return {
      synced: true,
      message: `Demo exchange rates updated (${data.effectiveDate}).`,
    };
  } catch {
    return {
      synced: false,
      message: 'Could not reach rate feed. Sample demo rates remain active.',
    };
  }
}

// --- Demo Profile & Preferences ---
export function updateDemoProfile(updates: {
  fullName?: string;
  photoURL?: string;
  defaultCurrency?: UserProfile['defaultCurrency'];
  preferences?: UserPreferences;
}): void {
  const state = getDemoStoreState();
  const nextProfile: UserProfile = {
    ...state.profile,
    ...(updates.fullName !== undefined
      ? { fullName: updates.fullName.trim().slice(0, 100) }
      : {}),
    ...(updates.photoURL !== undefined ? { photoURL: updates.photoURL } : {}),
    ...(updates.defaultCurrency !== undefined
      ? { defaultCurrency: updates.defaultCurrency }
      : {}),
    ...(updates.preferences !== undefined
      ? { preferences: updates.preferences }
      : {}),
  };
  writeDemoStoreToStorage({
    ...state,
    profile: nextProfile,
  });
  notifyListeners();
}

export function clearDemoPhotoUrl(): void {
  const state = getDemoStoreState();
  const { photoURL: _removed, ...restProfile } = state.profile;
  writeDemoStoreToStorage({
    ...state,
    profile: restProfile,
  });
  notifyListeners();
}
