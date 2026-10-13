"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  CheckIcon,
  CompassIcon,
  CopyIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  FolderSimpleIcon,
  GearSixIcon,
  LinkSimpleIcon,
  NoteIcon,
  PencilSimpleIcon,
  PlusIcon,
  StackIcon,
  StarIcon,
  TrashIcon,
  TrendUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack, PersonAvatar } from "@/components/shared/person-avatar";
import { Badge, Card, CardHeader, IconButton, OutlineButton, PrimaryButton, ProgressBar, StatusPill, UnderlineTabs, ViewAll } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useArchiveProject, useProject, useSetFavorite, useSetTaskDone, useUpdateAbout } from "@/hooks/use-projects";
import { formatCurrency, formatDate, formatDateRange } from "@/lib/format";
import { personById } from "@/lib/mock-data/people";
import { ACCENT, PRIORITY_META, STATUS_DOT, STATUS_META, TASK_STATUS_META } from "@/lib/project-meta";
import type { Milestone, Person, ProjectDetail, ProjectTask } from "@/lib/types/project";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { FilesPanel } from "@/components/files/files-panel";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { useCreate } from "@/components/shared/create-dialogs";
import { ApprovalCard } from "@/components/workflows/approval-card";
import { useFolders, useNotes, useReportData, useSaveAsTemplate } from "@/hooks/use-workspace";
import { ProjectDiscussion } from "./project-discussion";
import { copyProjectLink } from "./project-actions";
import { ProjectTimeline } from "./project-timeline";

type DetailTab = "overview" | "tasks" | "timeline" | "milestones" | "files" | "discussion" | "approvals" | "activity";

const TABS: { value: DetailTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "tasks", label: "Tasks" },
  { value: "timeline", label: "Timeline" },
  { value: "milestones", label: "Milestones" },
  { value: "files", label: "Files" },
  { value: "discussion", label: "Discussion" },
  { value: "approvals", label: "Approvals" },
  { value: "activity", label: "Activity" },
];

const people = (ids: string[]) => ids.map(personById).filter((p): p is Person => !!p);

// ── Actions ──────────────────────────────────────────────────────────

/** Archive / delete both take the project off the list (the mock keeps no archive) and return to it. */
function useRemoveProject(project: ProjectDetail, onClose: () => void) {
  const archive = useArchiveProject();
  return (verb: "archived" | "deleted") =>
    archive.mutate(project.id, {
      onSuccess: () => {
        toast.success(`${project.name} ${verb}`);
        onClose();
      },
    });
}

