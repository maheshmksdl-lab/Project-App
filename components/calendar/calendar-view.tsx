"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckSquareIcon,
  ClockIcon,
  FunnelSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { useCreate } from "@/components/shared/create-dialogs";
import { OutlineButton, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { FilterSelect, FormDialog, FormField, PageHeader, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { useCalendarEvents, useCreateMeeting, useDeleteMeeting, useSettings } from "@/hooks/use-workspace";
import { formatDate, toIsoDate } from "@/lib/format";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import { eventFormSchema, fieldErrors, type EventFormValues } from "@/lib/schemas/workspace";
import type { CalendarEvent, CalendarKind } from "@/lib/types/workspace";
import { CALENDAR_KIND_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "agenda";

const KINDS = Object.keys(CALENDAR_KIND_META) as CalendarKind[];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date, weekStartsOn: number) => addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));

/** The visible days and the fetch window for a view anchored on a date. */
function windowFor(view: View, anchor: Date, weekStartsOn: number) {
  if (view === "week") {
    const start = startOfWeek(anchor, weekStartsOn);
    return { days: Array.from({ length: 7 }, (_, i) => addDays(start, i)), from: start, to: addDays(start, 6) };
  }
  if (view === "agenda") {
    return { days: Array.from({ length: 30 }, (_, i) => addDays(anchor, i)), from: anchor, to: addDays(anchor, 29) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first, weekStartsOn);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const end = addDays(startOfWeek(last, weekStartsOn), 6);
  const count = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return { days: Array.from({ length: count }, (_, i) => addDays(start, i)), from: start, to: end };
}

function title(view: View, anchor: Date, days: Date[]) {
  if (view === "month") return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return `${formatDate(toIsoDate(days[0]))} – ${formatDate(toIsoDate(days[days.length - 1]))}`;
}

// ── Event pieces ─────────────────────────────────────────────────────

function EventChip({ ev, onOpen, compact }: { ev: CalendarEvent; onOpen: (e: CalendarEvent) => void; compact?: boolean }) {
  const m = CALENDAR_KIND_META[ev.kind];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev);
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand-action",
        compact ? "h-5 text-[11px] leading-4" : "h-6 text-[12px] leading-4",
      )}
      style={{ backgroundColor: m.bg, color: m.fg }}
      aria-label={`${m.label.replace(/s$/, "")}: ${ev.title}${ev.time ? ` at ${ev.time}` : ""}`}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: m.dot }} aria-hidden />
      {ev.time && <span className="shrink-0 font-medium tabular-nums">{ev.time}</span>}
      <span className="truncate">{ev.title}</span>
    </button>
  );
}

