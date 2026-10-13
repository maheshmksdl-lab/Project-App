"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRightIcon, CaretDownIcon, FolderSimpleIcon, FolderSimplePlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { OutlineButton } from "@/components/shared/project-ui";
import { ConfirmDialog, FormDialog, FormField, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { useArchiveProject, usePeople, useProject } from "@/hooks/use-projects";
import {
  useCreateFolder,
  useDeleteTask,
  useDuplicateProject,
  useFolders,
  useMoveToFolder,
  useRemoveLink,
  useSaveLink,
  useTasks,
  useTeams,
  useUpdateProject,
  useUpdateTask,
} from "@/hooks/use-workspace";
import { formatCurrency } from "@/lib/format";
import { PRIORITY_META, STATUS_META, TASK_STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import { duplicateFormSchema, fieldErrors, linkFormSchema, projectSettingsSchema, taskEditSchema, type DuplicateFormValues, type LinkFormValues, type TaskEditValues } from "@/lib/schemas/workspace";
import type { ProjectLink, ProjectStatus } from "@/lib/types/project";
import { cn } from "@/lib/utils";

type Close = () => void;

function focusFirst(prefix: string, errs: Record<string, string>) {
  document.getElementById(`${prefix}-${Object.keys(errs)[0]}`)?.focus();
}

/** Multi-select of people (or teams) as a dropdown of checkboxes. */
export function MultiPicker({ id, options, value, onChange, placeholder }: { id: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const chosen = options.filter((o) => value.includes(o.value));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger id={id} className={cn(fieldClass, "flex items-center justify-between text-left")}>
        <span className={cn("truncate", !chosen.length && "text-ink-muted")}>{chosen.length ? chosen.map((o) => o.label).join(", ") : placeholder}</span>
        <CaretDownIcon size={14} aria-hidden className="shrink-0 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(on) => onChange(on ? [...value, o.value] : value.filter((x) => x !== o.value))}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// ── Task details ─────────────────────────────────────────────────────

/** A task's details: edit title, assignee, due date, priority and status, or delete it. */
export function TaskDialog({ taskId, onClose }: { taskId: string; onClose: Close }) {
  const { data: tasks, isPending } = useTasks();
  const { data: people = [] } = usePeople();
  const entry = tasks?.find((t) => t.task.id === taskId);
  if (isPending) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="Task" submitLabel="Save" onSubmit={() => {}} pending>
        <Skeleton className="h-48 rounded-lg" />
      </FormDialog>
    );
  }
  if (!entry) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="This task isn't available" description="It may have been deleted." submitLabel="Close" onSubmit={onClose}>
        <p className="text-[13px] text-ink-muted">Nothing to show.</p>
      </FormDialog>
    );
  }
  return <TaskForm key={taskId} entry={entry} people={people} onClose={onClose} />;
}

