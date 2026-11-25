import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Tags,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
  ArrowRightLeft,
  ChevronDown,
  User as UserIcon,
  RotateCcw,
  LogIn,
  FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog';
import { UserAvatar } from '@/src/components/ui/user-avatar';
import { TransactionModal } from '@/src/components/transactions/TransactionModal';
import { ExchangeRateModal } from '@/src/components/settings/ExchangeRateModal';
import { useDemo, useWorkspaceAuth } from '@/src/hooks/useDemo';
import { logoutUser } from '@/src/lib/services/authService';
import { cn } from '@/src/lib/utils/format';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDemo, profile, firebaseUser } = useWorkspaceAuth();
  const { exitDemo, resetDemo } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav?.label ?? 'Dashboard';
  const reportingCurrency =
    profile?.preferences?.reportingCurrency ?? profile?.defaultCurrency ?? 'NGN';

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    if (isDemo) {
      exitDemo();
      toast.info('Exited Demo Mode.');
      navigate('/');
      return;
    }
    try {
      await logoutUser();
      toast.success('Signed out of SpendWise.');
      navigate('/login');
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleNavigateAuth = (targetPath: '/login' | '/register') => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    exitDemo();
    navigate(targetPath);
  };

  const handleConfirmResetDemo = () => {
    resetDemo();
    setResetConfirmOpen(false);
    toast.success('Demo data restored to original sample dataset.');
  };

  const displayName = profile?.fullName || firebaseUser?.displayName || 'SpendWise User';
  const userEmail = profile?.email || firebaseUser?.email || '';

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)]">
        <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#8B7CFF] text-[#0B0D12] flex items-center justify-center font-display font-bold text-sm">
              SW
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
              SpendWise
            </span>
          </NavLink>
          {isDemo && (
            <span className="text-[10px] font-mono-num font-semibold tracking-wider text-[#8B7CFF]">
              DEMO
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150',
                    isActive
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--bg-elevated)]/60 transition-colors"
          >
            <UserAvatar src={profile?.photoURL} name={displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{displayName}</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {isDemo ? 'Sample Sandbox' : userEmail}
              </p>
            </div>
          </NavLink>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-[var(--text-secondary)] hover:text-[#F06464]"
          >
            <LogOut className="w-4 h-4" />
            {isDemo ? 'Exit Demo' : 'Sign out'}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/70"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <aside className="w-64 h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
              <span className="font-display text-base font-bold text-[var(--text-primary)]">
                SpendWise{isDemo ? ' · Demo' : ''}
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap',
                        isActive
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--bg-elevated)]/60 transition-colors"
              >
                <UserAvatar src={profile?.photoURL} name={displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{displayName}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {isDemo ? 'Sample Sandbox' : userEmail}
                  </p>
                </div>
              </NavLink>
              {isDemo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigateAuth('/login')}
                  className="w-full justify-start text-[#8B7CFF]"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In / Register
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[#F06464]"
              >
                <LogOut className="w-4 h-4" />
                {isDemo ? 'Exit Demo' : 'Sign out'}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 lg:h-16 px-4 sm:px-6 lg:px-8 bg-[var(--bg-app)]/95 backdrop-blur-xs border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)] truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRatesModalOpen(true)}
              title="Manage exchange rates"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="font-mono-num">{reportingCurrency}</span>
            </Button>
            <Button size="sm" onClick={() => setTxModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                <UserAvatar src={profile?.photoURL} name={displayName} size="sm" />
                <span className="hidden md:inline text-xs font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account options"
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl py-1.5 z-50"
                >
                  <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {isDemo ? 'Interactive Demo Sandbox' : userEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    {isDemo ? 'Demo Preferences' : 'Profile & Settings'}
                  </button>
                  {isDemo && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setResetConfirmOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Demo Data
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleNavigateAuth('/login')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#8B7CFF] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In / Create Account
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#F06464] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {isDemo ? 'Exit Demo' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-5">
          {isDemo && (
            <div
              role="region"
              aria-label="Demo mode indicator"
              className="rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/35 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#8B7CFF]/20 border border-[#8B7CFF]/40 text-[#8B7CFF] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    DEMO MODE · Sample Financial Sandbox
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    All figures shown are sample data. Your edits save locally in this browser and never touch real user accounts.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetConfirmOpen(true)}
                  className="whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Data
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigateAuth('/login')}
                  className="whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-[#F06464] hover:text-[#F06464] whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Exit Demo
                </Button>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>

      <TransactionModal open={txModalOpen} onClose={() => setTxModalOpen(false)} />
      <ExchangeRateModal open={ratesModalOpen} onClose={() => setRatesModalOpen(false)} />
      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleConfirmResetDemo}
        title="Reset Demo Data"
        description="Restore the original sample transactions, monthly budgets, categories, exchange rates, and demo profile preferences? Any edits made during your demo session will be cleared."
        confirmLabel="Reset Demo Data"
        danger={false}
      />
    </div>
  );
}
