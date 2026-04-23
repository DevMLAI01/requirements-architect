'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    console.error('[ErrorBoundary] Caught error:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-1 text-sm font-semibold text-red-800">Render error</h2>
            <p className="font-mono text-sm text-red-700">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
