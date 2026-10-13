"use client";

import { useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { ArrowsLeftRightIcon, BriefcaseIcon, CheckCircleIcon, ClockCountdownIcon, DotsThreeVerticalIcon, PlusIcon, TrendUpIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreate } from "@/components/shared/create-dialogs";
import { AvatarStack } from "@/components/shared/person-avatar";
import { Card, IconButton, OutlineButton, PageShell, PrimaryButton, ProgressBar, StatusPill, UnderlineTabs } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { FilterSelect, PageHeader, PersonChip, StatTile } from "@/components/shared/workspace-ui";
import { ProjectThumb } from "@/components/projects/project-thumb";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReportData, useSetProjectStatus, useTeams } from "@/hooks/use-workspace";
import { formatCurrency, formatDate } from "@/lib/format";
import { personById } from "@/lib/mock-data/people";
import { TEAMS } from "@/lib/mock-data/teams";
import { ACCENT, STATUS_DOT, STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import type { Person, ProjectDetail, ProjectStatus, TimelineRow } from "@/lib/types/project";
import { cn } from "@/lib/utils";

type View = "roadmap" | "board" | "health";
type HealthSort = "end" | "progress" | "budget" | "overdue";

const STATUSES: ProjectStatus[] = ["planning", "on_track", "at_risk", "blocked", "on_hold", "completed"];
const ROADMAP_COLOR: Record<ProjectStatus, TimelineRow["color"]> = { on_track: "green", at_risk: "orange", blocked: "red", planning: "lavender", on_hold: "lavender", completed: "purple" };
const ROADMAP_SWATCH: Record<TimelineRow["color"], string> = { green: "#22C55E", purple: "#7C5CFA", lavender: "#C4B5FD", orange: "#FB923C", red: "#F43F5E" };

const people = (ids: string[]) => ids.map(personById).filter((p): p is Person => !!p);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/** Days until the end date (negative once it has passed). */
const daysLeft = (end: string, today: string) => Math.round((new Date(end).getTime() - new Date(today).getTime()) / 86_400_000);

function useStatusChange() {
  const set = useSetProjectStatus();
  return (p: ProjectDetail, status: ProjectStatus) => {
    if (p.status === status) return;
    set.mutate(
      { id: p.id, status },
      {
        onSuccess: () => toast.success(`${p.name} moved to ${STATUS_META[status].label}`, { description: "The new status shows on Projects, Home and Reports." }),
        onError: (err) => toast.error("Couldn't change the status", { description: err.message }),
      },
    );
  };
}

// ── Board ────────────────────────────────────────────────────────────

function BoardCard({ p, onMove }: { p: ProjectDetail; onMove: (s: ProjectStatus) => void }) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", p.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-xl border border-line bg-card p-3 shadow-card transition-colors hover:border-brand-soft active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <ProjectThumb thumb={p.thumb} size={32} />
        <div className="min-w-0 flex-1">
          <Link href={projectHref(p.id)} className="block truncate rounded text-[13px] leading-5 font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
            {p.name}
          </Link>
          <p className="truncate text-[11.5px] leading-4 text-ink-muted">{p.phase}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label={`Move ${p.name}`} className="-mr-1 size-7">
              <DotsThreeVerticalIcon size={16} weight="bold" aria-hidden />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {STATUSES.filter((s) => s !== p.status).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[s] }} aria-hidden />
                {STATUS_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar value={p.progress} color={ACCENT[p.accent].bar} className="flex-1" label={`${p.name}: ${p.progress}% complete`} />
        <span className="text-[11.5px] text-ink-body tabular-nums">{p.progress}%</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-muted">
        <span>Due {formatDate(p.endDate)}</span>
        <AvatarStack people={people(p.memberIds).slice(0, 3)} extra={p.extraMembers} size="xs" />
      </div>
    </li>
  );
}

