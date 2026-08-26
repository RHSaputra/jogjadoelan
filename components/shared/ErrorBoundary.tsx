"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — mencegah crash seluruh aplikasi akibat error di komponen.
 * Wrap bagian UI yang mungkin error (chart, tabel besar, form kompleks).
 *
 * Contoh penggunaan:
 *   <ErrorBoundary fallback={<div>Gagal memuat.</div>}>
 *     <ComponentBerat />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log error ke monitoring service jika ada
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <h3 className="mb-1 font-semibold text-gray-800">Terjadi kesalahan</h3>
          <p className="mb-4 text-sm text-gray-500">
            Komponen ini mengalami error dan tidak bisa ditampilkan.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Coba Lagi
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-4 w-full max-w-md text-left">
              <summary className="cursor-pointer text-xs text-gray-400">Detail Error (dev only)</summary>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs text-red-600">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary — HOC untuk wrap komponen dengan ErrorBoundary.
 * 
 * Contoh:
 *   export default withErrorBoundary(HeavyChart);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `WithErrorBoundary(${Component.displayName ?? Component.name})`;
  return Wrapped;
}
