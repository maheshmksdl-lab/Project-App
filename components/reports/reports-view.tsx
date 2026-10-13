"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, CurrencyDollarIcon, DownloadSimpleIcon, FolderOpenIcon, TrendUpIcon, WarningIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { BarList, ChartCard } from "@/components/shared/chart-ui";
import { Card, CardHeader, OutlineButton, PageShell, PrimaryButton, StatusPill } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { FilterSelect, PageHeader, PersonChip, StatTile } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { useReportData, useTeams } from "@/hooks/use-workspace";
import type { ReportData } from "@/lib/api/workspace";
import { formatCurrency, formatDate } from "@/lib/format";
import { personById, PEOPLE } from "@/lib/mock-data/people";
import { TEAMS } from "@/lib/mock-data/teams";
import { STATUS_DOT, STATUS_META, TASK_STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import type { ProjectStatus, TaskStatus } from "@/lib/types/project";
import type { Team } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

type Scope = "all" | "active" | "completed";

const STATUS_ORDER: ProjectStatus[] = ["on_track", "at_risk", "blocked", "planning", "on_hold", "completed"];
const TASK_ORDER: TaskStatus[] = ["not_started", "in_progress", "in_review", "done"];
const TASK_COLOR: Record<TaskStatus, string> = { not_started: "#98A2B3", in_progress: "#6A4FF6", in_review: "#3B82F6", done: "#16A34A" };
const ACTIVE: ProjectStatus[] = ["on_track", "at_risk", "blocked"];

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/** Every number on the page comes from the same filtered slice, so tiles, charts and tables agree. */
function useReport(data: ReportData | undefined, teams: Team[], team: string, owner: string, scope: Scope) {
  return useMemo(() => {
    if (!data) return null;
    const teamProjects = team === "all" ? null : new Set(teams.find((t) => t.id === team)?.projectIds ?? []);
    const projects = data.projects.filter(
      (p) =>
        (!teamProjects || teamProjects.has(p.id)) &&
        (owner === "all" || p.ownerId === owner) &&
        (scope === "all" || (scope === "active" ? ACTIVE.includes(p.status) : p.status === "completed")),
    );
    const tasks = projects.flatMap((p) => p.tasks.map((t) => ({ ...t, project: p })));
    const open = tasks.filter((t) => t.status !== "done");
    const overdue = open.filter((t) => t.dueDate < data.today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const ids = new Set(projects.map((p) => p.id));
    const approvals = data.approvals.filter((a) => a.projectId && ids.has(a.projectId));
    const spent = projects.reduce((n, p) => n + p.budget.spent, 0);
    const total = projects.reduce((n, p) => n + p.budget.total, 0);
    const workload = PEOPLE.map((person) => {
      const mine = open.filter((t) => t.assigneeId === person.id);
      return { person, open: mine.length, overdue: mine.filter((t) => t.dueDate < data.today).length };
    })
      .filter((w) => w.open > 0)
      .sort((a, b) => b.open - a.open);
    const decided = approvals.filter((a) => a.decidedOn);
    const turnaround = decided.length
      ? Math.round(decided.reduce((n, a) => n + (new Date(a.decidedOn!).getTime() - new Date(a.requestedOn).getTime()) / 86_400_000, 0) / decided.length)
      : 0;
    const milestones = projects
      .flatMap((p) => p.milestones.filter((m) => m.state !== "completed" && m.endDate >= data.today).map((m) => ({ m, p })))
      .sort((a, b) => a.m.endDate.localeCompare(b.m.endDate))
      .slice(0, 6);
    return { projects, tasks, open, overdue, approvals, spent, total, workload, turnaround, milestones, today: data.today };
  }, [data, teams, team, owner, scope]);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useReportData();
  const { data: teams = TEAMS } = useTeams();
  const [team, setTeam] = useState("all");
  const [owner, setOwner] = useState("all");
  const [scope, setScope] = useState<Scope>("all");
  const r = useReport(data, teams, team, owner, scope);
  const filtered = team !== "all" || owner !== "all" || scope !== "all";

  const exportCsv = () => {
    if (!r) return;
    downloadCsv(`evoq-projects-report-${r.today}.csv`, [
      ["Project", "Status", "Progress %", "Start", "End", "Owner", "Budget spent", "Budget total", "Open tasks", "Overdue tasks"],
      ...r.projects.map((p) => [
        p.name,
        STATUS_META[p.status].label,
        p.progress,
        p.startDate,
        p.endDate,
        personById(p.ownerId)?.name ?? "",
        p.budget.spent,
        p.budget.total,
        p.tasks.filter((t) => t.status !== "done").length,
        p.tasks.filter((t) => t.status !== "done" && t.dueDate < r.today).length,
      ]),
    ]);
    toast.success("Report exported", { description: `${r.projects.length} projects · CSV` });
  };

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        subtitle="Project health, delivery progress, workload and budget across the portfolio."
        actions={
          <>
            <BookmarkButton type="report" refId="reports" label="Reports" className="size-9 border border-line bg-white" />
            <PrimaryButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!r || r.projects.length === 0}>
              Export CSV
            </PrimaryButton>
          </>
        }
      />

      {/* One filter row scopes everything below it */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <FilterSelect label="Team" value={team} onChange={setTeam} options={[{ value: "all", label: "All teams" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
        <FilterSelect label="Owner" value={owner} onChange={setOwner} options={[{ value: "all", label: "Any owner" }, ...PEOPLE.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect
          label="Projects"
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All projects" },
            { value: "active", label: "Active projects" },
            { value: "completed", label: "Completed projects" },
          ]}
        />
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setTeam("all");
              setOwner("all");
              setScope("all");
            }}
            className="rounded px-1 text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action"
          >
            Clear filters
          </button>
        )}
      </div>

      {isError ? (
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      ) : !hydrated || !r ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[78px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : r.projects.length === 0 ? (
        <EmptyState icon={FolderOpenIcon} title="No projects match these filters" hint="Choose another team, owner or project status." />
      ) : (
        <ReportBody r={r} />
      )}
    </PageShell>
  );
}

function ReportBody({ r }: { r: NonNullable<ReturnType<typeof useReport>> }) {
  const onTrack = r.projects.filter((p) => p.status === "on_track").length;
  const atRisk = r.projects.filter((p) => p.status === "at_risk" || p.status === "blocked").length;
  const avg = Math.round(r.projects.reduce((n, p) => n + p.progress, 0) / r.projects.length);
  const doneTasks = r.tasks.filter((t) => t.status === "done").length;

  const health = STATUS_ORDER.map((s) => ({ key: s, label: STATUS_META[s].label, value: r.projects.filter((p) => p.status === s).length, color: STATUS_DOT[s], detail: `${STATUS_META[s].label} projects` }));
  const progress = [...r.projects].sort((a, b) => b.progress - a.progress).map((p) => ({ key: p.id, label: p.name, value: p.progress, display: `${p.progress}%`, detail: `${STATUS_META[p.status].label} · due ${formatDate(p.endDate)}`, href: projectHref(p.id) }));
  const taskStatus = TASK_ORDER.map((s) => ({ key: s, label: TASK_STATUS_META[s].label, value: r.tasks.filter((t) => t.status === s).length, color: TASK_COLOR[s], detail: `${TASK_STATUS_META[s].label} tasks` }));
  const workload = r.workload.map((w) => ({ key: w.person.id, label: w.person.name, value: w.open, display: w.overdue ? `${w.open} · ${w.overdue} late` : String(w.open), detail: `${w.open} open tasks, ${w.overdue} overdue · ${w.person.role}` }));
  const budget = [...r.projects]
    .sort((a, b) => b.budget.spent / b.budget.total - a.budget.spent / a.budget.total)
    .map((p) => ({ key: p.id, label: p.name, value: pct(p.budget.spent, p.budget.total), display: `${pct(p.budget.spent, p.budget.total)}%`, detail: `${formatCurrency(p.budget.spent)} of ${formatCurrency(p.budget.total)}`, href: projectHref(p.id) }));

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatTile icon={FolderOpenIcon} fg="#5B3FF3" bg="#F1EEFE" value={r.projects.length} label="Projects" note="In this report" />
        <StatTile icon={CheckCircleIcon} fg="#15803D" bg="#ECFDF3" value={onTrack} label="On track" note={`${pct(onTrack, r.projects.length)}% of projects`} />
        <StatTile icon={WarningIcon} fg="#EA580C" bg="#FFF4EB" value={atRisk} label="At risk or blocked" note="Need attention" />
        <StatTile icon={WarningCircleIcon} fg="#DC2626" bg="#FEF2F2" value={r.overdue.length} label="Overdue tasks" note={`${r.open.length} open in total`} />
        <StatTile icon={TrendUpIcon} fg="#2563EB" bg="#EFF6FF" value={`${avg}%`} label="Avg. completion" note={`${pct(doneTasks, r.tasks.length)}% of tasks done`} />
        <StatTile icon={CurrencyDollarIcon} fg="#5B3FF3" bg="#F1EEFE" value={`${pct(r.spent, r.total)}%`} label="Budget used" note={`${formatCurrency(r.spent)} of ${formatCurrency(r.total)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Project health"
          subtitle="Projects by status"
          chart={<BarList label="Projects by status" data={health} />}
          table={{ columns: [{ key: "status", label: "Status" }, { key: "count", label: "Projects", numeric: true }, { key: "share", label: "Share", numeric: true }], rows: health.map((h) => ({ status: h.label, count: h.value, share: `${pct(h.value, r.projects.length)}%` })) }}
        />
        <ChartCard
          title="Task progress"
          subtitle={`${r.tasks.length} tasks across these projects`}
          chart={<BarList label="Tasks by status" data={taskStatus} />}
          table={{ columns: [{ key: "status", label: "Status" }, { key: "count", label: "Tasks", numeric: true }, { key: "share", label: "Share", numeric: true }], rows: taskStatus.map((t) => ({ status: t.label, count: t.value, share: `${pct(t.value, r.tasks.length)}%` })) }}
        />
        <ChartCard
          title="Completion by project"
          subtitle="Overall progress, highest first"
          chart={<BarList label="Completion by project" data={progress} max={100} />}
          table={{
            columns: [{ key: "project", label: "Project" }, { key: "status", label: "Status" }, { key: "progress", label: "Progress", numeric: true }, { key: "end", label: "End date" }],
            rows: r.projects.map((p) => ({ project: p.name, status: STATUS_META[p.status].label, progress: `${p.progress}%`, end: formatDate(p.endDate) })),
          }}
        />
        <ChartCard
          title="Budget used"
          subtitle="Spend as a share of each project's budget"
          chart={<BarList label="Budget used by project" data={budget} max={Math.max(100, ...budget.map((b) => b.value))} />}
          table={{
            columns: [{ key: "project", label: "Project" }, { key: "spent", label: "Spent", numeric: true }, { key: "total", label: "Budget", numeric: true }, { key: "used", label: "Used", numeric: true }],
            rows: r.projects.map((p) => ({ project: p.name, spent: formatCurrency(p.budget.spent), total: formatCurrency(p.budget.total), used: `${pct(p.budget.spent, p.budget.total)}%` })),
          }}
        />
        <ChartCard
          title="Workload"
          subtitle="Open tasks per person"
          chart={workload.length ? <BarList label="Open tasks per person" data={workload} /> : <p className="px-2 py-6 text-center text-[13px] text-ink-muted">No open tasks.</p>}
          table={{ columns: [{ key: "person", label: "Person" }, { key: "open", label: "Open", numeric: true }, { key: "overdue", label: "Overdue", numeric: true }], rows: r.workload.map((w) => ({ person: w.person.name, open: w.open, overdue: w.overdue })) }}
        />
        <Card label="Approvals" className="flex flex-col">
          <CardHeader title="Approvals" action={<Link href="/workflows?tab=approvals" className="rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">Open approvals</Link>} />
          <dl className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
            {[
              { label: "Pending", value: r.approvals.filter((a) => a.status === "pending").length },
              { label: "Approved", value: r.approvals.filter((a) => a.status === "approved").length },
              { label: "Rejected", value: r.approvals.filter((a) => a.status === "rejected").length },
              { label: "Avg. days to decide", value: r.turnaround },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-[#F7F7FA] px-3 py-3">
                <dt className="text-[12px] text-ink-muted">{s.label}</dt>
                <dd className="mt-1 text-[22px] leading-7 font-semibold text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto border-t border-line-soft px-5 py-4">
            <h3 className="text-[13px] font-semibold text-ink">Upcoming milestones</h3>
            {r.milestones.length ? (
              <ul className="mt-2 space-y-2">
                {r.milestones.map(({ m, p }) => (
                  <li key={`${p.id}-${m.id}`} className="flex items-center gap-3 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-ink">{m.name}</span>{" "}
                      <Link href={projectHref(p.id)} className="text-ink-muted hover:text-brand">
                        · {p.name}
                      </Link>
                    </span>
                    <span className="shrink-0 text-ink-body tabular-nums">{formatDate(m.endDate)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-muted">No upcoming milestones.</p>
            )}
          </div>
        </Card>
      </div>

      <Card label="Overdue tasks">
        <CardHeader title={`Overdue tasks (${r.overdue.length})`} />
        {r.overdue.length ? (
          <div className="relative overflow-x-auto px-3 pb-3 scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-line">
                  {["Task", "Project", "Assignee", "Due", "Project status"].map((h) => (
                    <th key={h} scope="col" className="px-2 py-2 text-left text-table-header whitespace-nowrap text-ink-body">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.overdue.map((t) => (
                  <tr key={`${t.project.id}-${t.id}`} className="border-b border-line-soft last:border-0">
                    <td className="px-2 py-2.5 text-[13px] text-ink">{t.title}</td>
                    <td className="px-2 py-2.5 text-[12.5px]">
                      <Link href={projectHref(t.project.id)} className="rounded font-medium text-ink-body hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                        {t.project.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <PersonChip personId={t.assigneeId} size="xs" />
                    </td>
                    <td className={cn("px-2 py-2.5 text-[12.5px] whitespace-nowrap text-[#DC2626]")}>{formatDate(t.dueDate)}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill status={t.project.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={CheckCircleIcon} title="Nothing overdue" hint="Every open task in these projects is on schedule." className="py-10" />
        )}
      </Card>
    </div>
  );
}
