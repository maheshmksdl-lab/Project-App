"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  ChatTextIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ClockIcon,
  DotsThreeIcon,
  FileTextIcon,
  FlagIcon,
  FolderSimpleIcon,
  LinkSimpleIcon,
  NoteIcon,
  SparkleIcon,
  StackIcon,
  StarIcon,
  WarningIcon,
  FileIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack, PersonAvatar } from "@/components/shared/person-avatar";
import { Card, PageShell, ProgressBar, SectionHeader, ViewAll } from "@/components/shared/project-ui";
import { ErrorState } from "@/components/shared/state-panels";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useHome, useSetFavorite } from "@/hooks/use-projects";
import { useHydrated } from "@/hooks/use-hydrated";
import { useStoredState } from "@/hooks/use-stored-state";
import { useBookmarkKeys, useFiles, useNotes, useReportData, useTasks, useTemplates } from "@/hooks/use-workspace";
import { formatAgo, pluralize, toIsoDate } from "@/lib/format";
import { CURRENT_USER_ID, personById } from "@/lib/mock-data/people";
import { ACCENT, STATUS_DOT, STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import type { ActivityItem, ActivityKind, BriefItem, BriefKind, FocusSummary, HomeData, Person, ProjectSummary, WorkspaceKey, WorkspaceTile } from "@/lib/types/project";
import { cn } from "@/lib/utils";

const me = personById(CURRENT_USER_ID)!;
const people = (ids: string[]) => ids.map(personById).filter((p): p is Person => !!p);

// ── Hero ─────────────────────────────────────────────────────────────

const greetingFor = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** Date line and greeting follow the viewer's clock, so they render after hydration. */
function Hero() {
  const hydrated = useHydrated();
  const now = hydrated ? new Date() : null;
  const firstName = me.name.split(" ")[0];
  return (
    <div className="relative z-10 max-w-[620px] pt-1 pb-6 sm:pb-8">
      <p className="text-[12px] leading-4 font-medium tracking-[0.04em] text-ink-muted uppercase" suppressHydrationWarning>
        {now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : " "}
      </p>
      <h1 className="mt-3 font-serif text-[32px] leading-[1.15] font-semibold tracking-[-0.015em] text-ink sm:text-[40px]" suppressHydrationWarning>
        {now ? greetingFor(now.getHours()) : "Welcome back"}, {firstName}.
      </h1>
      <p className="mt-3 text-[15px] leading-6 text-ink-muted sm:text-[16px]">Plan, coordinate and deliver work across projects, approvals and operations.</p>
    </div>
  );
}

/** Photo behind the top-right of the page, fading into the canvas on its left and bottom. */
function HeroImage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 right-0 hidden h-[226px] w-[54%] max-w-[720px] overflow-hidden md:block"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, #000 34%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 34%)",
      }}
    >
      <Image src="/media/home-hero.jpg" alt="" fill priority sizes="(min-width: 1024px) 720px, 54vw" className="object-cover object-[50%_60%]" />
    </div>
  );
}

// ── Today's brief ────────────────────────────────────────────────────

const BRIEF_STYLE: Record<BriefKind, { icon: Icon; fg: string; bg: string; link: string }> = {
  milestone: { icon: CalendarBlankIcon, fg: "#6A4FF6", bg: "#F4F1FF", link: "#5B3FF3" },
  approvals: { icon: ClockIcon, fg: "#F59E0B", bg: "#FFF7E8", link: "#EA580C" },
  blocked: { icon: WarningIcon, fg: "#EF4444", bg: "#FEF1F1", link: "#DC2626" },
  completed: { icon: CheckCircleIcon, fg: "#16A34A", bg: "#EDFAF1", link: "#15803D" },
  recurring: { icon: ArrowsClockwiseIcon, fg: "#5B3FF3", bg: "#F1EEFE", link: "#5B3FF3" },
};

function BriefEntry({ item }: { item: BriefItem }) {
  const s = BRIEF_STYLE[item.kind];
  const IconCmp = s.icon;
  const linkCls = "mt-2 inline-flex items-center gap-2 rounded text-[13px] leading-5 font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand-action";
  const linkBody = item.action && (
    <>
      {item.action.label}
      <ArrowRightIcon size={13} weight="bold" aria-hidden />
    </>
  );
  return (
    <li className="flex min-w-0 gap-3.5 py-4 xl:px-5 xl:py-1 xl:first:pl-0 xl:last:pr-0">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color: s.fg, backgroundColor: s.bg }}>
        <IconCmp size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 font-semibold text-ink">{item.title}</span>
        <span className="block text-[13px] leading-5 text-ink-muted">
          {item.body}
          {item.highlight && (
            <>
              {" "}
              <span style={{ color: s.link }}>{item.highlight}</span>
            </>
          )}
        </span>
        {item.action?.href && (
          <Link href={item.action.href} className={linkCls} style={{ color: s.link }}>
            {linkBody}
          </Link>
        )}
      </span>
    </li>
  );
}