function EventRow({ ev, projectName, onOpen }: { ev: CalendarEvent; projectName: (id: string | null) => string | null; onOpen: (e: CalendarEvent) => void }) {
  const m = CALENDAR_KIND_META[ev.kind];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(ev)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action"
      >
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: m.dot }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-5 font-medium text-ink">{ev.title}</span>
          <span className="block truncate text-[12px] leading-4 text-ink-muted">
            {m.label.replace(/s$/, "")}
            {projectName(ev.projectId) ? ` · ${projectName(ev.projectId)}` : ""}
            {ev.meta ? ` · ${ev.meta}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-[12px] text-ink-body tabular-nums">{ev.time ?? "All day"}</span>
      </button>
    </li>
  );
}

/** Details for one item, with the way into the project / workflow it belongs to. */
function EventDialog({ ev, projectName, onClose }: { ev: CalendarEvent; projectName: (id: string | null) => string | null; onClose: () => void }) {
  const remove = useDeleteMeeting();
  const { openTask } = useAppDialogs();
  const m = CALENDAR_KIND_META[ev.kind];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <div className="flex items-center gap-2 pr-8">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: m.dot }} aria-hidden />
          <span className="text-[12px] font-medium text-ink-muted">{m.label.replace(/s$/, "")}</span>
        </div>
        <DialogTitle className="-mt-2 text-[17px] leading-6 font-semibold text-ink">{ev.title}</DialogTitle>
        <DialogDescription asChild>
          <dl className="grid gap-2 text-[13px] text-ink-body">
            <div className="flex items-center gap-2">
              <CalendarBlankIcon size={15} aria-hidden className="text-ink-muted" />
              <dt className="sr-only">Date</dt>
              <dd>
                {formatDate(ev.date)}
                {ev.time ? ` · ${ev.time}` : " · All day"}
              </dd>
            </div>
            {projectName(ev.projectId) && (
              <div className="flex items-center gap-2">
                <CheckSquareIcon size={15} aria-hidden className="text-ink-muted" />
                <dt className="sr-only">Project</dt>
                <dd>{projectName(ev.projectId)}</dd>
              </div>
            )}
            {ev.meta && (
              <div className="flex items-center gap-2">
                <ClockIcon size={15} aria-hidden className="text-ink-muted" />
                <dt className="sr-only">Details</dt>
                <dd>{ev.meta}</dd>
              </div>
            )}
          </dl>
        </DialogDescription>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          {ev.taskId && (
            <OutlineButton
              icon={CheckSquareIcon}
              onClick={() => {
                onClose();
                openTask(ev.taskId!);
              }}
            >
              Open task
            </OutlineButton>
          )}
          {ev.kind === "meeting" && (
            <OutlineButton
              icon={TrashIcon}
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(ev.id, {
                  onSuccess: () => {
                    toast.success("Meeting removed", { description: ev.title });
                    onClose();
                  },
                })
              }
            >
              Remove
            </OutlineButton>
          )}
          {ev.href ? (
            <Link
              href={ev.href}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-button text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
            >
              {ev.kind === "workflow" ? "Open workflow" : ev.kind === "approval" ? "Review approval" : "Open project"}
              <ArrowRightIcon size={14} weight="bold" aria-hidden />
            </Link>
          ) : (
            ev.projectId && (
              <Link
                href={`/projects/${encodeURIComponent(ev.projectId)}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-button text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
              >
                Open project
                <ArrowRightIcon size={14} weight="bold" aria-hidden />
              </Link>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** All items on one day (from "+N more" or a tap on a phone). */
function DayDialog({ date, events, projectName, onOpen, onClose, onAddTask }: { date: string; events: CalendarEvent[]; projectName: (id: string | null) => string | null; onOpen: (e: CalendarEvent) => void; onClose: () => void; onAddTask: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-3 rounded-2xl">
        <DialogTitle className="pr-8 text-[17px] leading-6 font-semibold text-ink">{formatDate(date)}</DialogTitle>
        <DialogDescription className="text-[13px] text-ink-muted">{events.length ? `${events.length} item${events.length === 1 ? "" : "s"}` : "Nothing scheduled"}</DialogDescription>
        {events.length > 0 && (
          <ul className="-mx-3 max-h-[50dvh] overflow-y-auto scrollbar-thin">
            {events.map((ev) => (
              <EventRow key={ev.id} ev={ev} projectName={projectName} onOpen={onOpen} />
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <OutlineButton icon={PlusIcon} onClick={onAddTask}>
            Add task on this day
          </OutlineButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDialog({ date, onOpenChange }: { date: string; onOpenChange: (o: boolean) => void }) {
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const create = useCreateMeeting();
  const [values, setValues] = useState<EventFormValues>({ title: "", date, time: "10:00", projectId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = () => {
    const parsed = eventFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      document.getElementById(`ev-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    create.mutate(
      { ...parsed.data, projectId: parsed.data.projectId || null },
      {
        onSuccess: () => {
          toast.success("Meeting added", { description: `${parsed.data.title} · ${formatDate(parsed.data.date)} ${parsed.data.time}` });
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't add the meeting", { description: err.message }),
      },
    );
  };
  return (
    <FormDialog open onOpenChange={onOpenChange} title="New meeting" description="Meetings show on the calendar for everyone in the workspace." submitLabel="Add meeting" onSubmit={submit} pending={create.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="ev-title" error={errors.title} className="sm:col-span-2">
          <input id="ev-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Sprint review" aria-invalid={!!errors.title} className={fieldClass} autoFocus />
        </FormField>
        <FormField label="Date" htmlFor="ev-date" error={errors.date}>
          <input id="ev-date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} aria-invalid={!!errors.date} className={fieldClass} />
        </FormField>
        <FormField label="Time" htmlFor="ev-time" error={errors.time}>
          <input id="ev-time" type="time" value={values.time} onChange={(e) => set("time", e.target.value)} aria-invalid={!!errors.time} className={fieldClass} />
        </FormField>
        <FormField label="Project (optional)" htmlFor="ev-projectId" className="sm:col-span-2">
          <SelectField
            id="ev-projectId"
            value={values.projectId || "none"}
            onChange={(v) => set("projectId", v === "none" ? "" : v)}
            options={[{ value: "none", label: "No project" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
          />
        </FormField>
      </div>
    </FormDialog>
  );
}

// ── Views ────────────────────────────────────────────────────────────

const MAX_CHIPS = 3;

function MonthGrid({
  days,
  month,
  today,
  weekStartsOn,
  byDay,
  onOpen,
  onDay,
}: {
  days: Date[];
  month: number;
  today: string;
  weekStartsOn: number;
  byDay: Map<string, CalendarEvent[]>;
  onOpen: (e: CalendarEvent) => void;
  onDay: (iso: string) => void;
}) {
  const names = Array.from({ length: 7 }, (_, i) => DAY_NAMES[(i + weekStartsOn) % 7]);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <div className="grid grid-cols-7 border-b border-line bg-[#FBFBFD]">
        {names.map((n) => (
          <div key={n} className="px-2 py-2 text-center text-[11.5px] font-medium text-ink-muted sm:text-left">
            <span className="sm:hidden">{n[0]}</span>
            <span className="hidden sm:inline">{n}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = toIsoDate(d);
          const events = byDay.get(iso) ?? [];
          const outside = d.getMonth() !== month;
          const isToday = iso === today;
          return (
            <div
              key={iso}
              role="button"
              tabIndex={0}
              onClick={() => onDay(iso)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onDay(iso))}
              aria-label={`${formatDate(iso)}, ${events.length} item${events.length === 1 ? "" : "s"}`}
              className={cn(
                "min-h-[58px] cursor-pointer border-r border-b border-line-soft p-1 transition-colors outline-none hover:bg-brand-surface focus-visible:bg-brand-surface focus-visible:ring-2 focus-visible:ring-brand-action focus-visible:ring-inset sm:min-h-[112px] sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                outside && "bg-[#FBFBFD]",
              )}
            >
              <span
                className={cn(
                  "mx-auto inline-flex size-6 items-center justify-center rounded-full text-[12px] tabular-nums sm:mx-0",
                  isToday ? "bg-brand font-semibold text-white" : outside ? "text-ink-faint" : "text-ink-body",
                )}
              >
                {d.getDate()}
              </span>
              {/* Phones: dots; wider: chips */}
              <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden" aria-hidden>
                {events.slice(0, 4).map((ev) => (
                  <span key={ev.id} className="size-1.5 rounded-full" style={{ backgroundColor: CALENDAR_KIND_META[ev.kind].dot }} />
                ))}
              </div>
              <div className="mt-1 hidden space-y-0.5 sm:block">
                {events.slice(0, MAX_CHIPS).map((ev) => (
                  <EventChip key={ev.id} ev={ev} onOpen={onOpen} compact />
                ))}
                {events.length > MAX_CHIPS && (
                  <span className="block px-1.5 text-[11px] leading-4 font-medium text-ink-muted">+{events.length - MAX_CHIPS} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekList({ days, today, byDay, projectName, onOpen, onAddTask }: { days: Date[]; today: string; byDay: Map<string, CalendarEvent[]>; projectName: (id: string | null) => string | null; onOpen: (e: CalendarEvent) => void; onAddTask: (iso: string) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((d) => {
        const iso = toIsoDate(d);
        const events = byDay.get(iso) ?? [];
        return (
          <section key={iso} aria-label={formatDate(iso)} className={cn("min-w-0 rounded-xl border bg-card p-2.5 shadow-card lg:min-h-[320px]", iso === today ? "border-brand-soft ring-1 ring-brand-soft" : "border-line")}>
            <header className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[12.5px] font-medium text-ink">
                {DAY_NAMES[d.getDay()]} <span className={cn("tabular-nums", iso === today ? "text-brand" : "text-ink-muted")}>{d.getDate()}</span>
              </span>
              <button type="button" onClick={() => onAddTask(iso)} aria-label={`Add task on ${formatDate(iso)}`} className="inline-flex size-6 items-center justify-center rounded-md text-ink-muted hover:bg-brand-10 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                <PlusIcon size={13} weight="bold" aria-hidden />
              </button>
            </header>
            {events.length ? (
              <>
                <div className="space-y-1 lg:hidden">
                  <ul className="-mx-2">
                    {events.map((ev) => (
                      <EventRow key={ev.id} ev={ev} projectName={projectName} onOpen={onOpen} />
                    ))}
                  </ul>
                </div>
                <div className="hidden space-y-1 lg:block">
                  {events.map((ev) => (
                    <EventChip key={ev.id} ev={ev} onOpen={onOpen} />
                  ))}
                </div>
              </>
            ) : (
              <p className="px-1 text-[12px] text-ink-faint">Nothing scheduled</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Agenda({ days, today, byDay, projectName, onOpen }: { days: Date[]; today: string; byDay: Map<string, CalendarEvent[]>; projectName: (id: string | null) => string | null; onOpen: (e: CalendarEvent) => void }) {
  const withEvents = days.filter((d) => (byDay.get(toIsoDate(d)) ?? []).length);
  if (!withEvents.length) {
    return (
      <div className="rounded-xl border border-line bg-card shadow-card">
        <EmptyState icon={CalendarBlankIcon} title="Nothing in the next 30 days" hint="Try other filters, or add a meeting or a task." />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {withEvents.map((d) => {
        const iso = toIsoDate(d);
        return (
          <section key={iso} aria-label={formatDate(iso)} className="rounded-xl border border-line bg-card px-2 py-2 shadow-card sm:flex sm:gap-4 sm:px-3">
            <h3 className="px-3 pt-1.5 text-[13px] font-semibold text-ink sm:w-36 sm:shrink-0 sm:pt-2.5">
              {DAY_NAMES[d.getDay()]}, {formatDate(iso)}
              {iso === today && <span className="ml-2 rounded-md bg-brand-tint px-1.5 py-0.5 text-[11px] font-medium text-brand">Today</span>}
            </h3>
            <ul className="min-w-0 flex-1">
              {(byDay.get(iso) ?? []).map((ev) => (
                <EventRow key={ev.id} ev={ev} projectName={projectName} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export function CalendarView() {
  const hydrated = useHydrated();
  const { openCreateTask } = useCreate();
  const { data: settings } = useSettings();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const weekStartsOn = settings?.weekStartsOn ?? 1;
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [kinds, setKinds] = useState<Set<CalendarKind>>(() => new Set(KINDS));
  const [project, setProject] = useState("all");
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [meetingOn, setMeetingOn] = useState<string | null>(null);

  // The viewer's "today" is only known after hydration.
  const now = hydrated ? new Date() : new Date(2026, 9, 13);
  const today = toIsoDate(now);
  const base = anchor ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const win = windowFor(view, base, weekStartsOn);
  const { data, isError, refetch, isFetching } = useCalendarEvents(toIsoDate(win.from), toIsoDate(win.to));

  const projectName = (id: string | null) => (id ? (projectList?.items.find((p) => p.id === id)?.name ?? null) : null);
  const visible = useMemo(() => (data ?? []).filter((ev) => kinds.has(ev.kind) && (project === "all" || ev.projectId === project)), [data, kinds, project]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of visible) map.set(ev.date, [...(map.get(ev.date) ?? []), ev]);
    return map;
  }, [visible]);

  const step = (dir: -1 | 1) => {
    if (view === "month") setAnchor(new Date(base.getFullYear(), base.getMonth() + dir, 1));
    else setAnchor(addDays(base, dir * (view === "week" ? 7 : 30)));
  };
  const toggleKind = (k: CalendarKind) =>
    setKinds((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const addTaskOn = (iso: string) => {
    setOpenDay(null);
    openCreateTask({ dueDate: iso });
  };
  const hiddenKinds = KINDS.length - kinds.size;

  return (
    <PageShell>
      <PageHeader
        title="Calendar"
        subtitle="Tasks, milestones, deadlines, workflow runs, approvals and meetings in one schedule."
        actions={
          <>
            <OutlineButton icon={CheckSquareIcon} onClick={() => openCreateTask({ dueDate: today })}>
              New task
            </OutlineButton>
            <PrimaryButton icon={PlusIcon} onClick={() => setMeetingOn(today)}>
              New meeting
            </PrimaryButton>
          </>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <OutlineButton aria-label="Previous" className="w-9 px-0" onClick={() => step(-1)}>
            <CaretLeftIcon size={15} weight="bold" aria-hidden />
          </OutlineButton>
          <OutlineButton aria-label="Next" className="w-9 px-0" onClick={() => step(1)}>
            <CaretRightIcon size={15} weight="bold" aria-hidden />
          </OutlineButton>
          <OutlineButton onClick={() => setAnchor(null)}>Today</OutlineButton>
        </div>
        <h2 className="min-w-0 px-1 text-[17px] leading-6 font-semibold text-ink" aria-live="polite" suppressHydrationWarning>
          {title(view, base, win.days)}
        </h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <FilterSelect
            label="Project"
            value={project}
            onChange={setProject}
            className="min-w-[160px]"
            options={[{ value: "all", label: "All projects" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <OutlineButton icon={FunnelSimpleIcon} aria-pressed={hiddenKinds > 0}>
                {hiddenKinds ? `${kinds.size} of ${KINDS.length} types` : "All types"}
                <CaretDownIcon size={12} aria-hidden />
              </OutlineButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              {KINDS.map((k) => (
                <DropdownMenuCheckboxItem key={k} checked={kinds.has(k)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleKind(k)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: CALENDAR_KIND_META[k].dot }} aria-hidden />
                  {CALENDAR_KIND_META[k].label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={hiddenKinds === 0} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setKinds(new Set(KINDS))}>
                Show everything
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div role="tablist" aria-label="Calendar view" className="flex gap-1 rounded-lg bg-[#F2F4F7] p-1">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "h-7 rounded-md px-3 text-[12.5px] font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                  view === v ? "bg-white text-ink shadow-card" : "text-ink-body hover:text-ink",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend: every colour has its label */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
        {KINDS.filter((k) => kinds.has(k)).map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5 text-[12px] text-ink-body">
            <span className="size-2 rounded-full" style={{ backgroundColor: CALENDAR_KIND_META[k].dot }} aria-hidden />
            {CALENDAR_KIND_META[k].label}
          </li>
        ))}
      </ul>

      <div className={cn("mt-4 transition-opacity", isFetching && data && "opacity-70")}>
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <Skeleton className="h-[560px] rounded-xl" />
        ) : view === "month" ? (
          <MonthGrid days={win.days} month={base.getMonth()} today={today} weekStartsOn={weekStartsOn} byDay={byDay} onOpen={setOpenEvent} onDay={setOpenDay} />
        ) : view === "week" ? (
          <WeekList days={win.days} today={today} byDay={byDay} projectName={projectName} onOpen={setOpenEvent} onAddTask={addTaskOn} />
        ) : (
          <Agenda days={win.days} today={today} byDay={byDay} projectName={projectName} onOpen={setOpenEvent} />
        )}
      </div>

      {openDay && (
        <DayDialog
          date={openDay}
          events={byDay.get(openDay) ?? []}
          projectName={projectName}
          onOpen={(ev) => {
            setOpenDay(null);
            setOpenEvent(ev);
          }}
          onClose={() => setOpenDay(null)}
          onAddTask={() => addTaskOn(openDay)}
        />
      )}
      {openEvent && <EventDialog ev={openEvent} projectName={projectName} onClose={() => setOpenEvent(null)} />}
      {meetingOn && <MeetingDialog date={meetingOn} onOpenChange={(o) => !o && setMeetingOn(null)} />}
    </PageShell>
  );
}

