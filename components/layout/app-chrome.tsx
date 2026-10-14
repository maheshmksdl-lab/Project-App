"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppDialogsProvider } from "@/components/shared/app-dialogs";
import { CreateProvider } from "@/components/shared/create-dialogs";
import { useHydrated } from "@/hooks/use-hydrated";
import { AUTH_ROUTES } from "@/lib/routes";
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
  // The signed-out screen and the sign-in pages stand alone, without the workspace frame.
  const standalone = pathname === SIGNED_OUT_ROUTE || AUTH_ROUTES.includes(pathname);
  const guarded = hydrated && signedOut && !standalone;

  // After Log out, every workspace page sends this tab to the signed-out screen.
  useEffect(() => {
    if (guarded) router.replace(SIGNED_OUT_ROUTE);
  }, [guarded, router]);

  if (standalone) return <main id="main">{children}</main>;
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
