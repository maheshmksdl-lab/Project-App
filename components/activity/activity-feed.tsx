"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatTextIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  FileIcon,
  FlagIcon,
  FolderSimpleIcon,
  LinkSimpleIcon,
  NoteIcon,
  SealCheckIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/shared/state-panels";
import { FilterSelect } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePeople, useProjects } from "@/hooks/use-projects";
import { useActivity } from "@/hooks/use-workspace";
import { formatAgo, formatDate } from "@/lib/format";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import type { ActivityEntry, ActivityType } from "@/lib/types/workspace";

const TYPE: Record<ActivityType, { label: string; icon: Icon; fg: string }> = {
  project: { label: "Projects", icon: FolderSimpleIcon, fg: "#5B3FF3" },
  status: { label: "Status changes", icon: TrendUpIcon, fg: "#EA580C" },
  task: { label: "Tasks", icon: CheckCircleIcon, fg: "#15803D" },
  milestone: { label: "Milestones", icon: FlagIcon, fg: "#15803D" },
  comment: { label: "Comments", icon: ChatTextIcon, fg: "#6A4FF6" },
  file: { label: "Files", icon: FileIcon, fg: "#2563EB" },
  note: { label: "Notes", icon: NoteIcon, fg: "#F59E0B" },
  approval: { label: "Approvals", icon: SealCheckIcon, fg: "#EA580C" },
  team: { label: "Teams", icon: UsersThreeIcon, fg: "#475467" },
  link: { label: "Links", icon: LinkSimpleIcon, fg: "#475467" },
};

const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60_000;

/** Groups entries under "Today", "Yesterday" or a date. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}

/**
 * Who did what, newest first — recorded as people use the app. Scoped to one
 * project on its Activity tab; across the workspace on the Activity page.
 */
export function ActivityFeed({ projectId, limit }: { projectId?: string; limit?: number }) {
  const hydrated = useHydrated();
  const { data, isPending } = useActivity(projectId);
  const { data: people } = usePeople();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const [type, setType] = useState<ActivityType | "all">("all");
  const [project, setProject] = useState("all");

  const items = useMemo(
    () => (data ?? []).filter((a) => (type === "all" || a.type === type) && (projectId || project === "all" || a.projectId === project)).slice(0, limit ?? Infinity),
    [data, type, project, projectId, limit],
  );
  const groups = useMemo(() => {
    const out: { label: string; entries: ActivityEntry[] }[] = [];
    for (const a of items) {
      const label = dayLabel(a.at);
      const last = out[out.length - 1];
      if (last?.label === label) last.entries.push(a);
      else out.push({ label, entries: [a] });
    }
    return out;
  }, [items]);
  const person = (id: string) => people?.find((p) => p.id === id);
  const projectName = (id: string | null) => (id ? projectList?.items.find((p) => p.id === id)?.name : undefined);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Activity type"
          value={type}
          onChange={setType}
          options={[{ value: "all", label: "All activity" }, ...(Object.keys(TYPE) as ActivityType[]).map((t) => ({ value: t, label: TYPE[t].label }))]}
        />
        {!projectId && (
          <FilterSelect
            label="Project"
            value={project}
            onChange={setProject}
            className="min-w-[180px]"
            options={[{ value: "all", label: "All projects" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
          />
        )}
      </div>
      {!hydrated || isPending ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon={ClockCounterClockwiseIcon} title="No activity yet" hint={type !== "all" ? "Try another activity type." : "Changes to tasks, files, comments, approvals and settings appear here as they happen."} className="py-10" />
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h3 className="mb-2 text-[12px] font-medium tracking-[0.04em] text-ink-muted uppercase">{g.label}</h3>
              <ol className="relative space-y-3 border-l border-line pl-5">
                {g.entries.map((a) => {
                  const t = TYPE[a.type];
                  const IconCmp = t.icon;
                  const who = person(a.actorId);
                  const pName = projectName(a.projectId);
                  return (
                    <li key={a.id} className="relative">
                      <span className="absolute top-1 -left-[29px] inline-flex size-[17px] items-center justify-center rounded-full bg-white ring-2 ring-white" aria-hidden>
                        <IconCmp size={15} weight="fill" style={{ color: t.fg }} />
                      </span>
                      <div className="flex items-start gap-2.5">
                        {who && <PersonAvatar name={who.name} src={who.avatar} size="sm" />}
                        <p className="min-w-0 flex-1 text-[13px] leading-5 text-ink-body">
                          <span className="font-medium text-ink">{who?.name ?? "Someone"}</span> {a.action} <span className="font-medium text-ink">{a.target}</span>
                          {a.detail && <span className="text-ink-muted"> · {a.detail}</span>}
                          {!projectId && pName && a.projectId && (
                            <>
                              {" "}
                              <Link href={projectHref(a.projectId)} className="text-ink-muted hover:text-brand">
                                in {pName}
                              </Link>
                            </>
                          )}
                        </p>
                        <time dateTime={a.at} className="shrink-0 text-[12px] text-ink-muted" title={new Date(a.at).toLocaleString()}>
                          {formatAgo(minutesSince(a.at))}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
