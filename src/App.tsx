import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { AuthProvider } from '@/src/hooks/useAuth';
import { FinanceDataProvider } from '@/src/hooks/useFinanceData';
import { ProtectedRoute, PublicOnlyRoute } from '@/src/components/layout/RouteGuards';
import { AppShell } from '@/src/components/layout/AppShell';
import { LoginPage } from '@/src/pages/LoginPage';
import { RegisterPage } from '@/src/pages/RegisterPage';
import { ForgotPasswordPage } from '@/src/pages/ForgotPasswordPage';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { TransactionsPage } from '@/src/pages/TransactionsPage';
import { BudgetsPage } from '@/src/pages/BudgetsPage';
import { CategoriesPage } from '@/src/pages/CategoriesPage';
import { ReportsPage } from '@/src/pages/ReportsPage';
import { SettingsPage } from '@/src/pages/SettingsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FinanceDataProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicOnlyRoute>
                    <ForgotPasswordPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected Application Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <DashboardPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <TransactionsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <BudgetsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <CategoriesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ReportsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SettingsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Default & Fallback Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </FinanceDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
