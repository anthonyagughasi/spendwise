import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { FieldError, Input, Label } from '@/src/components/ui/input';
import { loginSchema, type LoginFormValues } from '@/src/lib/validations/schemas';
import { loginWithEmail, loginWithGoogle, mapAuthErrorMessage } from '@/src/lib/services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginWithEmail(values.email, values.password);
      toast.success('Welcome back to SpendWise.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(mapAuthErrorMessage(error));
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(mapAuthErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">SpendWise</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to manage your multi-currency finances and budgets.
          </p>
        </div>

        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 space-y-5">
          <Button
            variant="secondary"
            className="w-full h-11"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isSubmitting}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
          </Button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-[var(--border-subtle)]" />
            <span className="px-3 text-xs text-[var(--text-secondary)]">or sign in with email</span>
            <div className="flex-1 border-t border-[var(--border-subtle)]" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email Address</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="login-password" className="mb-0">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#8B7CFF] hover:underline whitespace-nowrap"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError message={errors.password?.message} />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isSubmitting || googleLoading}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)]">
          New to SpendWise?{' '}
          <Link to="/register" className="text-[#8B7CFF] font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
