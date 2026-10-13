"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { OutlineButton, PrimaryButton } from "@/components/shared/project-ui";
import { useStoredState } from "@/hooks/use-stored-state";

export const SIGNED_OUT_ROUTE = "/signed-out";

/**
 * Frontend-only session: this preview has no accounts or server sessions, so
 * "signed out" is a flag for this browser tab that hides the workspace until
 * the person chooses to sign back in.
 */
export function useSignedOut() {
  return useStoredState<boolean>("evoq-projects:signed-out", false, "session");
}

export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [, setSignedOut] = useSignedOut();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="text-[17px] font-semibold text-ink">Log out of EVOQ Projects?</DialogTitle>
        <DialogDescription className="text-[14px] leading-[22px] text-ink-muted">
          You&apos;ll leave the workspace in this browser tab. This preview has no real accounts, so no server session is ended.
        </DialogDescription>
        <DialogFooter className="mt-2 gap-2">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton
            onClick={() => {
              setSignedOut(true);
              onClose();
              router.replace(SIGNED_OUT_ROUTE);
            }}
          >
            Log out
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
