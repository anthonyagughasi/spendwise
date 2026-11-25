import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, RefreshCw, KeyRound, MailCheck, LogIn, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog';
import { FieldError, Input, Label, Select } from '@/src/components/ui/input';
import { ExchangeRateModal } from '@/src/components/settings/ExchangeRateModal';
import { ProfilePictureUpload } from '@/src/components/settings/ProfilePictureUpload';
import {
  CURRENCY_CODES,
  DATE_FORMAT_OPTIONS,
  SUPPORTED_CURRENCIES,
  THEME_OPTIONS,
} from '@/src/constants/finance';
import {
  changePasswordSchema,
  preferencesSchema,
  profileSchema,
  type ChangePasswordFormValues,
  type PreferencesFormValues,
  type ProfileFormValues,
} from '@/src/lib/validations/schemas';
import {
  changeUserPassword,
  logoutUser,
  mapAuthErrorMessage,
  resendVerificationEmail,
  sendPasswordReset,
} from '@/src/lib/services/authService';
import { useDemo, useWorkspaceAuth } from '@/src/hooks/useDemo';
import { useFinanceData } from '@/src/hooks/useFinanceData';

export function SettingsPage() {
  const navigate = useNavigate();
  const { isDemo, userId, firebaseUser, profile } = useWorkspaceAuth();
  const { exitDemo, resetDemo } = useDemo();
  const { syncRates, syncingRates, exchangeRates, updateWorkspaceProfile } = useFinanceData();
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const isPasswordProvider = Boolean(
    !isDemo && firebaseUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
    },
  });

  const prefForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      defaultCurrency: profile?.defaultCurrency ?? 'NGN',
      reportingCurrency: profile?.preferences?.reportingCurrency ?? 'NGN',
      dateFormat: profile?.preferences?.dateFormat ?? 'MMM dd, yyyy',
      theme: profile?.preferences?.theme ?? 'dark',
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({
      fullName: profile.fullName,
    });
    prefForm.reset({
      defaultCurrency: profile.defaultCurrency,
      reportingCurrency: profile.preferences?.reportingCurrency ?? profile.defaultCurrency,
      dateFormat: profile.preferences?.dateFormat ?? 'MMM dd, yyyy',
      theme: profile.preferences?.theme ?? 'dark',
    });
  }, [profile, profileForm, prefForm]);

  const onSaveProfile = async (values: ProfileFormValues) => {
    if (!userId) return;
    try {
      await updateWorkspaceProfile({
        fullName: values.fullName,
      });
      toast.success(isDemo ? 'Demo profile updated.' : 'Profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed updating profile.');
    }
  };

  const onSavePreferences = async (values: PreferencesFormValues) => {
    if (!userId) return;
    try {
      await updateWorkspaceProfile({
        defaultCurrency: values.defaultCurrency,
        preferences: {
          reportingCurrency: values.reportingCurrency,
          dateFormat: values.dateFormat,
          theme: values.theme,
        },
      });
      toast.success(isDemo ? 'Demo preferences saved.' : 'Preferences saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed saving preferences.');
    }
  };

  const onChangePassword = async (values: ChangePasswordFormValues) => {
    if (isDemo) return;
    try {
      await changeUserPassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      toast.success('Password updated successfully.');
    } catch (err) {
      toast.error(mapAuthErrorMessage(err));
    }
  };

  const handlePasswordReset = async () => {
    if (isDemo) return;
    const email = firebaseUser?.email || profile?.email;
    if (!email) return;
    try {
      await sendPasswordReset(email);
      toast.success(`Password reset email sent to ${email}.`);
    } catch (err) {
      toast.error(mapAuthErrorMessage(err));
    }
  };

  const handleResendVerification = async () => {
    if (isDemo) return;
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent.');
    } catch (err) {
      toast.error(mapAuthErrorMessage(err));
    }
  };

  const handleSignOut = async () => {
    if (isDemo) {
      exitDemo();
      toast.info('Exited Demo Mode.');
      navigate('/');
      return;
    }
    await logoutUser();
    toast.success('Signed out.');
    navigate('/login');
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isDemo ? 'Sample sandbox profile (saved locally in browser)' : 'Personal account identity details'}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {userId && (
            <ProfilePictureUpload
              userId={userId}
              displayName={profile?.fullName || firebaseUser?.displayName || 'SpendWise User'}
              currentPhotoUrl={profile?.photoURL}
            />
          )}

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="set-name">Full Name</Label>
                <Input id="set-name" {...profileForm.register('fullName')} />
                <FieldError message={profileForm.formState.errors.fullName?.message} />
              </div>

              <div>
                <Label htmlFor="set-email">Email Address</Label>
                <Input
                  id="set-email"
                  value={profile?.email || firebaseUser?.email || ''}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? 'Saving...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Preferences</CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Default currency, consolidated reporting currency, date format, and theme
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={prefForm.handleSubmit(onSavePreferences)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pref-def-curr">Default Transaction Currency</Label>
                <Select id="pref-def-curr" {...prefForm.register('defaultCurrency')}>
                  {CURRENCY_CODES.map((code) => {
                    const c = SUPPORTED_CURRENCIES.find((x) => x.code === code);
                    return (
                      <option key={code} value={code}>
                        {code} ({c?.symbol}) — {c?.name}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div>
                <Label htmlFor="pref-rep-curr">Consolidated Reporting Currency</Label>
                <Select id="pref-rep-curr" {...prefForm.register('reportingCurrency')}>
                  {CURRENCY_CODES.map((code) => {
                    const c = SUPPORTED_CURRENCIES.find((x) => x.code === code);
                    return (
                      <option key={code} value={code}>
                        {code} ({c?.symbol}) — {c?.name}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div>
                <Label htmlFor="pref-date">Date Format</Label>
                <Select id="pref-date" {...prefForm.register('dateFormat')}>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="pref-theme">Theme Preference</Label>
                <Select id="pref-theme" {...prefForm.register('theme')}>
                  {THEME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={prefForm.formState.isSubmitting}>
                {prefForm.formState.isSubmitting ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Exchange Rates Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Exchange Rates</CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {exchangeRates.length} conversion pair{exchangeRates.length === 1 ? '' : 's'} configured for multi-currency reporting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const res = await syncRates(true);
                if (res.synced) toast.success(res.message);
                else toast.warning(res.message);
              }}
              disabled={syncingRates}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingRates ? 'animate-spin' : ''}`} />
              Sync Live
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRatesModalOpen(true)}>
              Manual Rates
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Account & Security Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{isDemo ? 'Demo Sandbox & Account Access' : 'Account & Security'}</CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isDemo
                ? 'External emails, password changes, and Firestore writes are disabled in Demo Mode.'
                : 'Password management, verification, and session controls'}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDemo ? (
            <>
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#8B7CFF]/10 border border-[#8B7CFF]/30 text-xs text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-[#8B7CFF] shrink-0 mt-0.5" />
                <span>
                  You are exploring SpendWise in an isolated browser sandbox. Want to save real financial records across devices? Create a free account or sign in anytime.
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setResetConfirmOpen(true)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Demo Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      exitDemo();
                      navigate('/login');
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      exitDemo();
                      navigate('/register');
                    }}
                  >
                    Create Account
                  </Button>
                </div>
                <Button variant="danger" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-3.5 h-3.5" />
                  Exit Demo
                </Button>
              </div>
            </>
          ) : (
            <>
              {firebaseUser && !firebaseUser.emailVerified && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#E5A93B]/10 border border-[#E5A93B]/35 text-xs">
                  <div className="flex items-center gap-2">
                    <MailCheck className="w-4 h-4 text-[#E5A93B] shrink-0" />
                    <span>Your email address is not yet verified.</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleResendVerification}>
                    Resend Verification Email
                  </Button>
                </div>
              )}

              {isPasswordProvider && (
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Change Password
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="pw-curr">Current Password</Label>
                      <Input
                        id="pw-curr"
                        type="password"
                        {...passwordForm.register('currentPassword')}
                      />
                      <FieldError message={passwordForm.formState.errors.currentPassword?.message} />
                    </div>
                    <div>
                      <Label htmlFor="pw-new">New Password</Label>
                      <Input
                        id="pw-new"
                        type="password"
                        {...passwordForm.register('newPassword')}
                      />
                      <FieldError message={passwordForm.formState.errors.newPassword?.message} />
                    </div>
                    <div>
                      <Label htmlFor="pw-confirm">Confirm New Password</Label>
                      <Input
                        id="pw-confirm"
                        type="password"
                        {...passwordForm.register('confirmPassword')}
                      />
                      <FieldError message={passwordForm.formState.errors.confirmPassword?.message} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={passwordForm.formState.isSubmitting}>
                      <KeyRound className="w-3.5 h-3.5" />
                      {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="secondary" size="sm" onClick={handlePasswordReset}>
                  Send Password Reset Email
                </Button>
                <Button variant="danger" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExchangeRateModal open={ratesModalOpen} onClose={() => setRatesModalOpen(false)} />
      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetDemo();
          setResetConfirmOpen(false);
          toast.success('Demo data restored to original sample dataset.');
        }}
        title="Reset Demo Data"
        description="Restore the original sample transactions, monthly budgets, categories, exchange rates, and demo preferences?"
        confirmLabel="Reset Demo Data"
        danger={false}
      />
    </div>
  );
}
