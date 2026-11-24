import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('SpendWise ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage) as { error?: string; path?: string };
        if (parsed && parsed.error) {
          friendly = `Database access error${parsed.path ? ` (${parsed.path})` : ''}: ${parsed.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#F06464]/15 text-[#F06464] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
              {friendly}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Reload SpendWise
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