function Board({ projects }: { projects: ProjectDetail[] }) {
  const move = useStatusChange();
  const [over, setOver] = useState<ProjectStatus | null>(null);
  const drop = (e: DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setOver(null);
    const p = projects.find((x) => x.id === e.dataTransfer.getData("text/plain"));
    if (p) move(p, status);
  };
  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
        <ArrowsLeftRightIcon size={14} aria-hidden />
        Drag a card to another column, or use its menu, to change the project&apos;s status.
      </p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:px-0">
        {STATUSES.map((s) => {
          const items = projects.filter((p) => p.status === s);
          return (
            <section
              key={s}
              aria-label={`${STATUS_META[s].label} (${items.length})`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={(e) => drop(e, s)}
              className={cn("flex w-[260px] shrink-0 flex-col rounded-xl border bg-[#F7F7FA] p-2.5 transition-colors", over === s ? "border-brand-soft bg-brand-surface" : "border-line-soft")}
            >
              <header className="mb-2 flex items-center gap-2 px-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[s] }} aria-hidden />
                <h3 className="text-[13px] font-semibold text-ink">{STATUS_META[s].label}</h3>
                <span className="ml-auto text-[12px] text-ink-muted tabular-nums">{items.length}</span>
              </header>
              <ul className="min-h-[80px] space-y-2">
                {items.map((p) => (
                  <BoardCard key={p.id} p={p} onMove={(to) => move(p, to)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Health table ─────────────────────────────────────────────────────

function Health({ projects, today }: { projects: ProjectDetail[]; today: string }) {
  const [sort, setSort] = useState<HealthSort>("end");
  const rows = useMemo(() => {
    const withMeta = projects.map((p) => {
      const open = p.tasks.filter((t) => t.status !== "done");
      return {
        p,
        overdue: open.filter((t) => t.dueDate < today).length,
        open: open.length,
        budget: pct(p.budget.spent, p.budget.total),
        left: daysLeft(p.endDate, today),
        next: p.milestones.find((m) => m.state !== "completed"),
      };
    });
    return withMeta.sort((a, b) =>
      sort === "progress" ? b.p.progress - a.p.progress : sort === "budget" ? b.budget - a.budget : sort === "overdue" ? b.overdue - a.overdue : a.p.endDate.localeCompare(b.p.endDate),
    );
  }, [projects, today, sort]);

  return (
    <Card label="Portfolio health">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
        <h2 className="text-[15px] leading-6 font-semibold text-ink">Health by project</h2>
        <div className="ml-auto">
          <FilterSelect
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "end", label: "End date" },
              { value: "progress", label: "Progress" },
              { value: "budget", label: "Budget used" },
              { value: "overdue", label: "Overdue tasks" },
            ]}
          />
        </div>
      </div>
      <div className="relative overflow-x-auto px-3 pb-3 scrollbar-thin">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              {["Project", "Status", "Progress", "Schedule", "Budget", "Tasks", "Next milestone", "Owner"].map((h) => (
                <th key={h} scope="col" className="px-2 py-2.5 text-left text-table-header whitespace-nowrap text-ink-body">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, overdue, open, budget, left, next }) => (
              <tr key={p.id} className="border-b border-line-soft last:border-0">
                <td className="max-w-[220px] px-2 py-3">
                  <Link href={projectHref(p.id)} className="block truncate rounded text-[13px] font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {p.name}
                  </Link>
                  <span className="block truncate text-[12px] text-ink-muted">{p.description}</span>
                </td>
                <td className="px-2 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-2 py-3">
                  <span className="block w-[72px]">
                    <span className="block text-[12px] text-ink-body tabular-nums">{p.progress}%</span>
                    <ProgressBar value={p.progress} color={ACCENT[p.accent].bar} className="mt-1" />
                  </span>
                </td>
                <td className={cn("px-2 py-3 text-[12.5px] whitespace-nowrap", p.status !== "completed" && left < 0 ? "font-medium text-[#DC2626]" : "text-ink-body")}>
                  {p.status === "completed" ? "Delivered" : left < 0 ? `${-left} days late` : left === 0 ? "Due today" : `${left} days left`}
                  <span className="block text-[11.5px] font-normal text-ink-muted">Ends {formatDate(p.endDate)}</span>
                </td>
                <td className={cn("px-2 py-3 text-[12.5px] whitespace-nowrap", budget > 100 ? "font-medium text-[#DC2626]" : "text-ink-body")}>
                  {budget}% used
                  <span className="block text-[11.5px] font-normal text-ink-muted">
                    {formatCurrency(p.budget.spent)} / {formatCurrency(p.budget.total)}
                  </span>
                </td>
                <td className="px-2 py-3 text-[12.5px] whitespace-nowrap text-ink-body">
                  {open} open
                  {overdue > 0 && <span className="block text-[11.5px] font-medium text-[#DC2626]">{overdue} overdue</span>}
                </td>
                <td className="max-w-[180px] px-2 py-3 text-[12.5px] text-ink-body">
                  {next ? (
                    <>
                      <span className="block truncate">{next.name}</span>
                      <span className="block text-[11.5px] text-ink-muted">{formatDate(next.endDate)}</span>
                    </>
                  ) : (
                    <span className="text-ink-muted">All complete</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <PersonChip personId={p.ownerId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export function PortfolioView() {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useReportData();
  const { data: teams = TEAMS } = useTeams();
  const { openCreateProject } = useCreate();
  const [view, setView] = useState<View>("roadmap");
  const [team, setTeam] = useState("all");

  const projects = useMemo(() => {
    const ids = team === "all" ? null : new Set(teams.find((t) => t.id === team)?.projectIds ?? []);
    return (data?.projects ?? []).filter((p) => !ids || ids.has(p.id));
  }, [data, teams, team]);

  const today = data?.today ?? "";
  const active = projects.filter((p) => ["on_track", "at_risk", "blocked"].includes(p.status));
  const late = projects.filter((p) => p.status !== "completed" && p.endDate < today);
  const atRisk = projects.filter((p) => p.status === "at_risk" || p.status === "blocked");
  const avg = projects.length ? Math.round(projects.reduce((n, p) => n + p.progress, 0) / projects.length) : 0;

  const roadmapRows: TimelineRow[] = [...projects]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => ({ id: p.id, label: p.name, startDate: p.startDate, endDate: p.endDate, color: ROADMAP_COLOR[p.status] }));
  const earliest = roadmapRows[0]?.startDate ?? today;

  return (
    <PageShell>
      <PageHeader
        title="Portfolio"
        subtitle="Every project's health, schedule and status in one view."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => openCreateProject()}>
            New project
          </PrimaryButton>
        }
      />

      {isError ? (
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      ) : !hydrated || !data ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[78px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile icon={BriefcaseIcon} fg="#5B3FF3" bg="#F1EEFE" value={active.length} label="Active projects" note={`${projects.length} in the portfolio`} />
            <StatTile icon={CheckCircleIcon} fg="#15803D" bg="#ECFDF3" value={projects.filter((p) => p.status === "on_track").length} label="On track" note={`${pct(projects.filter((p) => p.status === "on_track").length, active.length)}% of active`} />
            <StatTile icon={WarningIcon} fg="#EA580C" bg="#FFF4EB" value={atRisk.length} label="At risk or blocked" note={atRisk.map((p) => p.name).slice(0, 2).join(", ") || "None"} />
            <StatTile icon={ClockCountdownIcon} fg="#DC2626" bg="#FEF2F2" value={late.length} label="Past end date" note={late.length ? "Not yet completed" : "All on schedule"} />
            <StatTile icon={TrendUpIcon} fg="#2563EB" bg="#EFF6FF" value={`${avg}%`} label="Avg. completion" note="Across these projects" />
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3 border-b border-line">
            <UnderlineTabs
              label="Portfolio views"
              className="border-b-0"
              value={view}
              onChange={setView}
              tabs={[
                { value: "roadmap", label: "Roadmap" },
                { value: "board", label: "Status board" },
                { value: "health", label: "Health" },
              ]}
            />
            <div className="mb-2 ml-auto">
              <FilterSelect label="Team" value={team} onChange={setTeam} options={[{ value: "all", label: "All teams" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
            </div>
          </div>

          <div className="mt-4">
            {projects.length === 0 ? (
              <EmptyState icon={BriefcaseIcon} title="No projects for this team" hint="Choose another team or create a project." />
            ) : view === "roadmap" ? (
              <Card label="Roadmap" className="px-5 pt-4 pb-5">
                <ProjectTimeline title="Roadmap" rows={roadmapRows} projectStart={earliest} tall labelWidth={176} />
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
                  {STATUSES.map((s) => (
                    <li key={s} className="inline-flex items-center gap-1.5 text-[12px] text-ink-body">
                      <span className="h-2 w-4 rounded-full" style={{ backgroundColor: ROADMAP_SWATCH[ROADMAP_COLOR[s]] }} aria-hidden />
                      {STATUS_META[s].label}
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 grid gap-x-6 gap-y-1 border-t border-line-soft pt-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Projects on the roadmap">
                  {roadmapRows.map((r) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-2 text-[12.5px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ROADMAP_SWATCH[r.color] }} aria-hidden />
                      <Link href={projectHref(r.id)} className="truncate rounded text-ink-body hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                        {r.label}
                      </Link>
                      <span className="ml-auto shrink-0 text-[11.5px] text-ink-muted">
                        {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : view === "board" ? (
              <Board projects={projects} />
            ) : (
              <Health projects={projects} today={today} />
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
