import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase/errors';
import type {
  Budget,
  Category,
  CurrencyCode,
  ExchangeRateRecord,
  Transaction,
} from '@/src/types/finance';
import type {
  BudgetFormValues,
  CategoryFormValues,
  TransactionFormValues,
} from '@/src/lib/validations/schemas';

export function subscribeUserCategories(
  userId: string,
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => d.data() as Category)
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserTransactions(
  userId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => d.data() as Transaction)
        .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserBudgets(
  userId: string,
  onData: (budgets: Budget[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'budgets'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => d.data() as Budget)
        .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'budgets');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserExchangeRates(
  userId: string,
  onData: (rates: ExchangeRateRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'exchangeRates'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => d.data() as ExchangeRateRecord);
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'exchangeRates');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

// --- Transactions CRUD ---
export async function createTransaction(
  userId: string,
  values: TransactionFormValues,
  category: Category
): Promise<string> {
  const ref = doc(collection(db, 'transactions'));
  const path = `transactions/${ref.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: ref.id,
      userId,
      type: values.type,
      title: values.title.trim().slice(0, 120),
      description: (values.description ?? '').trim().slice(0, 500),
      amount: values.amount,
      currency: values.currency,
      categoryId: category.id,
      categoryName: category.name.slice(0, 60),
      date: values.date,
      paymentMethod: values.paymentMethod,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (values.notes && values.notes.trim().length > 0) {
      payload.notes = values.notes.trim().slice(0, 1000);
    }
    await setDoc(ref, payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  transactionId: string,
  values: TransactionFormValues,
  category: Category
): Promise<void> {
  const path = `transactions/${transactionId}`;
  try {
    const payload: Record<string, unknown> = {
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
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'transactions', transactionId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const path = `transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Categories CRUD ---
export async function createCategory(userId: string, values: CategoryFormValues): Promise<string> {
  const ref = doc(collection(db, 'categories'));
  const path = `categories/${ref.id}`;
  try {
    await setDoc(ref, {
      id: ref.id,
      userId,
      name: values.name.trim().slice(0, 60),
      type: values.type,
      icon: values.icon.slice(0, 40),
      color: values.color,
      isDefault: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategory(
  categoryId: string,
  values: Pick<CategoryFormValues, 'name' | 'icon' | 'color'>
): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      name: values.name.trim().slice(0, 60),
      icon: values.icon.slice(0, 40),
      color: values.color,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryWithReassignment(
  categoryToDelete: Category,
  replacementCategory: Category | null,
  affectedTransactions: Transaction[],
  affectedBudgets: Budget[]
): Promise<void> {
  const path = `categories/${categoryToDelete.id}`;
  if ((affectedTransactions.length > 0 || affectedBudgets.length > 0) && !replacementCategory) {
    throw new Error('Select a replacement category before deleting a category with existing records.');
  }

  try {
    const batch = writeBatch(db);
    if (replacementCategory) {
      for (const tx of affectedTransactions) {
        batch.update(doc(db, 'transactions', tx.id), {
          categoryId: replacementCategory.id,
          categoryName: replacementCategory.name.slice(0, 60),
          updatedAt: serverTimestamp(),
        });
      }
      for (const b of affectedBudgets) {
        batch.update(doc(db, 'budgets', b.id), {
          categoryId: replacementCategory.id,
          categoryName: replacementCategory.name.slice(0, 60),
          updatedAt: serverTimestamp(),
        });
      }
    }
    batch.delete(doc(db, 'categories', categoryToDelete.id));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Budgets CRUD ---
export async function createBudget(
  userId: string,
  values: BudgetFormValues,
  category: Category
): Promise<string> {
  const ref = doc(collection(db, 'budgets'));
  const path = `budgets/${ref.id}`;
  try {
    await setDoc(ref, {
      id: ref.id,
      userId,
      name: values.name.trim().slice(0, 100),
      categoryId: category.id,
      categoryName: category.name.slice(0, 60),
      amount: values.amount,
      currency: values.currency,
      period: 'monthly',
      month: values.month,
      year: values.year,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBudget(
  budgetId: string,
  values: BudgetFormValues,
  category: Category
): Promise<void> {
  const path = `budgets/${budgetId}`;
  try {
    await updateDoc(doc(db, 'budgets', budgetId), {
      name: values.name.trim().slice(0, 100),
      categoryId: category.id,
      categoryName: category.name.slice(0, 60),
      amount: values.amount,
      currency: values.currency,
      month: values.month,
      year: values.year,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const path = `budgets/${budgetId}`;
  try {
    await deleteDoc(doc(db, 'budgets', budgetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Exchange Rates Persistence ---
export async function upsertExchangeRate(
  userId: string,
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  rate: number,
  effectiveDate: string,
  source: 'api' | 'manual'
): Promise<void> {
  const id = `${userId}_${baseCurrency}_${targetCurrency}`;
  const path = `exchangeRates/${id}`;
  try {
    await setDoc(doc(db, 'exchangeRates', id), {
      id,
      userId,
      baseCurrency,
      targetCurrency,
      rate,
      effectiveDate,
      source,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
