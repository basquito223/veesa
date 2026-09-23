import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // In production, send to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleHardReset = (): void => {
    try {
      localStorage.removeItem('visaflow_user_answers_v5');
      localStorage.removeItem('visaflow_dossier_id_v5');
      localStorage.removeItem('visaflow_has_completed_v5');
      localStorage.removeItem('visaflow_session_v5');
    } catch {
      // Ignore storage errors
    }
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans antialiased text-slate-900">
          <div
            id="error-boundary-fallback"
            role="alert"
            aria-live="assertive"
            className="w-full max-w-lg bg-white border border-slate-300 rounded-xl shadow-lg p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h1 className="text-lg font-bold text-slate-950">
                  Une anomalie d’affichage est survenue
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  L’application a rencontré une erreur d’exécution imprévue. Vos données déclarées
                  restent enregistrées localement dans votre navigateur.
                </p>
              </div>
            </div>

            {this.state.error && (
              <details className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700">
                <summary className="cursor-pointer font-bold text-slate-800 select-none">
                  Détails techniques de l’anomalie
                </summary>
                <p className="mt-2 text-rose-700 break-all">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-[11px] overflow-x-auto text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                id="btn-error-reload"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Recharger la page</span>
              </button>

              <button
                type="button"
                id="btn-error-reset"
                onClick={this.handleHardReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-rose-300 text-rose-700 text-sm font-semibold rounded-lg hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Réinitialiser</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
