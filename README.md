# SpendWise — Personal Finance Management Application

SpendWise is a full-stack personal finance management application built with React 19, TypeScript (strict mode), Tailwind CSS, Recharts, Express / Vercel Serverless APIs, Firebase Authentication, and Cloud Firestore.

## 1. Features

- **Authentication & Onboarding**: Email/password registration, email/password login, Google Sign-In, password reset, password updates, persistent browser sessions, and automatic provisioning of user profiles (`NGN` default currency) and 18 default categories (12 expense, 6 income).
- **Financial Dashboard**: Real-time KPI cards (Total Balance, Total Income, Total Expenses, Net Savings & Savings Rate), period-over-period comparisons, native currency wallet breakdowns (`NGN`, `USD`, `GBP`), interactive spending/cash flow charts, and monthly budget progress.
- **Transaction Management**: Full CRUD with Zod validation, live search, multi-facet filters (type, category, currency, payment method, date range), column sorting, configurable pagination (`10 / 25 / 50`), and confirmation on deletion.
- **Category Management**: Custom income/expense categories with Lucide icons and hex colors, plus atomic transaction/budget reassignment before deleting categories in use.
- **Monthly Budgets**: Category-level monthly budgets per currency with duplicate prevention, live actual spend calculation, remaining balance, and visual status warnings (`Healthy`, `Warning`, `Near limit`, `Exceeded`).
- **Multi-Currency Support**: Preserves original transaction currencies (`NGN`, `USD`, `GBP`), calculates exact arithmetic via `Decimal.js`, syncs live exchange rates securely through `/api/exchange-rates`, and supports manual fallback rate overrides with explicit rate dates and missing-rate indicators.
- **Reports & CSV Export**: Seven Recharts analytics views (Income vs Expenses, Monthly Cash Flow, Expense Breakdown, Income Breakdown, Spending Trends, Savings Rate Trends, Budget Performance) plus RFC-4180 CSV export via PapaParse.
- **Settings**: Profile updates, default/reporting currency selection, date format preferences, Dark/Light/System theme switching, exchange rate management, and account security controls.

## 2. Technology Stack

- **Frontend**: React 19, TypeScript (strict), Vite, React Router, Tailwind CSS v4, Lucide React
- **Forms & Validation**: React Hook Form, Zod
- **Charts & Math**: Recharts, Decimal.js, date-fns, PapaParse, Sonner
- **Backend & Database**: Express (`server.ts`) / Vercel Serverless (`api/exchange-rates.ts`), Firebase Authentication, Cloud Firestore, Firestore Security Rules

## 3. Local Installation

```bash
git clone <your-repo-url>
cd spendwise
npm install
cp .env.example .env
```

## 4. Firebase Setup

Firebase Authentication and Cloud Firestore are provisioned via `firebase-applet-config.json` (project `spatial-campaign-nlvvl`, Firestore database `ai-studio-53477b55-f978-4802-8bdc-0dd81c0e73d4`).

- **Google Sign-In**: Enabled automatically.
- **Email/Password Sign-In** (optional if using Email/Password login): In Firebase Console → **Build → Authentication → Sign-in method**, toggle on **Email/Password**.
- **Profile Pictures**: Uploaded images (JPG, JPEG, PNG, WebP up to 5 MB) are validated, optimized client-side, and stored securely on the authenticated user's `users/{userId}` Cloud Firestore document under strict owner-only security rules—no paid Firebase Storage upgrade is required.
- **Security Rules & Indexes**: Deployed from `firestore.rules` and `firestore.indexes.json`.

## 5. Environment Variables

No manually supplied API keys are required. SpendWise uses the provisioned `firebase-applet-config.json` and public key-free exchange rate endpoints (`open.er-api.com` with `currency-api` fallback and manual rate overrides).

```env
APP_URL="http://localhost:3000"
```

## 6. Local Development & Production Build

```bash
# Start full-stack dev server on http://localhost:3000
npm run dev

# TypeScript strict check
npm run lint

# Production build
npm run build

# Start production Node server
npm run start
```

## 7. GitHub & Vercel Deployment

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial SpendWise production release"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Import the repository in [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in Vercel Project Settings.
4. Deploy (`npm run build` outputs to `dist/`, `vercel.json` handles SPA rewrites, and `api/exchange-rates.ts` serves `/api/exchange-rates`).
5. Add your deployed Vercel domain to **Firebase Console → Authentication → Settings → Authorized domains**.
