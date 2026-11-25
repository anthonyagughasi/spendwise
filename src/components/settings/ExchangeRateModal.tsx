import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { FieldError, Input, Label, Select } from '@/src/components/ui/input';
import { CURRENCY_CODES } from '@/src/constants/finance';
import { manualRateSchema, type ManualRateFormValues } from '@/src/lib/validations/schemas';
import { getTodayIso } from '@/src/lib/utils/format';
import { useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';

interface ExchangeRateModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExchangeRateModal({ open, onClose }: ExchangeRateModalProps) {
  const { userId } = useWorkspaceAuth();
  const { exchangeRates, syncRates, syncingRates, saveManualRatePair } = useFinanceData();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ManualRateFormValues>({
    resolver: zodResolver(manualRateSchema),
    defaultValues: {
      baseCurrency: 'USD',
      targetCurrency: 'NGN',
      rate: undefined as unknown as number,
      effectiveDate: getTodayIso(),
    },
  });

  const base = watch('baseCurrency');
  const target = watch('targetCurrency');

  const handleSyncLive = async () => {
    const res = await syncRates(true);
    if (res.synced) {
      toast.success(res.message);
    } else {
      toast.warning(res.message);
    }
  };

  const onSubmit = async (values: ManualRateFormValues) => {
    if (!userId) return;
    if (values.baseCurrency === values.targetCurrency) {
      toast.error('Base and target currencies must be different.');
      return;
    }

    try {
      await saveManualRatePair(
        values.baseCurrency,
        values.targetCurrency,
        values.rate,
        values.effectiveDate
      );
      toast.success(`Manual rate saved: 1 ${values.baseCurrency} = ${values.rate} ${values.targetCurrency}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed saving exchange rate.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Multi-Currency Exchange Rates"
      description="Sync live market rates or enter manual fallback rates for consolidated reporting."
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-subtle)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Live Market Rates</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Fetches NGN, USD, and GBP conversion pairs securely via server proxy.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSyncLive} disabled={syncingRates}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncingRates ? 'animate-spin' : ''}`} />
            {syncingRates ? 'Syncing...' : 'Sync Live Rates'}
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Manual Fallback Rate Override
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rate-base">From Currency</Label>
              <Select id="rate-base" {...register('baseCurrency')}>
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rate-target">To Currency</Label>
              <Select id="rate-target" {...register('targetCurrency')}>
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rate-value">1 {base} equals ({target})</Label>
              <Input
                id="rate-value"
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="e.g. 1650.00"
                className="font-mono-num"
                {...register('rate', { valueAsNumber: true })}
              />
              <FieldError message={errors.rate?.message} />
            </div>
            <div>
              <Label htmlFor="rate-date">Effective Date</Label>
              <Input id="rate-date" type="date" {...register('effectiveDate')} />
              <FieldError message={errors.effectiveDate?.message} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Manual Rate'}
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Saved Conversion Pairs
          </h3>
          {exchangeRates.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-3">
              No exchange rates saved yet. Click Sync Live Rates or enter a manual rate above.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
              {exchangeRates.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[var(--bg-app)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    1 {r.baseCurrency} → {r.targetCurrency}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num text-[var(--text-primary)]">
                      {r.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {r.source === 'manual' ? 'Manual' : 'API'} · {r.effectiveDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
