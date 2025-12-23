import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // In a real app, send this to a logging service (Sentry, etc.)
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md bg-surface border border-surfaceLight rounded-lg p-6 text-center">
            <h1 className="text-xl font-bold text-text mb-3">Something went wrong</h1>
            <p className="text-textMuted text-sm mb-4">
              An unexpected error occurred in the UI. Please refresh the page. If the problem
              persists, contact the maintainer.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


