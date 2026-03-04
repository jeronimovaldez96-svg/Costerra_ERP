// ────────────────────────────────────────────────────────
// Costerra ERP — React Error Boundary
// Catches render-time errors and displays a recovery UI
// instead of a white screen of death.
// ────────────────────────────────────────────────────────

import React, { type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
    children: ReactNode
    /** Optional fallback to render instead of built-in error UI */
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[Costerra ErrorBoundary]', error, errorInfo.componentStack)
    }

    handleReload = (): void => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    handleRecover = (): void => {
        this.setState({ hasError: false, error: null })
    }

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children
        }

        if (this.props.fallback) {
            return this.props.fallback
        }

        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-danger-500/10 flex items-center justify-center">
                        <AlertTriangle size={24} className="text-danger-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-surface-100">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-surface-400 leading-relaxed">
                        An unexpected error occurred while rendering this section.
                        You can try recovering or reload the application.
                    </p>
                    {this.state.error && (
                        <pre className="text-xs text-danger-400 bg-surface-900/60 p-3 rounded-lg overflow-x-auto text-left max-h-32">
                            {this.state.error.message}
                        </pre>
                    )}
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button onClick={this.handleRecover} className="btn-ghost">
                            Try Again
                        </button>
                        <button onClick={this.handleReload} className="btn-primary">
                            <RotateCcw size={14} /> Reload App
                        </button>
                    </div>
                </div>
            </div>
        )
    }
}
