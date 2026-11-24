import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <div className="w-4 h-4 rounded-full border-2 border-[#8B7CFF] border-t-transparent animate-spin" />
          <span>Loading SpendWise workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <div className="w-4 h-4 rounded-full border-2 border-[#8B7CFF] border-t-transparent animate-spin" />
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
