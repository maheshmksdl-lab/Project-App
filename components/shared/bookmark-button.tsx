"use client";

import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { useBookmarkKeys, useToggleBookmark } from "@/hooks/use-workspace";
import type { BookmarkType } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

/** Whether a record is bookmarked, and a toggle that confirms with a toast. Records are keyed by type and stable id. */
export function useBookmark(type: BookmarkType, refId: string, label: string) {
  const { data: keys } = useBookmarkKeys();
  const toggleM = useToggleBookmark();
  const saved = !!keys?.includes(`${type}:${refId}`);
  const toggle = () =>
    toggleM.mutate(
      { type, refId },
      {
        onSuccess: (now) => toast.success(now ? "Bookmarked" : "Bookmark removed", { description: label }),
        onError: (err) => toast.error("Couldn't update the bookmark", { description: err.message }),
      },
    );
  return { saved, toggle, pending: toggleM.isPending };
}

/** Square toggle for headers and cards. */
export function BookmarkButton({ type, refId, label, className }: { type: BookmarkType; refId: string; label: string; className?: string }) {
  const { saved, toggle, pending } = useBookmark(type, refId, label);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove bookmark: ${label}` : `Bookmark ${label}`}
      title={saved ? "Remove bookmark" : "Bookmark"}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
        saved ? "text-brand hover:bg-brand-10" : "text-ink-muted hover:bg-brand-depth-10 hover:text-ink",
        className,
      )}
    >
      <BookmarkSimpleIcon size={18} weight={saved ? "fill" : "regular"} aria-hidden />
    </button>
  );
}