function DeleteDialog({ project, open, onOpenChange, onClose }: { project: ProjectDetail; open: boolean; onOpenChange: (o: boolean) => void; onClose: () => void }) {
  const remove = useRemoveProject(project, onClose);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="text-[17px] font-semibold text-ink">Delete {project.name}?</DialogTitle>
        <DialogDescription className="text-[14px] leading-[22px] text-ink-muted">
          The project, its milestones, tasks and files will be removed for everyone. This can&apos;t be undone.
        </DialogDescription>
        <DialogFooter className="mt-2 gap-2">
          <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
          <PrimaryButton className="bg-[#DC2626] shadow-none hover:bg-[#B91C1C]" onClick={() => remove("deleted")}>
            Delete project
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Header ───────────────────────────────────────────────────────────

function DetailHeader({
  project,
  tab,
  onTab,
  onDelete,
  onClose,
}: {
  project: ProjectDetail;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const setFavorite = useSetFavorite();
  const remove = useRemoveProject(project, onClose);
  const dialogs = useAppDialogs();
  return (
    <div className="relative overflow-hidden border-b border-line bg-white">
      {project.heroImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] max-w-[420px] @lg:block"
          style={{ maskImage: "linear-gradient(to right, transparent 0%, #000 45%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 45%)" }}
        >
          <Image src={project.heroImage} alt="" fill priority sizes="420px" className="object-cover object-[60%_30%]" />
        </div>
      )}
      <div className="relative px-4 pt-4 @lg:px-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project and back to Projects"
          className="inline-flex items-center gap-1.5 rounded text-[12px] leading-4 text-ink-muted transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
        >
          <ArrowLeftIcon size={13} aria-hidden />
          Projects
        </button>

        <div className="mt-3 flex items-center gap-2 sm:gap-3">
          <h1 id="project-title" className="min-w-0 text-[22px] leading-8 font-semibold tracking-[-0.01em] text-ink @lg:text-[26px] @lg:leading-9">{project.name}</h1>
          <button
            type="button"
            onClick={() => setFavorite.mutate({ id: project.id, favorite: !project.favorite })}
            aria-pressed={project.favorite}
            aria-label={project.favorite ? "Remove from favorites" : "Add to favorites"}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#F59E0B] transition-colors hover:bg-[#FFF7E8] focus-visible:outline-2 focus-visible:outline-brand-action"
          >
            <StarIcon size={20} weight={project.favorite ? "fill" : "regular"} aria-hidden />
          </button>
          <BookmarkButton type="project" refId={project.id} label={project.name} className="-ml-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="Project actions">
                <DotsThreeIcon size={22} weight="bold" aria-hidden />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl">
              <DropdownMenuItem onSelect={() => dialogs.openProjectSettings(project.id)}>
                <GearSixIcon aria-hidden /> Project settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dialogs.openDuplicateProject(project)}>
                <CopyIcon aria-hidden /> Duplicate project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dialogs.openMoveToFolder(project)}>
                <FolderSimpleIcon aria-hidden /> Move to folder
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyProjectLink(project.id)}>
                <LinkSimpleIcon aria-hidden /> Copy project link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => remove("archived")}>
                <ArchiveIcon aria-hidden /> Archive project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <TrashIcon aria-hidden /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-1 max-w-2xl text-[14px] leading-5 text-ink-muted">{project.summary}</p>

        <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-x-4 gap-y-2.5 @2xl:gap-x-6 rounded-lg bg-white/85 py-1.5 pr-3 backdrop-blur-sm">
          <StatusPill status={project.status} className="py-1" />
          <span className="inline-flex items-center gap-3 text-[13px] font-medium text-ink">
            {project.progress}% complete
            <ProgressBar value={project.progress} color={ACCENT[project.accent].bar} className="w-[72px]" />
          </span>
          <span className="text-[13px] text-ink-body">{formatDateRange(project.startDate, project.endDate)}</span>
          <AvatarStack people={people(project.memberIds)} extra={project.extraMembers} size="md" className="[&_[data-slot=avatar]]:size-7" />
        </div>

        <UnderlineTabs label="Project sections" className="relative mt-5 w-fit max-w-full gap-5 border-b-0 bg-white/85 pr-3 backdrop-blur-sm sm:gap-5 @2xl:gap-7" tabs={TABS} value={tab} onChange={onTab} />
      </div>
    </div>
  );
}

// ── Overview cards ───────────────────────────────────────────────────

