import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[var(--hero-surface)] text-[14px] text-[var(--hero-ink)]" role="alert">
      <p>页面暂时无法打开，请检查网络后重试</p>
      <button className="h-9 rounded-md border border-current/20 px-4" onClick={() => window.location.reload()}>重新加载</button>
    </main>;
  }
}
export function RouteLoadBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <LoadBoundary key={pathname}>{children}</LoadBoundary>;
}
