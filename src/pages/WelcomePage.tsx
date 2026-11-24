import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Coins,
  PiggyBank,
} from 'lucide-react';
import { DashboardPreview } from '@/src/components/welcome/DashboardPreview';

const CORE_CAPABILITIES = [
  {
    title: 'Track Income & Expenses',
    description: 'Log transactions across custom categories and payment methods in seconds.',
    icon: ArrowLeftRight,
  },
  {
    title: 'Manage Budgets',
    description: 'Set monthly category limits with live progress tracking and alert thresholds.',
    icon: PiggyBank,
  },
  {
    title: 'Multi-Currency Support',
    description: 'Hold native NGN, USD, and GBP balances with live or manual exchange rates.',
    icon: Coins,
  },
  {
    title: 'Financial Reports & Insights',
    description: 'Analyze spending trends, savings rates, and export clean CSV statements.',
    icon: BarChart3,
  },
];

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F4F5F8] relative overflow-x-hidden flex flex-col">
      {/* Subtle ambient fintech gradient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 75% 15%, rgba(139, 124, 255, 0.14), transparent 68%), radial-gradient(ellipse 45% 40% at 15% 85%, rgba(39, 201, 138, 0.06), transparent 70%)',
        }}
      />

      {/* Minimal App Onboarding Header */}
      <header className="relative z-10 w-full max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/50 rounded-lg"
        >
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-lg bg-[#8B7CFF]/15 border border-[#8B7CFF]/40 flex items-center justify-center"
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-[#8B7CFF] rotate-45" />
          </span>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F4F5F8]">
            SpendWise
          </span>
        </Link>

        <Link
          to="/login"
          className="text-sm font-medium text-[#9299A8] hover:text-[#F4F5F8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2 px-1"
        >
          Sign In
        </Link>
      </header>

      {/* Main Welcome & Preview Stage */}
      <main className="relative z-10 flex-1 w-full max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-10 pt-4 pb-12 sm:py-10 lg:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-y-7 lg:gap-y-8 lg:gap-x-12 items-start">
          {/* Welcome Copy & Desktop Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-end space-y-6"
          >
            <div className="space-y-4">
              <h1 className="font-display text-[2rem] sm:text-[2.55rem] lg:text-[2.85rem] font-bold tracking-tight leading-[1.08] text-[#F4F5F8] text-balance">
                Take Control of Every Naira, Dollar &amp; Pound.
              </h1>
              <p className="text-[15px] sm:text-base text-[#9299A8] leading-relaxed max-w-lg">
                Track your spending, manage budgets and understand your financial health across
                multiple currencies — all from one place.
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-start gap-3 pt-1">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#8B7CFF] hover:bg-[#7A6AF8] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/60"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <p className="text-xs text-[#9299A8]">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#8B7CFF] font-medium hover:underline underline-offset-4"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </motion.div>

          {/* Single Interactive Dashboard Preview (Mobile: below welcome, Desktop: right centerpiece) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 lg:self-center"
          >
            <DashboardPreview />
          </motion.div>

          {/* Compact Core Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="order-3 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {CORE_CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl bg-[#151923]/85 border border-[#282E3B] p-3.5 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#8B7CFF]/12 border border-[#8B7CFF]/25 text-[#8B7CFF] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold text-[#F4F5F8] leading-snug">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#9299A8] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Mobile Onboarding Bottom Actions */}
          <div className="order-4 lg:hidden flex flex-col items-stretch gap-3 pt-1">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#8B7CFF] hover:bg-[#7A6AF8] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/60"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <p className="text-center text-xs text-[#9299A8]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#8B7CFF] font-medium hover:underline underline-offset-4"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
