/**
 * ErrorBoundary — catches unhandled React render errors and shows a recovery UI.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Awarely] Unhandled render error:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-full min-h-screen items-center justify-center bg-slate-950 p-6">
          <div className="max-w-sm text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-900/30 p-4">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <h1 className="mb-2 text-xl font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-slate-400">
              Awarely encountered an unexpected error. Please try again.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-24 overflow-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-500">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-teal-400 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
