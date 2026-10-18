'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'

interface InnerProps {
    children?: ReactNode
    /** Changes whenever the route changes — used to auto-reset the boundary on navigation. */
    resetKey?: string | null
    onReset?: () => void
    onGoHome?: () => void
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundaryInner extends Component<InnerProps, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public componentDidUpdate(prevProps: InnerProps) {
        // Reset the boundary when the route changes, so navigating the sidebar
        // recovers from a crashed page instead of staying stuck on the error UI.
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, error: null })
        }
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null })
        this.props.onReset?.()
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-white rounded-xl border border-red-100 shadow-sm m-4">
                    <div className="p-4 bg-red-50 rounded-full mb-6">
                        <AlertTriangle className="h-12 w-12 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        The application encountered an unexpected error. You can try again, or
                        navigate to another page from the sidebar.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            onClick={this.handleReset}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={this.props.onGoHome}
                            className="border-gray-200"
                        >
                            <Home className="mr-2 h-4 w-4" />
                            Go to Dashboard
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 text-left w-full max-w-2xl overflow-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-mono text-red-800 break-all">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Route-aware error boundary. Reading the pathname lets us reset the inner
 * class boundary whenever the user navigates, so a single crashed page never
 * wedges the whole dashboard.
 */
export function ErrorBoundary({ children }: { children?: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    return (
        <ErrorBoundaryInner
            resetKey={pathname}
            onReset={() => router.refresh()}
            onGoHome={() => router.push('/dashboard')}
        >
            {children}
        </ErrorBoundaryInner>
    )
}
