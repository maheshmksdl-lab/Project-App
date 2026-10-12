"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Navigation drawer state (phones / tablets), shared by the header's menu button and the sidebar. */
interface ShellState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const value = useMemo(() => ({ drawerOpen, setDrawerOpen }), [drawerOpen]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

/** Main content column, offset by the header and the desktop sidebar. */
export function ShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="app-content flex min-h-dvh flex-col">
      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