function TaskForm({ entry, people, onClose }: { entry: NonNullable<ReturnType<typeof useTasks>["data"]>[number]; people: { id: string; name: string }[]; onClose: Close }) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const { task, project } = entry;
  const [values, setValues] = useState<TaskEditValues>({ title: task.title, assigneeId: task.assigneeId, dueDate: task.dueDate, priority: task.priority, status: task.status });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof TaskEditValues>(k: K, v: TaskEditValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = () => {
    const parsed = taskEditSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      return focusFirst("td", errs);
    }
    update.mutate(
      { taskId: task.id, changes: parsed.data },
      {
        onSuccess: () => {
          toast.success("Task saved", { description: parsed.data.title });
          onClose();
        },
        onError: (err) => toast.error("Couldn't save the task", { description: err.message }),
      },
    );
  };
  return (
    <>
      <FormDialog
        open={!confirm}
        onOpenChange={(o) => !o && onClose()}
        title="Task details"
        description={`In ${project.name}`}
        submitLabel="Save task"
        onSubmit={submit}
        pending={update.isPending}
        extraAction={
          <div className="flex items-center gap-1">
            <OutlineButton icon={TrashIcon} className="h-8 hover:text-[#DC2626]" onClick={() => setConfirm(true)}>
              Delete
            </OutlineButton>
            <BookmarkButton type="task" refId={task.id} label={task.title} />
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="td-title" error={errors.title} className="sm:col-span-2">
            <input id="td-title" value={values.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} className={fieldClass} />
          </FormField>
          <FormField label="Status" htmlFor="td-status">
            <SelectField id="td-status" value={values.status} onChange={(v) => set("status", v as TaskEditValues["status"])} options={(Object.keys(TASK_STATUS_META) as TaskEditValues["status"][]).map((s) => ({ value: s, label: TASK_STATUS_META[s].label }))} />
          </FormField>
          <FormField label="Priority" htmlFor="td-priority">
            <SelectField id="td-priority" value={values.priority} onChange={(v) => set("priority", v as TaskEditValues["priority"])} options={(["high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
          </FormField>
          <FormField label="Assignee" htmlFor="td-assigneeId" error={errors.assigneeId}>
            <SelectField id="td-assigneeId" value={values.assigneeId} onChange={(v) => set("assigneeId", v)} options={people.map((p) => ({ value: p.id, label: p.name }))} />
          </FormField>
          <FormField label="Due date" htmlFor="td-dueDate" error={errors.dueDate}>
            <input id="td-dueDate" type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} aria-invalid={!!errors.dueDate} className={fieldClass} />
          </FormField>
          <Link href={projectHref(project.id)} onClick={onClose} className="inline-flex w-fit items-center gap-1.5 rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action sm:col-span-2">
            Open {project.name}
            <ArrowRightIcon size={13} weight="bold" aria-hidden />
          </Link>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => !o && setConfirm(false)}
        title={`Delete "${task.title}"?`}
        description={`The task is removed from ${project.name}, My Day and the Calendar.`}
        confirmLabel="Delete task"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(task.id, {
            onSuccess: () => {
              toast.success("Task deleted", { description: task.title });
              onClose();
            },
            onError: (err) => toast.error("Couldn't delete the task", { description: err.message }),
          })
        }
      />
    </>
  );
}

// ── Project settings ─────────────────────────────────────────────────

export function ProjectSettingsDialog({ projectId, onClose }: { projectId: string; onClose: Close }) {
  const { data: project, isPending } = useProject(projectId);
  const { data: teams } = useTeams();
  if (isPending || !teams) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="Project settings" submitLabel="Save" onSubmit={() => {}} pending>
        <Skeleton className="h-72 rounded-lg" />
      </FormDialog>
    );
  }
  if (!project) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="This project isn't available" submitLabel="Close" onSubmit={onClose}>
        <p className="text-[13px] text-ink-muted">It may have been archived or deleted.</p>
      </FormDialog>
    );
  }
  return <ProjectSettingsForm key={projectId} project={project} teamIds={teams.filter((t) => t.projectIds.includes(projectId)).map((t) => t.id)} onClose={onClose} />;
}

type SettingsValues = { name: string; description: string; ownerId: string; memberIds: string[]; teamIds: string[]; status: ProjectStatus; progress: string; startDate: string; endDate: string; budgetTotal: string };

