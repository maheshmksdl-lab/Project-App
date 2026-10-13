"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignInIcon } from "@phosphor-icons/react/dist/ssr";
import { PrimaryButton } from "@/components/shared/project-ui";
import { HOME_ROUTE } from "@/lib/routes";
import { useSignedOut } from "./session";

/** Shown after Log out. Signing back in clears the tab's signed-out flag; there's no password because there are no real accounts. */
export function SignedOutView() {
  const router = useRouter();
  const [signedOut, setSignedOut] = useSignedOut();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-7 text-center shadow-card">
        <Image src="/media/ai-app-projects.png" alt="Projects" width={184} height={55} priority className="mx-auto h-10 w-auto" />
        <h1 className="mt-6 text-[20px] leading-7 font-semibold text-ink">{signedOut ? "You're signed out" : "You're signed in"}</h1>
        <p className="mt-2 text-[13.5px] leading-[21px] text-ink-muted">
          {signedOut ? "Your workspace is hidden in this browser tab. This preview has no real accounts, so signing in again doesn't ask for a password." : "Continue to your workspace."}
        </p>
        <PrimaryButton
          icon={SignInIcon}
          className="mt-6 w-full"
          onClick={() => {
            setSignedOut(false);
            router.replace(HOME_ROUTE);
          }}
        >
          {signedOut ? "Sign in again" : "Go to Home"}
        </PrimaryButton>
      </div>
    </div>
  );
}