function AboutCard({ project }: { project: ProjectDetail }) {
  const update = useUpdateAbout(project.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.about);
  const save = () =>
    update.mutate(draft, {
      onSuccess: () => {
        setEditing(false);
        toast.success("Description updated");
      },
    });

  return (
    <Card label="About this project">
      <CardHeader
        title="About this project"
        action={
          !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(project.about);
                setEditing(true);
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] leading-4 text-ink-body transition-colors hover:border-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
            >
              <PencilSimpleIcon size={13} aria-hidden />
              Edit
            </button>
          )
        }
      />
      <div className="px-5 pb-5">
        {editing ? (
          <div>
            <label htmlFor="project-about" className="sr-only">
              Project description
            </label>
            <textarea
              id="project-about"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-y rounded-lg border border-line px-3 py-2 text-[13px] leading-[21px] text-ink outline-none focus:border-brand-soft focus:ring-3 focus:ring-brand-10"
            />
            <div className="mt-2 flex justify-end gap-2">
              <OutlineButton className="h-8" onClick={() => setEditing(false)}>
                Cancel
              </OutlineButton>
              <PrimaryButton className="h-8" icon={CheckIcon} onClick={save} disabled={!draft.trim() || update.isPending}>
                Save
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <p className="text-[13px] leading-[21px] text-ink-body">{project.about}</p>
        )}
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
          {project.tags.map((t) => (
            <li key={t.label}>
              <Badge fg={t.tone === "red" ? "#DC2626" : "#475467"} bg={t.tone === "red" ? "#FEF2F2" : "#F2F4F7"} className="px-2.5 py-1">
                {t.label}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function MilestoneIcon({ state }: { state: Milestone["state"] }) {
  if (state === "completed") {
    return (
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
        <CheckIcon size={12} weight="bold" aria-hidden />
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-brand ring-4 ring-brand-tint">
        <span className="size-2 rounded-full bg-white" aria-hidden />
      </span>
    );
  }
  return <span className="size-[22px] shrink-0 rounded-full border-[1.5px] border-[#C4C9D4] bg-white" />;
}

function milestoneMeta(m: Milestone) {
  if (m.state === "completed") return `Completed · ${formatDate(m.completedOn ?? m.endDate)}`;
  if (m.state === "in_progress") return `In progress · ${m.progress ?? 0}% complete`;
  return "Not started";
}

function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol className="px-5 pb-3">
      {milestones.map((m) => (
        <li key={m.id} className="flex items-center gap-4 py-2.5">
          <MilestoneIcon state={m.state} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-5 font-medium text-ink">{m.name}</span>
            <span className="block text-[12px] leading-4 text-ink-muted">{milestoneMeta(m)}</span>
          </span>
          <span className="hidden shrink-0 text-[11.5px] leading-4 text-ink-body @[460px]/main:block">{formatDateRange(m.startDate, m.endDate)}</span>
        </li>
      ))}
    </ol>
  );
}

const taskHead = "px-2 py-2 text-left text-[11px] leading-4 font-normal whitespace-nowrap text-ink-muted";
const taskCell = "px-2 py-2.5 align-middle";

function TaskTable({ tasks }: { tasks: ProjectTask[] }) {
  const setDone = useSetTaskDone();
  const { openTask } = useAppDialogs();
  return (
    <div className="relative overflow-x-auto px-3 pb-3 scrollbar-thin">
      <table className="w-full min-w-[540px] border-collapse">
        <thead>
          <tr>
            <th scope="col" className={cn(taskHead, "w-10")}>Task</th>
            <th scope="col" className={taskHead}>Title</th>
            <th scope="col" className={taskHead}>Assignee</th>
            <th scope="col" className={taskHead}>Due Date</th>
            <th scope="col" className={taskHead}>Priority</th>
            <th scope="col" className={taskHead}>Status</th>
            <th scope="col" className={cn(taskHead, "w-8")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const assignee = personById(t.assigneeId);
            const done = t.status === "done";
            const pr = PRIORITY_META[t.priority];
            const st = TASK_STATUS_META[t.status];
            return (
              <tr key={t.id} className="border-t border-line-soft">
                <td className={taskCell}>
                  <Checkbox
                    checked={done}
                    onCheckedChange={(v) => setDone.mutate({ taskId: t.id, done: v === true })}
                    aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                    className="size-4 rounded-[4px] border-[#D0D5DD] data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                  />
                </td>
                <td className={cn(taskCell, "min-w-[170px] text-[13px] leading-5")}>
                  <button
                    type="button"
                    onClick={() => openTask(t.id)}
                    className={cn("rounded text-left hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action", done ? "text-ink-muted line-through" : "text-ink")}
                  >
                    {t.title}
                  </button>
                </td>
                <td className={taskCell}>{assignee && <PersonAvatar name={assignee.name} src={assignee.avatar} size="sm" />}</td>
                <td className={cn(taskCell, "text-[12.5px] whitespace-nowrap text-ink-body")}>{formatDate(t.dueDate)}</td>
                <td className={taskCell}>
                  <Badge fg={pr.fg} bg={pr.bg} dot>
                    {pr.label}
                  </Badge>
                </td>
                <td className={taskCell}>
                  <Badge fg={st.fg} bg={st.bg} dot={st.dot}>
                    {st.label}
                  </Badge>
                </td>
                <td className={cn(taskCell, "text-right")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton aria-label={`Actions for ${t.title}`} className="size-7">
                        <DotsThreeVerticalIcon size={16} weight="bold" aria-hidden />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                      <DropdownMenuItem onSelect={() => setDone.mutate({ taskId: t.id, done: !done })}>
                        <CheckIcon aria-hidden /> {done ? "Mark not done" : "Mark done"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openTask(t.id)}>
                        <ArrowRightIcon aria-hidden /> Open task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Side panel ───────────────────────────────────────────────────────

function PanelSection({ title, count, action, children, className }: { title: string; count?: number; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("py-4 first:pt-0", className)} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14px] leading-5 font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-1 text-[12px] font-normal text-ink-muted">({count})</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const panelLink =
  "flex w-full items-center gap-3 rounded-md py-1.5 text-left text-[13px] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-brand-action";

function MoreAction({ icon: IconCmp, label, onClick, danger }: { icon: Icon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cn(panelLink, danger ? "text-[#DC2626] hover:text-[#B91C1C]" : "text-ink-body hover:text-brand")}>
        <IconCmp size={16} aria-hidden className={cn("shrink-0", danger ? "text-[#DC2626]" : "text-ink-muted")} />
        {label}
      </button>
    </li>
  );
}

function SidePanel({ project, onDelete, onClose }: { project: ProjectDetail; onDelete: () => void; onClose: () => void }) {
  const owner = personById(project.ownerId);
  const remove = useRemoveProject(project, onClose);
  const saveAsTemplate = useSaveAsTemplate();
  const router = useRouter();
  const dialogs = useAppDialogs();
  const { data: folders } = useFolders();
  const { data: allNotes } = useNotes();
  const notes = (allNotes ?? []).filter((n) => n.projectId === project.id);
  const folder = folders?.find((f) => f.id === project.folderId);
  const team = people(project.memberIds);
  const budgetPct = project.budget.total ? Math.round((project.budget.spent / project.budget.total) * 100) : 0;
  const hasAddress = (href: string) => /^https?:\/\//.test(href);
  return (
    <Card label="Project details" className="p-5">
      <PanelSection title="Project owner">
        {owner && (
          <div className="flex items-center gap-3">
            <PersonAvatar name={owner.name} src={owner.avatar} size="lg" className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-5 font-semibold text-ink">{owner.name}</span>
              <span className="block truncate text-[12px] leading-4 text-ink-muted">{owner.role}</span>
            </span>
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Team"
        count={team.length + project.extraMembers}
        action={
          <button type="button" onClick={() => dialogs.openProjectSettings(project.id)} className="rounded text-[12px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Manage
          </button>
        }
      >
        <AvatarStack people={team} extra={project.extraMembers} size="md" />
      </PanelSection>

      <PanelSection title="Dates">
        <p className="flex items-center gap-2.5 text-[13px] leading-5 text-ink">
          <CalendarBlankIcon size={16} aria-hidden className="text-ink-muted" />
          {formatDateRange(project.startDate, project.endDate)}
        </p>
        <p className="mt-2 flex items-center gap-2.5 text-[13px] leading-5" style={{ color: STATUS_META[project.status].fg }}>
          <TrendUpIcon size={16} aria-hidden style={{ color: STATUS_DOT[project.status] }} />
          {STATUS_META[project.status].label}
        </p>
      </PanelSection>

      <PanelSection title="Budget">
        <ProgressBar value={budgetPct} color={ACCENT.purple.bar} className="h-1.5" label={`Budget ${budgetPct}% used`} />
        <p className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] leading-4">
          <span className="font-medium text-ink">
            {formatCurrency(project.budget.spent)} / {formatCurrency(project.budget.total)}
          </span>
          <span className="text-ink-body">{budgetPct}%</span>
        </p>
      </PanelSection>

      <PanelSection
        title="Folder"
        action={
          <button type="button" onClick={() => dialogs.openMoveToFolder(project)} className="rounded text-[12px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Move
          </button>
        }
      >
        <p className="flex items-center gap-2.5 text-[13px] leading-5 text-ink">
          <FolderSimpleIcon size={16} aria-hidden className="text-ink-muted" />
          {folder ? (
            <Link href={`/projects?folder=${folder.id}`} className="truncate rounded hover:text-brand">
              {folder.name}
            </Link>
          ) : (
            <span className="text-ink-muted">No folder</span>
          )}
        </p>
      </PanelSection>

      <PanelSection title="Links">
        <ul>
          {project.links.map((l) => (
            <li key={l.id} className="group/link flex items-center gap-1">
              {l.href.startsWith("/") ? (
                <Link href={l.href} className={cn(panelLink, "min-w-0 text-brand hover:text-brand-press")}>
                  <FileTextIcon size={16} aria-hidden className="shrink-0" />
                  <span className="truncate">{l.label}</span>
                </Link>
              ) : hasAddress(l.href) ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn(panelLink, "min-w-0 text-brand hover:text-brand-press")}>
                  <FileTextIcon size={16} aria-hidden className="shrink-0" />
                  <span className="truncate">{l.label}</span>
                </a>
              ) : (
                <button type="button" onClick={() => dialogs.openLink(project.id, l)} className={cn(panelLink, "min-w-0 text-ink-muted hover:text-brand")} title="No address yet — add one">
                  <FileTextIcon size={16} aria-hidden className="shrink-0" />
                  <span className="truncate">{l.label}</span>
                  <span className="sr-only">(no address yet)</span>
                </button>
              )}
              <IconButton aria-label={`Edit link ${l.label}`} onClick={() => dialogs.openLink(project.id, l)} className="size-7 shrink-0">
                <PencilSimpleIcon size={13} aria-hidden />
              </IconButton>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => dialogs.openLink(project.id, null)} className={cn(panelLink, "text-brand hover:text-brand-press")}>
              <PlusIcon size={16} aria-hidden className="shrink-0" />
              Add link
            </button>
          </li>
        </ul>
      </PanelSection>

      <PanelSection
        title="Notes"
        count={notes.length}
        action={
          <Link href={`/notes?note=new&project=${encodeURIComponent(project.id)}`} className="rounded text-[12px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Add
          </Link>
        }
      >
        {notes.length ? (
          <ul>
            {notes.slice(0, 3).map((n) => (
              <li key={n.id}>
                <Link href={`/notes?note=${n.id}`} className={cn(panelLink, "text-ink-body hover:text-brand")}>
                  <NoteIcon size={16} aria-hidden className="shrink-0 text-ink-muted" />
                  <span className="truncate">{n.title}</span>
                </Link>
              </li>
            ))}
            {notes.length > 3 && (
              <li>
                <Link href={`/notes?project=${encodeURIComponent(project.id)}`} className="text-[12px] font-medium text-brand hover:text-brand-press">
                  All {notes.length} notes
                </Link>
              </li>
            )}
          </ul>
        ) : (
          <p className="text-[12.5px] text-ink-muted">No notes yet.</p>
        )}
      </PanelSection>

      <PanelSection title="More" className="pb-0">
        <ul>
          <MoreAction icon={GearSixIcon} label="Settings" onClick={() => dialogs.openProjectSettings(project.id)} />
          <MoreAction icon={LinkSimpleIcon} label="Copy project link" onClick={() => copyProjectLink(project.id)} />
          <MoreAction icon={CopyIcon} label="Duplicate project" onClick={() => dialogs.openDuplicateProject(project)} />
          <MoreAction icon={FolderSimpleIcon} label="Move to folder" onClick={() => dialogs.openMoveToFolder(project)} />
          <MoreAction
            icon={StackIcon}
            label="Convert to template"
            onClick={() =>
              saveAsTemplate.mutate(
                { projectId: project.id, name: `${project.name} template` },
                {
                  onSuccess: (tpl) =>
                    toast.success("Template saved", { description: tpl.name, action: { label: "View templates", onClick: () => router.push("/templates") } }),
                  onError: (err) => toast.error("Couldn't save the template", { description: err.message }),
                },
              )
            }
          />
          <MoreAction icon={ArchiveIcon} label="Archive project" onClick={() => remove("archived")} />
          <MoreAction icon={TrashIcon} label="Delete project" onClick={onDelete} danger />
        </ul>
      </PanelSection>
    </Card>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────

function Overview({ project, onTab }: { project: ProjectDetail; onTab: (t: DetailTab) => void }) {
  return (
    <div className="space-y-4">
      <AboutCard key={project.about} project={project} />
      <Card label="Key milestones">
        <CardHeader title="Key milestones" action={<ViewAll label="View all milestones" onClick={() => onTab("milestones")} />} />
        <MilestoneList milestones={project.milestones} />
      </Card>
      <Card label="Timeline" className="px-5 pt-4 pb-5">
        <ProjectTimeline title="Timeline" rows={project.timeline} projectStart={project.startDate} onExpand={() => onTab("timeline")} />
      </Card>
      <Card label="Recent tasks">
        <CardHeader title="Recent tasks" action={<ViewAll label="View all tasks" onClick={() => onTab("tasks")} />} />
        <TaskTable tasks={project.tasks} />
      </Card>
    </div>
  );
}


const cardAction =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] leading-4 text-ink-body transition-colors hover:border-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action";

/** All tasks, with "Add task" (the shared New task dialog, preset to this project). */
function ProjectTasks({ project }: { project: ProjectDetail }) {
  const { openCreateTask } = useCreate();
  return (
    <Card label="Tasks">
      <CardHeader
        title={`Tasks (${project.tasks.length})`}
        action={
          <button type="button" onClick={() => openCreateTask({ projectId: project.id })} className={cardAction}>
            <PlusIcon size={13} aria-hidden />
            Add task
          </button>
        }
      />
      {project.tasks.length ? (
        <TaskTable tasks={project.tasks} />
      ) : (
        <EmptyState icon={CheckIcon} title="No tasks yet" hint="Add the first task to start tracking work." className="py-10" />
      )}
    </Card>
  );
}

/** Approval requests raised for this project, decided here or on Workflows → Approvals. */
function ProjectApprovals({ project }: { project: ProjectDetail }) {
  const { data } = useReportData();
  const { openRequestApproval } = useCreate();
  const approvals = (data?.approvals ?? []).filter((a) => a.projectId === project.id);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] leading-6 font-semibold text-ink">Approvals ({approvals.length})</h2>
        <button type="button" onClick={() => openRequestApproval({ projectId: project.id })} className={cn(cardAction, "ml-auto bg-white")}>
          <PlusIcon size={13} aria-hidden />
          Request approval
        </button>
      </div>
      {!data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : approvals.length ? (
        <ul className="grid gap-3">
          {approvals.map((a) => (
            <ApprovalCard key={a.id} approval={a} today={data.today} />
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState icon={CheckIcon} title="No approval requests" hint="Requests for this project — from people or workflows — appear here." className="py-10" />
        </Card>
      )}
    </div>
  );
}

function TabBody({ project, tab, onTab }: { project: ProjectDetail; tab: DetailTab; onTab: (t: DetailTab) => void }) {
  if (tab === "overview") return <Overview project={project} onTab={onTab} />;
  if (tab === "tasks") {
    return <ProjectTasks project={project} />;
  }
  if (tab === "approvals") {
    return <ProjectApprovals project={project} />;
  }
  if (tab === "milestones") {
    return (
      <Card label="Milestones">
        <CardHeader title={`Milestones (${project.milestones.length})`} />
        <MilestoneList milestones={project.milestones} />
      </Card>
    );
  }
  if (tab === "timeline") {
    return (
      <Card label="Timeline" className="px-5 pt-4 pb-5">
        <ProjectTimeline title="Timeline" rows={project.timeline} projectStart={project.startDate} tall />
      </Card>
    );
  }
  if (tab === "files") {
    return (
      <Card label="Files" className="p-4 @lg:p-5">
        <FilesPanel projectId={project.id} />
      </Card>
    );
  }
  if (tab === "discussion") return <ProjectDiscussion projectId={project.id} />;
  return (
    <Card label="Activity">
      <CardHeader title="Activity" />
      <div className="px-5 pb-5">
        <ActivityFeed projectId={project.id} />
      </div>
    </Card>
  );
}

const TAB_VALUES = TABS.map((t) => t.value);
export const isDetailTab = (v: string | null | undefined): v is DetailTab => !!v && (TAB_VALUES as string[]).includes(v);

// ── Panel ────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading project">
      <div className="border-b border-line bg-white px-4 pt-4 pb-6 @lg:px-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-4 h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <Skeleton className="mt-5 h-7 w-[420px] max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 @lg:p-5 @[620px]:grid-cols-[minmax(0,1fr)_200px] @[1100px]:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </div>
  );
}

/**
 * A project's details, shown on the Project Details page. Its layout follows
 * its own width (container queries), not the window's. Remount it per
 * project (key) so the tab resets.
 */
export function ProjectPanel({ projectId, onClose, initialTab, openTaskId }: { projectId: string; onClose: () => void; initialTab?: string; openTaskId?: string }) {
  const { data: project, isError, isPending, refetch } = useProject(projectId);
  const [tab, setTab] = useState<DetailTab>(isDetailTab(initialTab) ? initialTab : "overview");
  const { openTask } = useAppDialogs();
  // A bookmarked task (…?task=<id>) opens its details once.
  const taskOpened = useRef(false);
  useEffect(() => {
    if (openTaskId && project && !taskOpened.current) {
      taskOpened.current = true;
      openTask(openTaskId);
    }
  }, [openTaskId, project, openTask]);
  const [deleting, setDeleting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  let body: ReactNode;
  if (isError) {
    body = <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />;
  } else if (isPending) {
    body = <PanelSkeleton />;
  } else if (!project) {
    body = (
      <EmptyState
        icon={CompassIcon}
        title="This project isn't available"
        hint="It may have been archived or deleted, or the link is wrong."
        action={<OutlineButton onClick={onClose}>Back to projects</OutlineButton>}
      />
    );
  } else {
    const changeTab = (t: DetailTab) => {
      setTab(t);
      topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    body = (
      <>
        <DetailHeader project={project} tab={tab} onTab={setTab} onDelete={() => setDeleting(true)} onClose={onClose} />
        <div className="grid grid-cols-1 gap-4 p-4 @lg:p-5 @[620px]:grid-cols-[minmax(0,1fr)_200px] @[1100px]:grid-cols-[minmax(0,1fr)_260px]">
          <div className="@container/main min-w-0">
            <TabBody project={project} tab={tab} onTab={changeTab} />
          </div>
          <div className="min-w-0">
            <SidePanel project={project} onDelete={() => setDeleting(true)} onClose={onClose} />
          </div>
        </div>
        <DeleteDialog project={project} open={deleting} onOpenChange={setDeleting} onClose={onClose} />
      </>
    );
  }

  return (
    <div ref={topRef} className="@container min-h-full scroll-mt-[var(--header-h)] bg-[#F7F7FA]">
      {body}
    </div>
  );
}
