import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { FieldError, Input, Label } from '@/src/components/ui/input';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/src/lib/validations/schemas';
import { mapAuthErrorMessage, sendPasswordReset } from '@/src/lib/services/authService';

export function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await sendPasswordReset(values.email);
      setSentEmail(values.email);
      toast.success('Password reset instructions sent.');
    } catch (error) {
      toast.error(mapAuthErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#8B7CFF] text-[#0B0D12] flex items-center justify-center font-display font-bold text-sm">
              SW
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">SpendWise</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Reset your account password via email verification.
          </p>
        </div>

        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6">
          {sentEmail ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto w-11 h-11 rounded-xl bg-[#27C98A]/15 text-[#27C98A] flex items-center justify-center">
                <MailCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Check your inbox</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  If an account exists for <span className="text-[var(--text-primary)] font-medium">{sentEmail}</span>, a password reset link has been sent.
                </p>
              </div>
              <Link to="/login" className="block">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">Account Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? 'Sending link...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)]">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-[#8B7CFF] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
