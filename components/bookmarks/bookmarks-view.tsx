"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  BookmarkSimpleIcon,
  ChartBarIcon,
  CheckSquareIcon,
  FileIcon,
  FolderSimpleIcon,
  NoteIcon,
  SquaresFourIcon,
  TreeStructureIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, OutlineButton, PageShell } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { PageHeader, SearchInput } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useBookmarks, useToggleBookmark } from "@/hooks/use-workspace";
import { formatDate } from "@/lib/format";
import type { BookmarkType } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

const TYPE: Record<BookmarkType, { label: string; icon: Icon; fg: string; bg: string }> = {
  project: { label: "Projects", icon: FolderSimpleIcon, fg: "#5B3FF3", bg: "#F1EEFE" },
  task: { label: "Tasks", icon: CheckSquareIcon, fg: "#15803D", bg: "#ECFDF3" },
  workflow: { label: "Workflows", icon: TreeStructureIcon, fg: "#EA580C", bg: "#FFF4EB" },
  template: { label: "Templates", icon: SquaresFourIcon, fg: "#5B3FF3", bg: "#F1EEFE" },
  note: { label: "Notes", icon: NoteIcon, fg: "#B45309", bg: "#FFF7E8" },
  file: { label: "Files", icon: FileIcon, fg: "#2563EB", bg: "#EFF6FF" },
  report: { label: "Reports & pages", icon: ChartBarIcon, fg: "#2563EB", bg: "#EFF6FF" },
  team: { label: "Teams", icon: UsersThreeIcon, fg: "#475467", bg: "#F2F4F7" },
};

export function BookmarksView() {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useBookmarks();
  const toggle = useToggleBookmark();
  const [q, setQ] = useState("");
  const [type, setType] = useState<BookmarkType | "all">("all");

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const b of data ?? []) c.set(b.bookmark.type, (c.get(b.bookmark.type) ?? 0) + 1);
    return c;
  }, [data]);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((b) => (type === "all" || b.bookmark.type === type) && (!needle || b.title.toLowerCase().includes(needle) || b.subtitle.toLowerCase().includes(needle)));
  }, [data, q, type]);

  return (
    <PageShell>
      <PageHeader title="Bookmarks" subtitle="Projects, tasks, workflows and other records you've saved for quick access." />
      <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Bookmark types">
        {(["all", ...Object.keys(TYPE)] as (BookmarkType | "all")[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
              type === t ? "border-brand-soft bg-brand-tint text-brand" : "border-line bg-white text-ink-body hover:border-brand-soft",
            )}
          >
            {t === "all" ? "All" : TYPE[t].label}
            <span className="text-[11px] text-ink-muted tabular-nums">{t === "all" ? (data?.length ?? "") : (counts.get(t) ?? 0)}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search bookmarks..." label="Search bookmarks" />
      </div>
      <div className="mt-4">
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookmarkSimpleIcon}
              title={data.length ? "No bookmarks match" : "No bookmarks yet"}
              hint={data.length ? "Try a different search or type." : "Use the bookmark button on a project, task, workflow, template, note, file or report to save it here."}
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {items.map(({ bookmark, title, subtitle, href }) => {
              const t = TYPE[bookmark.type];
              const IconCmp = t.icon;
              const body = (
                <>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color: t.fg, backgroundColor: t.bg }}>
                    <IconCmp size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px] leading-5 font-medium", href ? "text-ink" : "text-ink-muted")}>{title}</span>
                    <span className="block truncate text-[12px] leading-4 text-ink-muted">
                      {t.label.replace(/s$/, "").replace(" & page", "")} · {subtitle} · saved {formatDate(bookmark.createdAt.slice(0, 10))}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={bookmark.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-card pr-2 shadow-card">
                  {href ? (
                    <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">{body}</div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ type: bookmark.type, refId: bookmark.refId }, { onSuccess: () => toast.success("Bookmark removed", { description: title }) })}
                    aria-label={`Remove bookmark: ${title}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] focus-visible:outline-2 focus-visible:outline-brand-action"
                  >
                    <XIcon size={15} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
