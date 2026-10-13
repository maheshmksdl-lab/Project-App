"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon, FlagIcon, HourglassIcon, InfoIcon, SealCheckIcon, SparkleIcon, UsersThreeIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportData } from "@/hooks/use-workspace";
import { formatDate, pluralize } from "@/lib/format";
import { STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";

interface Insight {
  key: string;
  icon: Icon;
  fg: string;
  bg: string;
  title: string;
  body: ReactNode;
  action: { label: string; href: string };
}

const plus = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * "Ask AI": EVI's checks over this workspace — blocked or at-risk projects,
 * overdue work, overloaded people, late approvals and milestones due soon.
 * Worked out from the data on screen; no AI model is connected in this preview.
 */
export function InsightsSheet({ onClose }: { onClose: () => void }) {
  const { data } = useReportData();

  let insights: Insight[] = [];
  if (data) {
    const { projects, approvals, today } = data;
    const troubled = projects.filter((p) => p.status === "blocked" || p.status === "at_risk");
    const overdue = projects.flatMap((p) => p.tasks.filter((t) => t.status !== "done" && t.dueDate < today).map((t) => ({ t, p })));
    const loaded = data.workload.filter((w) => w.open >= 6).sort((a, b) => b.open - a.open);
    const lateApprovals = approvals.filter((a) => a.status === "pending" && a.dueDate < today);
    const soon = projects
      .flatMap((p) => p.milestones.filter((m) => m.state !== "completed" && m.endDate >= today && m.endDate <= plus(today, 7)).map((m) => ({ m, p })))
      .sort((a, b) => a.m.endDate.localeCompare(b.m.endDate));
    insights = [
      ...troubled.map((p) => ({
        key: `p-${p.id}`,
        icon: WarningIcon,
        fg: p.status === "blocked" ? "#DC2626" : "#EA580C",
        bg: p.status === "blocked" ? "#FEF2F2" : "#FFF4EB",
        title: `${p.name} is ${STATUS_META[p.status].label.toLowerCase()}`,
        body: `${p.progress}% complete, due ${formatDate(p.endDate)}. ${pluralize(p.tasks.filter((t) => t.status !== "done" && t.dueDate < today).length, "task")} overdue.`,
        action: { label: "Open project", href: projectHref(p.id) },
      })),
      ...(overdue.length
        ? [
            {
              key: "overdue",
              icon: HourglassIcon,
              fg: "#DC2626",
              bg: "#FEF2F2",
              title: `${pluralize(overdue.length, "task")} past due`,
              body: `Oldest: “${overdue.sort((a, b) => a.t.dueDate.localeCompare(b.t.dueDate))[0].t.title}” in ${overdue[0].p.name}.`,
              action: { label: "See overdue tasks", href: "/reports" },
            },
          ]
        : []),
      ...loaded.map((w) => ({
        key: `w-${w.person.id}`,
        icon: UsersThreeIcon,
        fg: "#5B3FF3",
        bg: "#F1EEFE",
        title: `${w.person.name} may be overloaded`,
        body: `${pluralize(w.open, "open task")}${w.overdue ? `, ${w.overdue} overdue` : ""}. Consider reassigning some work.`,
        action: { label: "View workload", href: "/reports" },
      })),
      ...(lateApprovals.length
        ? [
            {
              key: "approvals",
              icon: SealCheckIcon,
              fg: "#EA580C",
              bg: "#FFF4EB",
              title: `${pluralize(lateApprovals.length, "approval")} waiting past the due date`,
              body: lateApprovals.map((a) => a.title).join(", "),
              action: { label: "Review approvals", href: "/workflows?tab=approvals" },
            },
          ]
        : []),
      ...soon.slice(0, 3).map(({ m, p }) => ({
        key: `m-${p.id}-${m.id}`,
        icon: FlagIcon,
        fg: "#15803D",
        bg: "#ECFDF3",
        title: `${m.name} is due ${formatDate(m.endDate)}`,
        body: `Milestone in ${p.name}${m.state === "in_progress" ? ` · ${m.progress ?? 0}% done` : " · not started yet"}.`,
        action: { label: "Open project", href: projectHref(p.id) },
      })),
    ];
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[440px]">
        <div className="border-b border-line-soft px-5 pt-5 pb-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <SparkleIcon size={19} weight="duotone" className="text-brand" aria-hidden />
            EVI insights
          </SheetTitle>
          <SheetDescription className="mt-1 text-[12.5px] leading-5 text-ink-muted">Risks and next steps across your projects, tasks and approvals.</SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {!data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : insights.length ? (
            <ul className="space-y-3">
              {insights.map((i) => {
                const IconCmp = i.icon;
                return (
                  <li key={i.key} className="flex gap-3 rounded-xl border border-line bg-card p-3.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color: i.fg, backgroundColor: i.bg }}>
                      <IconCmp size={19} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-5 font-semibold text-ink">{i.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-5 text-ink-body">{i.body}</p>
                      <Link href={i.action.href} onClick={onClose} className="mt-1.5 inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
                        {i.action.label}
                        <ArrowRightIcon size={12} weight="bold" aria-hidden />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-[13px] text-ink-muted">Nothing needs attention right now.</p>
          )}
        </div>
        <p className="flex items-start gap-2 border-t border-line-soft px-5 py-3 text-[12px] leading-4 text-ink-muted">
          <InfoIcon size={14} aria-hidden className="mt-px shrink-0" />
          These checks are worked out from the data in this workspace. No AI model is connected in this preview, so free-text questions aren&apos;t available.
        </p>
      </SheetContent>
    </Sheet>
  );
}
