import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase/errors';
import { CURRENCY_CODES } from '@/src/constants/finance';
import type { CurrencyCode } from '@/src/types/finance';

export interface SyncRatesResult {
  synced: boolean;
  effectiveDate?: string;
  message: string;
}

export async function syncLiveExchangeRates(
  userId: string,
  baseCurrency: CurrencyCode = 'USD',
  forceRefresh = false
): Promise<SyncRatesResult> {
  const url = `/api/exchange-rates?base=${encodeURIComponent(baseCurrency)}${forceRefresh ? '&refresh=1' : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    return {
      synced: false,
      message: 'Exchange rate service returned an error. Use manual fallback rates if needed.',
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
      message: data.message ?? 'Live exchange rates are unavailable. Use manual rates as fallback.',
    };
  }

  try {
    const batch = writeBatch(db);
    for (const target of CURRENCY_CODES) {
      if (target === baseCurrency) continue;
      const rate = data.rates[target];
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue;

      const id = `${userId}_${baseCurrency}_${target}`;
      batch.set(doc(db, 'exchangeRates', id), {
        id,
        userId,
        baseCurrency,
        targetCurrency: target,
        rate,
        effectiveDate: data.effectiveDate,
        source: 'api',
        updatedAt: serverTimestamp(),
      });

      const inverseId = `${userId}_${target}_${baseCurrency}`;
      batch.set(doc(db, 'exchangeRates', inverseId), {
        id: inverseId,
        userId,
        baseCurrency: target,
        targetCurrency: baseCurrency,
        rate: Number((1 / rate).toFixed(8)),
        effectiveDate: data.effectiveDate,
        source: 'api',
        updatedAt: serverTimestamp(),
      });
    }

    // Also compute cross-pair between remaining currencies if base is USD (NGN <-> GBP)
    if (baseCurrency === 'USD' && data.rates.NGN && data.rates.GBP) {
      const gbpToNgn = Number((data.rates.NGN / data.rates.GBP).toFixed(6));
      const ngnToGbp = Number((data.rates.GBP / data.rates.NGN).toFixed(8));
      batch.set(doc(db, 'exchangeRates', `${userId}_GBP_NGN`), {
        id: `${userId}_GBP_NGN`,
        userId,
        baseCurrency: 'GBP',
        targetCurrency: 'NGN',
        rate: gbpToNgn,
        effectiveDate: data.effectiveDate,
        source: 'api',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'exchangeRates', `${userId}_NGN_GBP`), {
        id: `${userId}_NGN_GBP`,
        userId,
        baseCurrency: 'NGN',
        targetCurrency: 'GBP',
        rate: ngnToGbp,
        effectiveDate: data.effectiveDate,
        source: 'api',
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return {
      synced: true,
      effectiveDate: data.effectiveDate,
      message: `Live exchange rates synced (${data.effectiveDate}).`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'exchangeRates');
  }
}
