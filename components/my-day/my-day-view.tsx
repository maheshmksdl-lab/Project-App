"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarBlankIcon, CheckCircleIcon, CheckSquareIcon, ClockIcon, HourglassIcon, PlusIcon, SealCheckIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { useCreate } from "@/components/shared/create-dialogs";
import { Badge, Card, CardHeader, OutlineButton, PageShell, PrimaryButton, ViewAll } from "@/components/shared/project-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { PageHeader, StatTile, fieldClass } from "@/components/shared/workspace-ui";
import { ApprovalCard } from "@/components/workflows/approval-card";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMe } from "@/hooks/use-me";
import { useSetTaskDone } from "@/hooks/use-projects";
import { useCalendarEvents, useReportData, useTasks, useUpdateTask } from "@/hooks/use-workspace";
import { formatDate, pluralize, toIsoDate } from "@/lib/format";
import { PRIORITY_META, TASK_STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import type { ProjectSummary, ProjectTask, TaskStatus } from "@/lib/types/project";
import { cn } from "@/lib/utils";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function TaskRow({ task, project, today }: { task: ProjectTask; project: ProjectSummary; today: string }) {
  const setDone = useSetTaskDone();
  const update = useUpdateTask();
  const { openTask } = useAppDialogs();
  const done = task.status === "done";
  const late = !done && task.dueDate < today;
  const pr = PRIORITY_META[task.priority];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-soft px-5 py-3 first:border-t-0">
      <Checkbox
        checked={done}
        onCheckedChange={(v) =>
          setDone.mutate({ taskId: task.id, done: v === true }, { onSuccess: () => toast.success(v === true ? "Task completed" : "Task reopened", { description: task.title }) })
        }
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        className="size-4 rounded-[4px] border-[#D0D5DD] data-[state=checked]:border-brand data-[state=checked]:bg-brand"
      />
      <div className="min-w-0 flex-1 basis-48">
        <button type="button" onClick={() => openTask(task.id)} className={cn("block max-w-full truncate rounded text-left text-[13.5px] leading-5 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action", done ? "text-ink-muted line-through" : "text-ink")}>
          {task.title}
        </button>
        <Link href={projectHref(project.id)} className="block truncate text-[12px] leading-4 text-ink-muted hover:text-brand">
          {project.name}
        </Link>
      </div>
      <Badge fg={pr.fg} bg={pr.bg} dot>
        {pr.label}
      </Badge>
      <span className={cn("w-24 text-[12.5px] tabular-nums", late ? "font-medium text-[#DC2626]" : "text-ink-body")}>{task.dueDate === today ? "Today" : formatDate(task.dueDate)}</span>
      <Select
        value={task.status}
        onValueChange={(v) =>
          update.mutate({ taskId: task.id, changes: { status: v as TaskStatus } }, { onSuccess: () => toast.success("Status updated", { description: `${task.title} · ${TASK_STATUS_META[v as TaskStatus].label}` }) })
        }
      >
        <SelectTrigger aria-label={`Status of ${task.title}`} className={cn(fieldClass, "h-8 w-[132px] text-[12.5px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {(Object.keys(TASK_STATUS_META) as TaskStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {TASK_STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}

function Section({ title, icon: IconCmp, fg, items, today, empty }: { title: string; icon: typeof ClockIcon; fg: string; items: { task: ProjectTask; project: ProjectSummary }[]; today: string; empty: string }) {
  return (
    <Card label={title}>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <IconCmp size={18} aria-hidden style={{ color: fg }} />
            {title} <span className="text-[13px] font-normal text-ink-muted">({items.length})</span>
          </span>
        }
      />
      {items.length ? (
        <ul className="pb-2">
          {items.map(({ task, project }) => (
            <TaskRow key={task.id} task={task} project={project} today={today} />
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-[13px] text-ink-muted">{empty}</p>
      )}
    </Card>
  );
}

/** The signed-in person's day: overdue and due-today tasks, the week ahead, approvals waiting on them and today's meetings. Dates follow the viewer's clock. */
export function MyDayView() {
  const hydrated = useHydrated();
  const me = useMe();
  const { openCreateTask } = useCreate();
  const { data: tasks } = useTasks();
  const { data: report } = useReportData();
  const now = hydrated ? new Date() : null;
  const today = now ? toIsoDate(now) : "";
  const weekEnd = now ? toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)) : "";
  const { data: events } = useCalendarEvents(today || "0000-00-00", weekEnd || "0000-00-00");

  const mine = useMemo(() => (tasks ?? []).filter((t) => t.task.assigneeId === me.id), [tasks, me.id]);
  const byPriority = (a: { task: ProjectTask }, b: { task: ProjectTask }) => a.task.dueDate.localeCompare(b.task.dueDate) || PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority];
  const overdue = mine.filter((t) => t.task.status !== "done" && t.task.dueDate < today).sort(byPriority);
  const dueToday = mine.filter((t) => t.task.dueDate === today).sort(byPriority);
  const upcoming = mine.filter((t) => t.task.status !== "done" && t.task.dueDate > today && t.task.dueDate <= weekEnd).sort(byPriority);
  const approvals = (report?.approvals ?? []).filter((a) => a.status === "pending" && a.approverId === me.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const meetings = (events ?? []).filter((e) => e.kind === "meeting");
  const doneToday = dueToday.filter((t) => t.task.status === "done").length;

  return (
    <PageShell>
      <PageHeader
        title="My Day"
        subtitle={now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Your tasks, approvals and meetings for today."}
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => openCreateTask({ dueDate: today || undefined })}>
            New task
          </PrimaryButton>
        }
      />
      {!hydrated || !tasks || !report ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[78px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={SunIcon} fg="#5B3FF3" bg="#F1EEFE" value={dueToday.length} label="Due today" note={`${doneToday} done`} />
            <StatTile icon={HourglassIcon} fg="#DC2626" bg="#FEF2F2" value={overdue.length} label="Overdue" note={overdue.length ? "Needs attention" : "Nothing late"} />
            <StatTile icon={SealCheckIcon} fg="#EA580C" bg="#FFF4EB" value={approvals.length} label="Approvals for you" note="Waiting on your decision" />
            <StatTile icon={CalendarBlankIcon} fg="#2563EB" bg="#EFF6FF" value={meetings.filter((m) => m.date === today).length} label="Meetings today" note={pluralize(meetings.length, "meeting") + " this week"} />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-4">
              {overdue.length + dueToday.length + upcoming.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={CheckCircleIcon}
                    title="Nothing assigned to you this week"
                    hint="Tasks assigned to you appear here by due date."
                    action={
                      <OutlineButton icon={CheckSquareIcon} onClick={() => openCreateTask({ dueDate: today })}>
                        Add a task for today
                      </OutlineButton>
                    }
                  />
                </Card>
              ) : (
                <>
                  {overdue.length > 0 && <Section title="Overdue" icon={HourglassIcon} fg="#DC2626" items={overdue} today={today} empty="" />}
                  <Section title="Due today" icon={SunIcon} fg="#5B3FF3" items={dueToday} today={today} empty="Nothing due today." />
                  <Section title="Next 7 days" icon={ClockIcon} fg="#2563EB" items={upcoming} today={today} empty="Nothing due in the next week." />
                </>
              )}
            </div>
            <div className="min-w-0 space-y-4">
              <Card label="Meetings">
                <CardHeader title="Meetings this week" action={<ViewAll href="/calendar" label="Calendar" />} />
                {meetings.length ? (
                  <ul className="px-5 pb-4">
                    {meetings.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0">
                        <span className={cn("w-16 shrink-0 text-[12.5px] font-medium tabular-nums", m.date === today ? "text-brand" : "text-ink-body")}>{m.date === today ? m.time : formatDate(m.date).replace(/, \d{4}$/, "")}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{m.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 pb-5 text-[13px] text-ink-muted">No meetings this week.</p>
                )}
              </Card>
              <section aria-label="Approvals waiting on you">
                <h2 className="mb-3 text-[15px] leading-6 font-semibold text-ink">Approvals waiting on you ({approvals.length})</h2>
                {approvals.length ? (
                  <ul className="grid gap-3">
                    {approvals.map((a) => (
                      <ApprovalCard key={a.id} approval={a} today={today} />
                    ))}
                  </ul>
                ) : (
                  <Card>
                    <EmptyState icon={SealCheckIcon} title="No approvals waiting" className="py-8" />
                  </Card>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
