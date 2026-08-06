import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Mail, Bug, ShieldAlert, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

/**
 * ============================================================================
 * ERROR BOUNDARY ARCHITECTURE & DOCUMENTATION
 * ============================================================================
 * 
 * 1. HOW ERROR BOUNDARIES WORK:
 *    React Error Boundaries are class components that catch JavaScript errors
 *    anywhere in their child component tree, log those errors, and display a
 *    fallback UI instead of crashing the entire application.
 * 
 * 2. WHAT ERRORS ARE CAUGHT:
 *    - Errors during React render phase
 *    - Errors in lifecycle methods (componentDidMount, useEffect errors in render, etc.)
 *    - Errors in constructors of the child component tree
 * 
 * 3. WHAT ERRORS ARE NOT CAUGHT (Requires standard try/catch or window listeners):
 *    - Event handlers (e.g., onClick, onSubmit) -> Use standard try/catch blocks inside the handler
 *    - Asynchronous code (e.g., setTimeout, requestAnimationFrame, Promise rejections)
 *    - Server-side rendering (SSR)
 *    - Errors thrown in the Error Boundary component itself (rather than its children)
 * 
 * 4. FUTURE INTEGRATION WITH ERROR TRACKING SERVICES:
 *    You can easily forward the error and component stack in `componentDidCatch` to
 *    external error monitors such as Sentry, LogRocket, Datadog, or Rollbar:
 *    ```ts
 *    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
 *    ```
 * 
 * 5. USAGE PATTERN:
 *    ```tsx
 *    <ErrorBoundary name="Settings View" onError={(err, info) => logToAnalytics(err)}>
 *      <Settings />
 *    </ErrorBoundary>
 *    ```
 * ============================================================================
 */

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  boundaryName?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  /**
   * Called during render phase when a descendant component throws an error.
   * Updates state so the next render shows the fallback UI.
   */
  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error 
    };
  }

  /**
   * Called during commit phase after an error has been caught.
   * Performs side-effects like error logging and persistence.
   */
  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || "Default"}] Caught error:`, error, errorInfo);
    
    this.setState({ errorInfo });

    // Execute optional user callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.error("Error inside onError callback:", err);
      }
    }

    // Persist error to local storage for Settings Diagnostics viewer
    try {
      const existingLogsStr = localStorage.getItem("gbk_error_logs");
      const existingLogs: ErrorLogEntry[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      const newEntry: ErrorLogEntry = {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        message: error.message || "Unknown rendering exception",
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        boundaryName: this.props.name || "App Boundary"
      };

      // Keep last 50 error entries
      const updatedLogs = [newEntry, ...existingLogs].slice(0, 50);
      localStorage.setItem("gbk_error_logs", JSON.stringify(updatedLogs));
    } catch (e) {
      console.warn("Could not write error log to localStorage:", e);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
  };

  private handleReportIssue = () => {
    const subject = encodeURIComponent(`[App Support] Error Report - ${this.props.name || "Component"}`);
    const body = encodeURIComponent(
      `An error occurred in ${this.props.name || "the application"}:\n\n` +
      `Error: ${this.state.error?.message || "Unknown"}\n\n` +
      `Stack:\n${this.state.error?.stack || "No stack trace"}\n\n` +
      `Component Stack:\n${this.state.errorInfo?.componentStack || "No component stack"}`
    );
    window.open(`mailto:support@gbkfinancial.ca?subject=${subject}&body=${body}`, "_blank");
  };

  private handleCopyError = () => {
    const errorText = `Boundary: ${this.props.name || "App Boundary"}\n` +
      `Error: ${this.state.error?.message}\n\n` +
      `Stack:\n${this.state.error?.stack}\n\n` +
      `Component Stack:\n${this.state.errorInfo?.componentStack}`;
    
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(err => console.error("Clipboard copy failed:", err));
  };

  public render() {
    if (this.state.hasError) {
      // If a custom fallback is provided via props, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check user preference for showing details
      const showDevDetails = localStorage.getItem("gbk_show_dev_error_details") !== "false";

      return (
        <div className="w-full p-6 my-4 bg-red-950/20 border border-red-500/30 rounded-2xl shadow-xl backdrop-blur-md text-[var(--color-text)]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl shrink-0 text-red-400 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                  {this.props.name || "Component Exception"}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-[var(--color-text)] mt-1.5 leading-snug">
                Something went wrong in this section
              </h3>

              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                An unhandled rendering error occurred. The rest of your application is still working safely.
              </p>

              {/* Error Message Box */}
              <div className="mt-3 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs font-mono text-red-200 break-words select-text">
                <strong className="text-red-400 font-sans font-bold block mb-0.5">Error Message:</strong>
                {this.state.error?.message || "An unexpected error occurred."}
              </div>

              {/* Action Bar */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={this.handleReportIssue}
                  className="px-3.5 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Report Issue
                </button>

                {showDevDetails && (
                  <button
                    type="button"
                    onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                    className="px-3 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                  >
                    <Bug className="w-3.5 h-3.5" />
                    {this.state.showDetails ? "Hide Stack Trace" : "View Stack Trace"}
                    {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Collapsible Stack Trace / Component Stack */}
              {this.state.showDetails && (
                <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-amber-400" /> Technical Details &amp; Stack Trace
                    </span>
                    <button
                      type="button"
                      onClick={this.handleCopyError}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {this.state.copied ? "Copied" : "Copy Stack"}
                    </button>
                  </div>

                  {this.state.error?.stack && (
                    <div>
                      <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">Stack Trace:</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80 max-h-48 leading-relaxed">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="text-[10px] text-sky-400 font-bold uppercase mb-1">Component Stack:</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80 max-h-48 leading-relaxed">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
