"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkflowDialog } from "@/components/workflows/workflow-dialog";
import { usePeople, useProjects } from "@/hooks/use-projects";
import { useCreateApproval, useCreateProject, useCreateProjectFromTemplate, useCreateTask, useSettings, useTemplates } from "@/hooks/use-workspace";
import { toIsoDate } from "@/lib/format";
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import { PRIORITY_META, STATUS_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import { approvalFormSchema, fieldErrors, projectFormSchema, taskFormSchema, type ApprovalFormValues, type ProjectFormValues, type TaskFormValues } from "@/lib/schemas/workspace";
import { cn } from "@/lib/utils";
import { FormDialog, FormField, SelectField, fieldClass } from "./workspace-ui";

type Dialog =
  | { kind: "project"; templateId?: string }
  | { kind: "task"; projectId?: string; dueDate?: string }
  | { kind: "approval"; projectId?: string }
  | { kind: "workflow" };

interface CreateActions {
  openCreateProject: (opts?: { templateId?: string }) => void;
  openCreateTask: (opts?: { projectId?: string; dueDate?: string }) => void;
  openRequestApproval: (opts?: { projectId?: string }) => void;
  openCreateWorkflow: () => void;
}

const CreateContext = createContext<CreateActions | null>(null);

export function useCreate() {
  const ctx = useContext(CreateContext);
  if (!ctx) throw new Error("useCreate must be used inside CreateProvider");
  return ctx;
}

/** Hosts the create dialogs (project, task, approval request, workflow) so the header and every page can open them. */
export function CreateProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // Load workspace defaults (task priority, approver) before a form needs them.
  useSettings();
  // A new session per open remounts the form so it always starts clean.
  const [session, setSession] = useState(0);
  const open = useCallback((d: Dialog) => {
    setSession((s) => s + 1);
    setDialog(d);
  }, []);
  const actions = useMemo<CreateActions>(
    () => ({
      openCreateProject: (o) => open({ kind: "project", ...o }),
      openCreateTask: (o) => open({ kind: "task", ...o }),
      openRequestApproval: (o) => open({ kind: "approval", ...o }),
      openCreateWorkflow: () => open({ kind: "workflow" }),
    }),
    [open],
  );
  const onOpenChange = (o: boolean) => !o && setDialog(null);

  return (
    <CreateContext.Provider value={actions}>
      {children}
      {dialog?.kind === "project" && <ProjectDialog key={session} templateId={dialog.templateId} onOpenChange={onOpenChange} />}
      {dialog?.kind === "task" && <TaskDialog key={session} projectId={dialog.projectId} dueDate={dialog.dueDate} onOpenChange={onOpenChange} />}
      {dialog?.kind === "approval" && <ApprovalDialog key={session} projectId={dialog.projectId} onOpenChange={onOpenChange} />}
      {dialog?.kind === "workflow" && <WorkflowDialog key={session} open onOpenChange={onOpenChange} />}
    </CreateContext.Provider>
  );
}

const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** Pulls the error map from a failed parse and focuses the first invalid field. */
function invalid(prefix: string, issues: { path: PropertyKey[]; message: string }[]) {
  const errs = fieldErrors(issues);
  document.getElementById(`${prefix}-${Object.keys(errs)[0]}`)?.focus();
  return errs;
}

// ── New project ──────────────────────────────────────────────────────

