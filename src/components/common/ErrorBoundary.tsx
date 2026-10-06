import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (window.confirm('Reset local application state? This will restore initial sample data.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                <p className="text-sm text-slate-400">An unexpected error occurred during display rendering.</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-700/60 font-mono text-xs text-red-300 overflow-x-auto max-h-48">
              <p className="font-bold">{this.state.error?.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 text-slate-400 text-[11px] whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
