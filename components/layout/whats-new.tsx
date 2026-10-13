"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon, ChecksIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/shared/project-ui";
import { useStoredState } from "@/hooks/use-stored-state";
import { formatDate } from "@/lib/format";
import { RELEASE_NOTES } from "@/lib/mock-data/releases";
import type { ReleaseCategory } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

const NONE_READ: string[] = [];

const CATEGORY: Record<ReleaseCategory, { label: string; fg: string; bg: string }> = {
  new: { label: "New", fg: "#5B3FF3", bg: "#F1EEFE" },
  improved: { label: "Improved", fg: "#2563EB", bg: "#EFF6FF" },
  fixed: { label: "Fixed", fg: "#15803D", bg: "#ECFDF3" },
};

/** Read state of the release notes, kept in this browser (a preference, not project data). */
export function useWhatsNew() {
  const [read, setRead] = useStoredState<string[]>("evoq-projects:whats-new-read", NONE_READ);
  const unread = RELEASE_NOTES.filter((n) => !read.includes(n.id)).length;
  return {
    read,
    unread,
    markRead: (id: string) => !read.includes(id) && setRead([...read, id]),
    markUnread: (id: string) => setRead(read.filter((x) => x !== id)),
    markAll: () => setRead(RELEASE_NOTES.map((n) => n.id)),
  };
}

export function WhatsNewSheet({ onClose }: { onClose: () => void }) {
  const { read, unread, markRead, markUnread, markAll } = useWhatsNew();
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[440px]">
        <div className="border-b border-line-soft px-5 pt-5 pb-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <SparkleIcon size={19} className="text-brand" aria-hidden />
            What&apos;s new
          </SheetTitle>
          <SheetDescription className="mt-1 text-[12.5px] leading-5 text-ink-muted">Sample release notes for this preview of EVOQ Projects.</SheetDescription>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px] text-ink-body" aria-live="polite">
              {unread ? `${unread} unread` : "All caught up"}
            </span>
            <button
              type="button"
              onClick={markAll}
              disabled={!unread}
              className="inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-brand hover:text-brand-press disabled:text-ink-faint focus-visible:outline-2 focus-visible:outline-brand-action"
            >
              <ChecksIcon size={14} aria-hidden />
              Mark all as read
            </button>
          </div>
        </div>
        <ol className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {RELEASE_NOTES.map((n) => {
            const isRead = read.includes(n.id);
            const c = CATEGORY[n.category];
            return (
              <li key={n.id} className={cn("relative rounded-xl px-3 py-3", !isRead && "bg-brand-surface")}>
                <div className="flex items-center gap-2">
                  {!isRead && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  <Badge fg={c.fg} bg={c.bg}>
                    {c.label}
                  </Badge>
                  <span className="text-[12px] text-ink-muted">{formatDate(n.date)}</span>
                  <button
                    type="button"
                    onClick={() => (isRead ? markUnread(n.id) : markRead(n.id))}
                    className="ml-auto inline-flex items-center gap-1 rounded text-[12px] font-medium text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
                  >
                    {isRead ? "Mark unread" : (
                      <>
                        <CheckIcon size={12} aria-hidden /> Mark read
                      </>
                    )}
                  </button>
                </div>
                <h3 className="mt-2 text-[14px] leading-5 font-semibold text-ink">{n.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-body">{n.body}</p>
                {n.href && (
                  <Link
                    href={n.href}
                    onClick={() => {
                      markRead(n.id);
                      onClose();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action"
                  >
                    Take a look
                    <ArrowRightIcon size={12} weight="bold" aria-hidden />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