function ProjectDialog({ templateId: initialTemplate, onOpenChange }: { templateId?: string; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { data: people = [] } = usePeople();
  const { data: templates = [] } = useTemplates();
  const createBlank = useCreateProject();
  const createFromTemplate = useCreateProjectFromTemplate();
  const [templateId, setTemplateId] = useState(initialTemplate ?? "");
  const [values, setValues] = useState<ProjectFormValues>({
    name: "",
    description: "",
    ownerId: CURRENT_USER_ID,
    memberIds: [],
    status: "planning",
    startDate: plusDays(0),
    endDate: plusDays(90),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const template = templates.find((t) => t.id === templateId);
  const pending = createBlank.isPending || createFromTemplate.isPending;

  const submit = () => {
    const parsed = projectFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(invalid("np", parsed.error.issues));
    const onSuccess = (p: { id: string; name: string }) => {
      toast.success("Project created", { description: template ? `${p.name} · from ${template.name}` : p.name });
      onOpenChange(false);
      router.push(projectHref(p.id));
    };
    const onError = (err: Error) => toast.error("Couldn't create the project", { description: err.message });
    if (templateId) createFromTemplate.mutate({ templateId, input: parsed.data }, { onSuccess, onError });
    else createBlank.mutate(parsed.data, { onSuccess, onError });
  };

  const members = people.filter((p) => values.memberIds.includes(p.id));

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      wide
      title="New project"
      description="Start from a blank project or a template. You can change everything later."
      submitLabel="Create project"
      onSubmit={submit}
      pending={pending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Template" htmlFor="np-template" className="sm:col-span-2" hint={template ? `${template.phases.length} phases become milestones · ${template.tasks.length} starter tasks` : "No milestones or tasks are added"}>
          <SelectField
            id="np-template"
            value={templateId || "blank"}
            onChange={(v) => setTemplateId(v === "blank" ? "" : v)}
            options={[{ value: "blank", label: "Blank project" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
          />
        </FormField>
        <FormField label="Project name" htmlFor="np-name" error={errors.name} className="sm:col-span-2">
          <input id="np-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Regional Data Center" aria-invalid={!!errors.name} className={fieldClass} autoFocus />
        </FormField>
        <FormField label="Short description" htmlFor="np-description" error={errors.description} className="sm:col-span-2">
          <input id="np-description" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="One line shown under the name" aria-invalid={!!errors.description} className={fieldClass} />
        </FormField>
        <FormField label="Owner" htmlFor="np-ownerId" error={errors.ownerId}>
          <SelectField id="np-ownerId" value={values.ownerId} onChange={(v) => set("ownerId", v)} options={people.map((p) => ({ value: p.id, label: p.name }))} invalid={!!errors.ownerId} />
        </FormField>
        <FormField label="Status" htmlFor="np-status">
          <SelectField
            id="np-status"
            value={values.status}
            onChange={(v) => set("status", v as ProjectFormValues["status"])}
            options={(["planning", "on_track", "at_risk", "on_hold"] as const).map((s) => ({ value: s, label: STATUS_META[s].label }))}
          />
        </FormField>
        <FormField label="Start date" htmlFor="np-startDate" error={errors.startDate}>
          <input id="np-startDate" type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} aria-invalid={!!errors.startDate} className={fieldClass} />
        </FormField>
        <FormField label="End date" htmlFor="np-endDate" error={errors.endDate}>
          <input id="np-endDate" type="date" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} aria-invalid={!!errors.endDate} className={fieldClass} />
        </FormField>
        <FormField label="Team members" htmlFor="np-members" className="sm:col-span-2">
          <DropdownMenu>
            <DropdownMenuTrigger id="np-members" className={cn(fieldClass, "flex items-center justify-between text-left")}>
              <span className={cn("truncate", !members.length && "text-ink-muted")}>{members.length ? members.map((m) => m.name).join(", ") : "Choose people"}</span>
              <CaretDownIcon size={14} aria-hidden className="shrink-0 text-ink-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl">
              {people
                .filter((p) => p.id !== values.ownerId)
                .map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p.id}
                    checked={values.memberIds.includes(p.id)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => set("memberIds", on ? [...values.memberIds, p.id] : values.memberIds.filter((x) => x !== p.id))}
                  >
                    {p.name} <span className="text-ink-muted">· {p.role}</span>
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </FormField>
      </div>
    </FormDialog>
  );
}

// ── New task ─────────────────────────────────────────────────────────

function TaskDialog({ projectId, dueDate, onOpenChange }: { projectId?: string; dueDate?: string; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { data: people = [] } = usePeople();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const { data: settings } = useSettings();
  const create = useCreateTask();
  const [values, setValues] = useState<TaskFormValues>({
    projectId: projectId ?? "",
    title: "",
    assigneeId: CURRENT_USER_ID,
    dueDate: dueDate ?? plusDays(7),
    priority: settings?.defaultTaskPriority ?? "medium",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = () => {
    const parsed = taskFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(invalid("nt", parsed.error.issues));
    const project = projectList?.items.find((p) => p.id === parsed.data.projectId);
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Task created", {
          description: `${parsed.data.title} · ${project?.name ?? ""}`,
          action: { label: "Open project", onClick: () => router.push(projectHref(parsed.data.projectId)) },
        });
        onOpenChange(false);
      },
      onError: (err) => toast.error("Couldn't create the task", { description: err.message }),
    });
  };

  return (
    <FormDialog open onOpenChange={onOpenChange} title="New task" description="The task appears on the project's Tasks tab and on the Calendar." submitLabel="Create task" onSubmit={submit} pending={create.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Project" htmlFor="nt-projectId" error={errors.projectId} className="sm:col-span-2">
          <SelectField
            id="nt-projectId"
            value={values.projectId}
            onChange={(v) => set("projectId", v)}
            placeholder="Choose a project"
            options={(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            invalid={!!errors.projectId}
          />
        </FormField>
        <FormField label="Title" htmlFor="nt-title" error={errors.title} className="sm:col-span-2">
          <input id="nt-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" aria-invalid={!!errors.title} className={fieldClass} autoFocus />
        </FormField>
        <FormField label="Assignee" htmlFor="nt-assigneeId" error={errors.assigneeId}>
          <SelectField id="nt-assigneeId" value={values.assigneeId} onChange={(v) => set("assigneeId", v)} options={people.map((p) => ({ value: p.id, label: p.name }))} invalid={!!errors.assigneeId} />
        </FormField>
        <FormField label="Due date" htmlFor="nt-dueDate" error={errors.dueDate}>
          <input id="nt-dueDate" type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} aria-invalid={!!errors.dueDate} className={fieldClass} />
        </FormField>
        <FormField label="Priority" htmlFor="nt-priority">
          <SelectField
            id="nt-priority"
            value={values.priority}
            onChange={(v) => set("priority", v as TaskFormValues["priority"])}
            options={(["high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
          />
        </FormField>
      </div>
    </FormDialog>
  );
}

// ── Request approval ─────────────────────────────────────────────────

function ApprovalDialog({ projectId, onOpenChange }: { projectId?: string; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { data: people = [] } = usePeople();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const { data: settings } = useSettings();
  const create = useCreateApproval();
  const [values, setValues] = useState<ApprovalFormValues>({
    title: "",
    description: "",
    projectId: projectId ?? "",
    approverId: settings?.defaultApproverId ?? "usr-mike",
    dueDate: plusDays(3),
    amount: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ApprovalFormValues>(key: K, value: ApprovalFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = () => {
    const parsed = approvalFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(invalid("na", parsed.error.issues));
    const { amount, ...rest } = parsed.data;
    create.mutate(
      { ...rest, amount: amount ? Number(amount) : null },
      {
        onSuccess: () => {
          const approver = people.find((p) => p.id === parsed.data.approverId);
          toast.success("Approval requested", {
            description: `${parsed.data.title} · sent to ${approver?.name ?? "the approver"}`,
            action: { label: "View", onClick: () => router.push("/workflows?tab=approvals&approvals=all") },
          });
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't send the request", { description: err.message }),
      },
    );
  };

  return (
    <FormDialog open onOpenChange={onOpenChange} title="Request approval" description="Ask someone to review and approve a decision, spend or change." submitLabel="Send request" onSubmit={submit} pending={create.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="What needs approval?" htmlFor="na-title" error={errors.title} className="sm:col-span-2">
          <input id="na-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Extra contractor budget" aria-invalid={!!errors.title} className={fieldClass} autoFocus />
        </FormField>
        <FormField label="Details" htmlFor="na-description" error={errors.description} className="sm:col-span-2">
          <textarea
            id="na-description"
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Context the approver needs"
            aria-invalid={!!errors.description}
            className={cn(fieldClass, "h-auto resize-y py-2 leading-5")}
          />
        </FormField>
        <FormField label="Project" htmlFor="na-projectId" error={errors.projectId}>
          <SelectField id="na-projectId" value={values.projectId} onChange={(v) => set("projectId", v)} placeholder="Choose a project" options={(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))} invalid={!!errors.projectId} />
        </FormField>
        <FormField label="Approver" htmlFor="na-approverId" error={errors.approverId}>
          <SelectField
            id="na-approverId"
            value={values.approverId}
            onChange={(v) => set("approverId", v)}
            options={people.filter((p) => p.id !== CURRENT_USER_ID).map((p) => ({ value: p.id, label: p.name }))}
            invalid={!!errors.approverId}
          />
        </FormField>
        <FormField label="Decision needed by" htmlFor="na-dueDate" error={errors.dueDate}>
          <input id="na-dueDate" type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} aria-invalid={!!errors.dueDate} className={fieldClass} />
        </FormField>
        <FormField label="Amount (USD, optional)" htmlFor="na-amount" error={errors.amount}>
          <input id="na-amount" inputMode="numeric" value={values.amount} onChange={(e) => set("amount", e.target.value.trim())} placeholder="0" aria-invalid={!!errors.amount} className={fieldClass} />
        </FormField>
      </div>
    </FormDialog>
  );
}