function ProjectSettingsForm({ project, teamIds, onClose }: { project: NonNullable<ReturnType<typeof useProject>["data"]>; teamIds: string[]; onClose: Close }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: people = [] } = usePeople();
  const { data: teams = [] } = useTeams();
  const update = useUpdateProject();
  const archive = useArchiveProject();
  const [values, setValues] = useState<SettingsValues>({
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    memberIds: project.memberIds,
    teamIds,
    status: project.status,
    progress: String(project.progress),
    startDate: project.startDate,
    endDate: project.endDate,
    budgetTotal: String(project.budget.total),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof SettingsValues>(k: K, v: SettingsValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = () => {
    const parsed = projectSettingsSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      return focusFirst("ps", errs);
    }
    const { teamIds: chosenTeams, ...changes } = parsed.data;
    update.mutate(
      { id: project.id, changes, teamIds: chosenTeams },
      {
        onSuccess: () => {
          toast.success("Project settings saved", { description: parsed.data.name });
          onClose();
        },
        onError: (err) => toast.error("Couldn't save the settings", { description: err.message }),
      },
    );
  };
  const memberExtra = project.extraMembers > 0 ? ` (+${project.extraMembers} not shown)` : "";

  return (
    <>
      <FormDialog
        open={!deleting}
        onOpenChange={(o) => !o && onClose()}
        wide
        title="Project settings"
        description="Changes apply to this project only, and show everywhere it appears."
        submitLabel="Save settings"
        onSubmit={submit}
        pending={update.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Project name" htmlFor="ps-name" error={errors.name} className="sm:col-span-2">
            <input id="ps-name" value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} className={fieldClass} />
          </FormField>
          <FormField label="Short description" htmlFor="ps-description" error={errors.description} className="sm:col-span-2">
            <input id="ps-description" value={values.description} onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description} className={fieldClass} />
          </FormField>
          <FormField label="Owner" htmlFor="ps-ownerId" error={errors.ownerId}>
            <SelectField id="ps-ownerId" value={values.ownerId} onChange={(v) => set("ownerId", v)} options={people.map((p) => ({ value: p.id, label: p.name }))} />
          </FormField>
          <FormField label="Status" htmlFor="ps-status">
            <SelectField id="ps-status" value={values.status} onChange={(v) => set("status", v as ProjectStatus)} options={(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))} />
          </FormField>
          <FormField label="Team members" htmlFor="ps-memberIds" hint={`Shown on the project${memberExtra}`} className="sm:col-span-2">
            <MultiPicker id="ps-memberIds" value={values.memberIds} onChange={(v) => set("memberIds", v)} placeholder="Choose people" options={people.filter((p) => p.id !== values.ownerId).map((p) => ({ value: p.id, label: p.name }))} />
          </FormField>
          <FormField label="Teams" htmlFor="ps-teamIds" hint="The project appears on these team pages" className="sm:col-span-2">
            <MultiPicker id="ps-teamIds" value={values.teamIds} onChange={(v) => set("teamIds", v)} placeholder="No team" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          </FormField>
          <FormField label="Start date" htmlFor="ps-startDate" error={errors.startDate}>
            <input id="ps-startDate" type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} aria-invalid={!!errors.startDate} className={fieldClass} />
          </FormField>
          <FormField label="End date" htmlFor="ps-endDate" error={errors.endDate}>
            <input id="ps-endDate" type="date" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} aria-invalid={!!errors.endDate} className={fieldClass} />
          </FormField>
          <FormField label="Progress (%)" htmlFor="ps-progress" error={errors.progress} hint="Milestones update to match">
            <input id="ps-progress" inputMode="numeric" value={values.progress} onChange={(e) => set("progress", e.target.value)} aria-invalid={!!errors.progress} className={fieldClass} />
          </FormField>
          <FormField label="Budget (USD)" htmlFor="ps-budgetTotal" error={errors.budgetTotal} hint={`${formatCurrency(project.budget.spent)} spent so far`}>
            <input id="ps-budgetTotal" inputMode="numeric" value={values.budgetTotal} onChange={(e) => set("budgetTotal", e.target.value)} aria-invalid={!!errors.budgetTotal} className={fieldClass} />
          </FormField>
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2]/60 p-3.5 sm:col-span-2">
            <p className="text-[13px] font-semibold text-[#B91C1C]">Delete project</p>
            <p className="mt-0.5 text-[12.5px] text-ink-body">Removes the project from every list and page. This can&apos;t be undone.</p>
            <OutlineButton icon={TrashIcon} className="mt-2.5 h-8 border-[#FECACA] text-[#B91C1C] hover:border-[#DC2626] hover:bg-white hover:text-[#B91C1C]" onClick={() => setDeleting(true)}>
              Delete project
            </OutlineButton>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={deleting}
        onOpenChange={(o) => !o && setDeleting(false)}
        title={`Delete ${project.name}?`}
        description="The project, its milestones and tasks will be removed for everyone. This can't be undone."
        confirmLabel="Delete project"
        pending={archive.isPending}
        onConfirm={() =>
          archive.mutate(project.id, {
            onSuccess: () => {
              toast.success(`${project.name} deleted`);
              onClose();
              if (pathname.startsWith(projectHref(project.id))) router.push("/projects");
            },
          })
        }
      />
    </>
  );
}