function TodaysBrief({ brief }: { brief: BriefItem[] }) {
  return (
    <Card label="Today's brief" className="relative z-10 rounded-2xl border-line-soft shadow-[0_4px_24px_rgb(16_24_40/0.05)]">
      <header className="flex items-center gap-2.5 px-5 pt-5 sm:gap-3 sm:px-6">
        <SparkleIcon size={22} className="shrink-0 text-brand" aria-hidden />
        <h2 className="text-[17px] leading-6 font-semibold whitespace-nowrap text-ink">Today&apos;s Brief</h2>
        <span className="rounded-md whitespace-nowrap bg-brand-tint px-2 py-0.5 text-[11px] leading-4 font-medium text-brand">{brief.length} updates</span>
        <div className="ml-auto">
          <ViewAll href="/my-day" />
        </div>
      </header>
      <ul className="grid divide-y divide-line-soft px-5 pt-2 pb-2 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 sm:px-6 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-0 xl:divide-x xl:pt-4 xl:pb-5">
        {brief.map((b) => (
          <BriefEntry key={b.id} item={b} />
        ))}
      </ul>
    </Card>
  );
}

// ── Continue working ─────────────────────────────────────────────────

function CardMenu({ project }: { project: ProjectSummary }) {
  const setFavorite = useSetFavorite();
  const copyLink = () => {
    void navigator.clipboard?.writeText(`${window.location.origin}${projectHref(project.id)}`);
    toast.success("Project link copied");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More actions for ${project.name}`}
        className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-lg text-white drop-shadow transition-colors hover:bg-black/25 focus-visible:outline-2 focus-visible:outline-white data-[state=open]:bg-black/25"
      >
        <DotsThreeIcon size={22} weight="bold" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem asChild>
          <Link href={projectHref(project.id)}>
            <ArrowRightIcon aria-hidden /> Open project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setFavorite.mutate({ id: project.id, favorite: !project.favorite })}>
          <StarIcon aria-hidden /> {project.favorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyLink}>
          <LinkSimpleIcon aria-hidden /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContinueCard({ project }: { project: ProjectSummary }) {
  const accent = ACCENT[project.accent];
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <div className="relative h-[108px] shrink-0 bg-muted">
        {project.thumb.kind === "photo" && (
          <Image src={project.thumb.src} alt="" fill sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        )}
        <CardMenu project={project} />
      </div>
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-3">
        <h3 className="truncate text-[15px] leading-5 font-semibold text-ink">
          <Link href={projectHref(project.id)} className="rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
            {project.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-[13px] leading-5 text-ink-muted">{project.phase}</p>
        <div className="mt-2.5 flex items-center gap-3">
          <ProgressBar value={project.progress} color={accent.bar} className="flex-1" label={`${project.name}: ${project.progress}% complete`} />
          <span className="text-[13px] leading-5 text-ink-body tabular-nums">{project.progress}%</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <AvatarStack people={people(project.memberIds)} extra={project.extraMembers} size="sm" />
          <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-ink-body">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[project.status] }} aria-hidden />
            {STATUS_META[project.status].label}
          </span>
        </div>
        <Link
          href={projectHref(project.id)}
          className="mx-auto mt-3 inline-flex h-8 items-center gap-2 rounded-md px-4 text-[13px] leading-5 font-medium transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
          style={{ backgroundColor: accent.tint, color: accent.fg }}
        >
          Continue
          <ArrowRightIcon size={13} weight="bold" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function ContinueWorking({ projects }: { projects: ProjectSummary[] }) {
  return (
    <section aria-label="Continue working">
      <SectionHeader title="Continue working" action={<ViewAll href="/projects" label="View all projects" />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((p) => (
          <ContinueCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}

// ── Today's focus ────────────────────────────────────────────────────

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-[66px] items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#EEEBFD" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#6A4FF6" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <span className="text-[17px] leading-6 font-semibold text-brand tabular-nums">{value}%</span>
    </span>
  );
}

function FocusStat({ icon: IconCmp, fg, bg, value, label, meta, metaClass }: { icon: Icon; fg: string; bg: string; value: number; label: string; meta: string; metaClass?: string }) {
  return (
    <li className="flex flex-col items-center px-2 py-4 text-center">
      <span className="inline-flex size-9 items-center justify-center rounded-lg" style={{ color: fg, backgroundColor: bg }}>
        <IconCmp size={21} aria-hidden />
      </span>
      <span className="mt-2.5 text-[18px] leading-6 font-semibold text-ink tabular-nums">{value}</span>
      <span className="text-[13px] leading-5 text-ink-body">{label}</span>
      <span className={cn("text-[12px] leading-4 text-ink-muted", metaClass)}>{meta}</span>
    </li>
  );
}

function TodaysFocus({ focus }: { focus: FocusSummary }) {
  const pct = Math.round((focus.done / focus.total) * 100);
  return (
    <section aria-label="Today's focus" className="min-w-0">
      <SectionHeader title="Today's Focus" action={<ViewAll href="/calendar" label="View calendar" />} />
      <Card className="rounded-xl">
        <ul className="grid grid-cols-2 divide-line-soft sm:grid-cols-5 sm:divide-x">
          <li className="col-span-2 flex flex-col items-center px-2 py-4 text-center sm:col-span-1">
            <ProgressRing value={pct} />
            <span className="mt-2 text-[13px] leading-5 text-ink-body">Daily progress</span>
            <span className="text-[12px] leading-4 text-ink-muted">
              {focus.done} of {focus.total} items
            </span>
          </li>
          <FocusStat icon={CheckSquareIcon} fg="#6A4FF6" bg="#F4F1FF" value={focus.tasks.count} label="Tasks" meta={`${focus.tasks.highPriority} high priority`} />
          <FocusStat icon={CalendarBlankIcon} fg="#3B82F6" bg="#EFF5FF" value={focus.meetings.count} label="Meetings" meta={`${focus.meetings.upcoming} upcoming`} />
          <FocusStat icon={CalendarCheckIcon} fg="#F97316" bg="#FFF4EB" value={focus.approvals.count} label="Approvals" meta={`${focus.approvals.pending} pending`} />
          <FocusStat icon={FlagIcon} fg="#EF4444" bg="#FEF1F1" value={focus.deadlines.count} label="Deadline" meta="Due today" metaClass="text-[#DC2626]" />
        </ul>
      </Card>
    </section>
  );
}

// ── My workspace ─────────────────────────────────────────────────────

const WORKSPACE_STYLE: Record<WorkspaceKey, { icon: Icon; fg: string; href: string }> = {
  my_day: { icon: CheckSquareIcon, fg: "#6A4FF6", href: "/my-day" },
  approvals: { icon: FileTextIcon, fg: "#F97316", href: "/workflows?tab=approvals&mine=1" },
  calendar: { icon: CalendarBlankIcon, fg: "#3B82F6", href: "/calendar" },
  notes: { icon: NoteIcon, fg: "#F59E0B", href: "/notes" },
  files: { icon: FolderSimpleIcon, fg: "#3B82F6", href: "/files" },
  bookmarks: { icon: BookmarkSimpleIcon, fg: "#6A4FF6", href: "/bookmarks" },
  templates: { icon: StackIcon, fg: "#6A4FF6", href: "/templates" },
};

const tileClass =
  "flex h-[60px] w-full items-center gap-3 rounded-lg border border-line bg-card px-3.5 text-left shadow-card transition-colors hover:border-brand-soft hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action";

const ALL_TILES: WorkspaceKey[] = ["my_day", "approvals", "calendar", "notes", "files", "bookmarks", "templates"];

/** Live counts for the tiles, from the same data as the pages they open. */
function useTileMeta(): Partial<Record<WorkspaceKey, string>> {
  const hydrated = useHydrated();
  const { data: tasks } = useTasks();
  const { data: report } = useReportData();
  const { data: notes } = useNotes();
  const { data: files } = useFiles();
  const { data: bookmarks } = useBookmarkKeys();
  const { data: templates } = useTemplates();
  if (!hydrated) return {};
  const today = toIsoDate(new Date());
  const open = (tasks ?? []).filter((t) => t.task.assigneeId === CURRENT_USER_ID && t.task.status !== "done" && t.task.dueDate <= today).length;
  return {
    my_day: tasks ? pluralize(open, "task") + " due" : undefined,
    approvals: report ? `${report.approvals.filter((a) => a.status === "pending" && a.approverId === CURRENT_USER_ID).length} pending` : undefined,
    notes: notes ? pluralize(notes.length, "note") : undefined,
    files: files ? pluralize(files.length, "file") : undefined,
    bookmarks: bookmarks ? pluralize(bookmarks.length, "item") : undefined,
    templates: templates ? pluralize(templates.length, "template") : undefined,
  };
}

/** "Customize": choose which tiles show (kept in this browser). */
function CustomizeDialog({ visible, onChange, onClose }: { visible: WorkspaceKey[]; onChange: (v: WorkspaceKey[]) => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-3 rounded-2xl">
        <DialogTitle className="pr-8 text-[17px] font-semibold text-ink">Customize My Workspace</DialogTitle>
        <DialogDescription className="text-[13px] text-ink-muted">Choose the shortcuts shown on Home. Saved in this browser.</DialogDescription>
        <ul className="space-y-1">
          {ALL_TILES.map((k) => {
            const s = WORKSPACE_STYLE[k];
            const IconCmp = s.icon;
            const on = visible.includes(k);
            return (
              <li key={k}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand-surface">
                  <Checkbox
                    checked={on}
                    disabled={on && visible.length === 1}
                    onCheckedChange={(v) => onChange(v === true ? ALL_TILES.filter((x) => x === k || visible.includes(x)) : visible.filter((x) => x !== k))}
                    className="data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                  />
                  <IconCmp size={18} aria-hidden style={{ color: s.fg }} />
                  <span className="text-[13px] text-ink">{TILE_LABEL[k]}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between gap-2">
          <button type="button" onClick={() => onChange(ALL_TILES)} className="rounded text-[13px] font-medium text-brand hover:text-brand-press">
            Show all
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-button text-white hover:bg-brand-press">
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TILE_LABEL: Record<WorkspaceKey, string> = { my_day: "My Day", approvals: "Approvals", calendar: "Calendar", notes: "Notes", files: "Files", bookmarks: "Bookmarks", templates: "Templates" };

function MyWorkspace({ tiles }: { tiles: WorkspaceTile[] }) {
  const [visible, setVisible] = useStoredState<WorkspaceKey[]>("evoq-projects:home-tiles", ALL_TILES);
  const [customizing, setCustomizing] = useState(false);
  const meta = useTileMeta();
  return (
    <section aria-label="My workspace" className="min-w-0">
      <SectionHeader title="My Workspace" action={<ViewAll label="Customize" onClick={() => setCustomizing(true)} />} />
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles
          .filter((t) => visible.includes(t.key))
          .map((t) => {
            const s = WORKSPACE_STYLE[t.key];
            const IconCmp = s.icon;
            return (
              <li key={t.key}>
                <Link href={s.href} className={tileClass}>
                  <IconCmp size={24} aria-hidden className="shrink-0" style={{ color: s.fg }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] leading-5 font-medium text-ink">{t.label}</span>
                    <span className="block truncate text-[12px] leading-4 text-ink-muted">{meta[t.key] ?? t.meta}</span>
                  </span>
                </Link>
              </li>
            );
          })}
      </ul>
      {customizing && <CustomizeDialog visible={visible} onChange={setVisible} onClose={() => setCustomizing(false)} />}
    </section>
  );
}

// ── Recent activity ──────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityKind, { icon: Icon; fg: string }> = {
  approved: { icon: CheckCircleIcon, fg: "#16A34A" },
  uploaded: { icon: FileIcon, fg: "#3B82F6" },
  completed: { icon: CheckCircleIcon, fg: "#16A34A" },
  commented: { icon: ChatTextIcon, fg: "#6A4FF6" },
  updated: { icon: ClockIcon, fg: "#667085" },
};

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section aria-label="Recent activity">
      <SectionHeader title="Recent Activity" action={<ViewAll href="/activity" />} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((a) => {
          const actor = personById(a.actorId);
          const s = ACTIVITY_ICON[a.kind];
          const IconCmp = s.icon;
          return (
            <li key={a.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3 shadow-card">
              {actor && <PersonAvatar name={actor.name} src={actor.avatar} size="lg" className="size-9" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] leading-[18px] font-medium text-ink">{actor?.name}</span>
                <span className="block truncate text-[12.5px] leading-[18px] text-ink-body">
                  {a.verb} <span className="text-ink">{a.object}</span>
                </span>
                <span className="block text-[11.5px] leading-4 text-ink-muted">{formatAgo(a.minutesAgo)}</span>
              </span>
              <IconCmp size={22} aria-hidden className="shrink-0" style={{ color: s.fg }} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading home">
      <Skeleton className="h-[150px] rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[264px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[170px] rounded-xl" />
        <Skeleton className="h-[170px] rounded-xl" />
      </div>
    </div>
  );
}

function HomeContent({ data }: { data: HomeData }) {
  return (
    <div className="space-y-7">
      <TodaysBrief brief={data.brief} />
      <ContinueWorking projects={data.continueWorking} />
      <div className="grid gap-7 xl:grid-cols-2 xl:gap-9">
        <TodaysFocus focus={data.focus} />
        <MyWorkspace tiles={data.workspace} />
      </div>
      <RecentActivity items={data.activity} />
    </div>
  );
}

export function HomeDashboard() {
  const { data, isError, refetch } = useHome();
  const hydrated = useHydrated();

  return (
    <div className="relative">
      <HeroImage />
      <PageShell className="relative">
        <Hero />
        {isError ? (
          <ErrorState
            action={
              <button type="button" onClick={() => refetch()} className="text-[13px] font-medium text-brand hover:underline">
                Try again
              </button>
            }
          />
        ) : hydrated && data ? (
          <HomeContent data={data} />
        ) : (
          <HomeSkeleton />
        )}
      </PageShell>
    </div>
  );
}
