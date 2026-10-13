"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppDialogsProvider } from "@/components/shared/app-dialogs";
import { CreateProvider } from "@/components/shared/create-dialogs";
import { useHydrated } from "@/hooks/use-hydrated";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SIGNED_OUT_ROUTE, useSignedOut } from "./session";
import { ShellContent, ShellProvider } from "./shell-context";

/** The Projects app frame (sidebar, header) around every page, plus the dialogs they share. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const [signedOut] = useSignedOut();
  const guarded = hydrated && signedOut && pathname !== SIGNED_OUT_ROUTE;

  // After Log out, every workspace page sends this tab to the signed-out screen.
  useEffect(() => {
    if (guarded) router.replace(SIGNED_OUT_ROUTE);
  }, [guarded, router]);

  if (pathname === SIGNED_OUT_ROUTE) return <main id="main">{children}</main>;
  if (guarded) return null;

  return (
    <ShellProvider>
      <CreateProvider>
        <AppDialogsProvider>
          <AppSidebar />
          <AppHeader />
          <ShellContent>{children}</ShellContent>
        </AppDialogsProvider>
      </CreateProvider>
    </ShellProvider>
  );
}