// ── Duplicate ────────────────────────────────────────────────────────

const COPY_OPTIONS: { key: keyof Omit<DuplicateFormValues, "name">; label: string; hint: string }[] = [
  { key: "details", label: "Description, tags, links and budget", hint: "Spend starts at $0" },
  { key: "milestones", label: "Phases and milestones", hint: "All reset to not started" },
  { key: "tasks", label: "Tasks", hint: "Copied as not started" },
  { key: "team", label: "Team members", hint: "Owner is always kept" },
];

export function DuplicateProjectDialog({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: Close }) {
  const router = useRouter();
  const duplicate = useDuplicateProject();
  const [values, setValues] = useState<DuplicateFormValues>({ name: `${projectName} (copy)`, details: true, milestones: true, tasks: true, team: true });
  const [error, setError] = useState("");
  const submit = () => {
    const parsed = duplicateFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(fieldErrors(parsed.error.issues).name ?? "");
      return document.getElementById("dp-name")?.focus();
    }
    duplicate.mutate(
      { sourceId: projectId, opts: parsed.data },
      {
        onSuccess: (copy) => {
          toast.success("Project duplicated", { description: `${copy.name} · approvals, workflow runs, comments and activity were not copied` });
          onClose();
          router.push(projectHref(copy.id));
        },
        onError: (err) => toast.error("Couldn't duplicate the project", { description: err.message }),
      },
    );
  };
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Duplicate project" description={`Creates a new project from ${projectName}. The original isn't changed.`} submitLabel="Duplicate" onSubmit={submit} pending={duplicate.isPending}>
      <div className="grid gap-4">
        <FormField label="New project name" htmlFor="dp-name" error={error}>
          <input
            id="dp-name"
            value={values.name}
            onChange={(e) => {
              setValues((v) => ({ ...v, name: e.target.value }));
              setError("");
            }}
            aria-invalid={!!error}
            className={fieldClass}
            autoFocus
          />
        </FormField>
        <fieldset>
          <legend className="text-field-label text-ink-body">Copy</legend>
          <ul className="mt-2 space-y-2">
            {COPY_OPTIONS.map((o) => (
              <li key={o.key}>
                <label htmlFor={`dp-${o.key}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 hover:border-brand-soft">
                  <Checkbox id={`dp-${o.key}`} checked={values[o.key]} onCheckedChange={(v) => setValues((s) => ({ ...s, [o.key]: v === true }))} className="mt-0.5 data-[state=checked]:border-brand data-[state=checked]:bg-brand" />
                  <span>
                    <span className="block text-[13px] font-medium text-ink">{o.label}</span>
                    <span className="block text-[12px] text-ink-muted">{o.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-4 text-ink-muted">Approvals, workflow runs, comments, files and activity history stay with the original project.</p>
        </fieldset>
      </div>
    </FormDialog>
  );
}

// ── Move to folder ───────────────────────────────────────────────────

export function MoveToFolderDialog({ projectId, projectName, currentFolderId, onClose }: { projectId: string; projectName: string; currentFolderId: string | null; onClose: Close }) {
  const { data: folders } = useFolders();
  const move = useMoveToFolder();
  const create = useCreateFolder();
  const [choice, setChoice] = useState<string>(currentFolderId ?? "none");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const addFolder = () =>
    create.mutate(newName, {
      onSuccess: (f) => {
        setChoice(f.id);
        setNewName("");
        toast.success("Folder created", { description: f.name });
      },
      onError: (err) => setError(err.message),
    });

  const submit = () => {
    const target = choice === "none" ? null : choice;
    if (target === (currentFolderId ?? null)) {
      toast("No change", { description: `${projectName} is already ${target ? "in that folder" : "not in a folder"}.` });
      return onClose();
    }
    move.mutate(
      { projectId, folderId: target },
      {
        onSuccess: () => {
          toast.success(target ? "Project moved" : "Removed from folder", { description: target ? `${projectName} → ${folders?.find((f) => f.id === target)?.name}` : projectName });
          onClose();
        },
        onError: (err) => toast.error("Couldn't move the project", { description: err.message }),
      },
    );
  };

  const options = [{ id: "none", name: "No folder", count: undefined as number | undefined }, ...(folders ?? [])];
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Move to folder" description={projectName} submitLabel="Move" onSubmit={submit} pending={move.isPending}>
      {!folders ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : (
        <div className="grid gap-4">
          <div role="radiogroup" aria-label="Destination folder" className="grid gap-2">
            {options.map((f) => (
              <label key={f.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors", choice === f.id ? "border-brand-soft bg-brand-surface" : "border-line hover:border-brand-soft")}>
                <input type="radio" name="folder" value={f.id} checked={choice === f.id} onChange={() => setChoice(f.id)} className="accent-[#5B3FF3]" />
                <FolderSimpleIcon size={17} aria-hidden className="text-ink-muted" />
                <span className="flex-1 text-[13px] text-ink">{f.name}</span>
                {f.id === (currentFolderId ?? "none") && <span className="text-[11.5px] text-ink-muted">Current</span>}
                {f.count !== undefined && <span className="text-[12px] text-ink-muted tabular-nums">{f.count}</span>}
              </label>
            ))}
          </div>
          <FormField label="New folder" htmlFor="mf-new" error={error}>
            <div className="flex gap-2">
              <input
                id="mf-new"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newName.trim()) addFolder();
                  }
                }}
                placeholder="Folder name"
                aria-invalid={!!error}
                className={fieldClass}
              />
              <OutlineButton icon={FolderSimplePlusIcon} disabled={!newName.trim() || create.isPending} onClick={addFolder}>
                Create
              </OutlineButton>
            </div>
          </FormField>
        </div>
      )}
    </FormDialog>
  );
}

// ── Links ────────────────────────────────────────────────────────────

/** Add or edit a project link (a web address). Seed links without an address can be completed here. */
export function LinkDialog({ projectId, link, onClose }: { projectId: string; link: ProjectLink | null; onClose: Close }) {
  const save = useSaveLink();
  const remove = useRemoveLink();
  const hasAddress = !!link?.href && link.href !== "#";
  const [values, setValues] = useState<LinkFormValues>({ label: link?.label ?? "", href: hasAddress ? link!.href : "https://" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const parsed = linkFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      return focusFirst("lk", errs);
    }
    save.mutate(
      { projectId, link: { id: link?.id, ...parsed.data } },
      {
        onSuccess: () => {
          toast.success(link ? "Link saved" : "Link added", { description: parsed.data.label });
          onClose();
        },
        onError: (err) => toast.error("Couldn't save the link", { description: err.message }),
      },
    );
  };
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={link ? (hasAddress ? "Edit link" : "Add an address to this link") : "Add link"}
      description={link && !hasAddress ? "This link doesn't have an address yet." : "Web addresses open in a new tab; app pages (starting with /) open here."}
      submitLabel={link ? "Save link" : "Add link"}
      onSubmit={submit}
      pending={save.isPending}
      extraAction={
        link && (
          <OutlineButton
            icon={TrashIcon}
            className="h-8 hover:text-[#DC2626]"
            onClick={() =>
              remove.mutate(
                { projectId, linkId: link.id },
                {
                  onSuccess: () => {
                    toast.success("Link removed", { description: link.label });
                    onClose();
                  },
                },
              )
            }
          >
            Remove
          </OutlineButton>
        )
      }
    >
      <div className="grid gap-4">
        <FormField label="Name" htmlFor="lk-label" error={errors.label}>
          <input id="lk-label" value={values.label} onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))} aria-invalid={!!errors.label} className={fieldClass} autoFocus={!link} />
        </FormField>
        <FormField label="Address" htmlFor="lk-href" error={errors.href}>
          <input id="lk-href" type="text" inputMode="url" value={values.href} onChange={(e) => setValues((v) => ({ ...v, href: e.target.value }))} aria-invalid={!!errors.href} className={fieldClass} autoFocus={!!link} />
        </FormField>
      </div>
    </FormDialog>
  );
}
