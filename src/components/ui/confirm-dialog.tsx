import { Dialog } from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  danger = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
