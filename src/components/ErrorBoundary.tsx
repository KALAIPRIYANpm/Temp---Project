import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-page p-6">
          <div className="max-w-lg rounded border border-morning bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-cerulean">Something went wrong</h1>
            <p className="mt-2 text-sm text-mist">
              The app hit an unexpected error. Try refreshing the page. If it keeps
              happening, contact an administrator.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
