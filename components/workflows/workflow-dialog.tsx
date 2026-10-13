"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { FormDialog, FormField, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { IconButton } from "@/components/shared/project-ui";
import { usePeople, useProjects } from "@/hooks/use-projects";
import { useSaveWorkflow } from "@/hooks/use-workspace";
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import { TEAMS } from "@/lib/mock-data/teams";
import { useTeams } from "@/hooks/use-workspace";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import { fieldErrors, workflowFormSchema, type WorkflowFormValues } from "@/lib/schemas/workspace";
import type { Workflow } from "@/lib/types/workspace";
import { RECURRENCE_LABEL, WORKFLOW_KIND_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";

let stageSeq = 0;
const blankStage = (ownerId: string): WorkflowFormValues["stages"][number] => ({ id: `st-new-${++stageSeq}`, name: "", ownerId, type: "task" });

function initialValues(workflow?: Workflow | null): WorkflowFormValues {
  if (workflow) {
    return {
      name: workflow.name,
      description: workflow.description,
      kind: workflow.kind,
      projectId: workflow.projectId ?? "",
      teamId: workflow.teamId,
      ownerId: workflow.ownerId,
      recurrence: workflow.recurrence,
      nextRun: workflow.nextRun ?? "",
      stages: workflow.stages.map((s) => ({ ...s })),
    };
  }
  return {
    name: "",
    description: "",
    kind: "operational",
    projectId: "",
    teamId: TEAMS[0].id,
    ownerId: CURRENT_USER_ID,
    recurrence: "none",
    nextRun: "",
    stages: [blankStage(CURRENT_USER_ID)],
  };
}

/**
 * Create or edit a workflow: details, schedule and an ordered list of stages
 * (task or approval, each with an owner). New workflows can be saved as a draft
 * or published as active. Remount per open (key) so the form starts clean.
 */
export function WorkflowDialog({ open, onOpenChange, workflow }: { open: boolean; onOpenChange: (o: boolean) => void; workflow?: Workflow | null }) {
  const router = useRouter();
  const save = useSaveWorkflow();
  const { data: people = [] } = usePeople();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const { data: teams } = useTeams();
  const [values, setValues] = useState<WorkflowFormValues>(() => initialValues(workflow));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const editing = !!workflow;

  const set = <K extends keyof WorkflowFormValues>(key: K, value: WorkflowFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const setStage = (i: number, patch: Partial<WorkflowFormValues["stages"][number]>) => {
    setValues((v) => ({ ...v, stages: v.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
    setErrors((e) => ({ ...e, [`stages.${i}.name`]: "", [`stages.${i}.ownerId`]: "", stages: "" }));
  };
  const moveStage = (i: number, dir: -1 | 1) =>
    setValues((v) => {
      const stages = [...v.stages];
      [stages[i], stages[i + dir]] = [stages[i + dir], stages[i]];
      return { ...v, stages };
    });

  const personOptions = people.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` }));

  const submit = (status: Workflow["status"]) => {
    const parsed = workflowFormSchema.safeParse(values);
    if (!parsed.success) {
      const next = fieldErrors(parsed.error.issues);
      setErrors(next);
      document.getElementById(`wf-${Object.keys(next)[0]?.replaceAll(".", "-")}`)?.focus();
      return;
    }
    save.mutate(
      { id: workflow?.id, values: parsed.data, status },
      {
        onSuccess: (res) => {
          toast.success(editing ? "Workflow updated" : status === "draft" ? "Workflow saved as draft" : "Workflow created", { description: parsed.data.name });
          onOpenChange(false);
          if (!editing) router.push(`/workflows/${res.id}`);
        },
        onError: (err) => toast.error("Couldn't save the workflow", { description: err.message }),
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={editing ? "Edit workflow" : "New workflow"}
      description="Define the stages work moves through, who owns each one, and where an approval is needed."
      submitLabel={editing ? "Save changes" : "Create workflow"}
      onSubmit={() => submit(workflow?.status ?? "active")}
      pending={save.isPending}
      extraAction={
        !editing && (
          <button type="button" onClick={() => submit("draft")} className="rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Save as draft
          </button>
        )
      }
    >
      <div className="grid gap-4">
        <FormField label="Name" htmlFor="wf-name" error={errors.name}>
          <input id="wf-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Vendor onboarding" aria-invalid={!!errors.name} className={fieldClass} />
        </FormField>
        <FormField label="Description" htmlFor="wf-description" error={errors.description}>
          <textarea
            id="wf-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="What this workflow is for"
            aria-invalid={!!errors.description}
            className={cn(fieldClass, "h-auto resize-y py-2 leading-5")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="wf-kind">
            <SelectField id="wf-kind" value={values.kind} onChange={(v) => set("kind", v as WorkflowFormValues["kind"])} options={Object.entries(WORKFLOW_KIND_META).map(([value, m]) => ({ value, label: m.label }))} />
          </FormField>
          <FormField label="Project" htmlFor="wf-projectId" hint="Optional — link runs to a project">
            <SelectField
              id="wf-projectId"
              value={values.projectId || "none"}
              onChange={(v) => set("projectId", v === "none" ? "" : v)}
              options={[{ value: "none", label: "No project" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
            />
          </FormField>
          <FormField label="Team" htmlFor="wf-teamId" error={errors.teamId}>
            <SelectField id="wf-teamId" value={values.teamId} onChange={(v) => set("teamId", v)} options={(teams ?? TEAMS).map((t) => ({ value: t.id, label: t.name }))} invalid={!!errors.teamId} />
          </FormField>
          <FormField label="Owner" htmlFor="wf-ownerId" error={errors.ownerId}>
            <SelectField id="wf-ownerId" value={values.ownerId} onChange={(v) => set("ownerId", v)} options={personOptions} invalid={!!errors.ownerId} />
          </FormField>
          <FormField label="Schedule" htmlFor="wf-recurrence">
            <SelectField
              id="wf-recurrence"
              value={values.recurrence}
              onChange={(v) => set("recurrence", v as WorkflowFormValues["recurrence"])}
              options={Object.entries(RECURRENCE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </FormField>
          {values.recurrence !== "none" && (
            <FormField label="First run" htmlFor="wf-nextRun" error={errors.nextRun}>
              <input id="wf-nextRun" type="date" value={values.nextRun} onChange={(e) => set("nextRun", e.target.value)} aria-invalid={!!errors.nextRun} className={fieldClass} />
            </FormField>
          )}
        </div>

        <fieldset className="min-w-0">
          <legend className="text-field-label text-ink-body">Stages</legend>
          <p className="mt-0.5 text-[12px] leading-4 text-ink-muted">Runs move through the stages in this order. Approval stages wait for their owner&apos;s decision.</p>
          {errors.stages && (
            <p role="alert" className="mt-1 text-[12px] font-medium text-[#DC2626]">
              {errors.stages}
            </p>
          )}
          <ol className="mt-3 space-y-2.5">
            {values.stages.map((s, i) => (
              <li key={s.id} className="rounded-xl border border-line bg-[#FBFBFD] p-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-brand">{i + 1}</span>
                  <label htmlFor={`wf-stages-${i}-name`} className="sr-only">
                    Stage {i + 1} name
                  </label>
                  <input
                    id={`wf-stages-${i}-name`}
                    value={s.name}
                    onChange={(e) => setStage(i, { name: e.target.value })}
                    placeholder="Stage name"
                    aria-invalid={!!errors[`stages.${i}.name`]}
                    className={fieldClass}
                  />
                  <IconButton aria-label={`Move stage ${i + 1} up`} disabled={i === 0} onClick={() => moveStage(i, -1)} className="disabled:opacity-30">
                    <ArrowUpIcon size={15} aria-hidden />
                  </IconButton>
                  <IconButton aria-label={`Move stage ${i + 1} down`} disabled={i === values.stages.length - 1} onClick={() => moveStage(i, 1)} className="disabled:opacity-30">
                    <ArrowDownIcon size={15} aria-hidden />
                  </IconButton>
                  <IconButton
                    aria-label={`Remove stage ${i + 1}`}
                    disabled={values.stages.length === 1}
                    onClick={() => setValues((v) => ({ ...v, stages: v.stages.filter((_, j) => j !== i) }))}
                    className="hover:text-[#DC2626] disabled:opacity-30"
                  >
                    <TrashIcon size={15} aria-hidden />
                  </IconButton>
                </div>
                {errors[`stages.${i}.name`] && <p className="mt-1 ml-8 text-[12px] font-medium text-[#DC2626]">{errors[`stages.${i}.name`]}</p>}
                <div className="mt-2 grid gap-2 pl-8 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`wf-stages-${i}-ownerId`} className="sr-only">
                      Stage {i + 1} owner
                    </label>
                    <SelectField id={`wf-stages-${i}-ownerId`} value={s.ownerId} onChange={(v) => setStage(i, { ownerId: v })} options={personOptions} placeholder="Owner" />
                  </div>
                  <div>
                    <label htmlFor={`wf-stages-${i}-type`} className="sr-only">
                      Stage {i + 1} type
                    </label>
                    <SelectField
                      id={`wf-stages-${i}-type`}
                      value={s.type}
                      onChange={(v) => setStage(i, { type: v as "task" | "approval" })}
                      options={[
                        { value: "task", label: "Task — owner completes it" },
                        { value: "approval", label: "Approval — owner decides" },
                      ]}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setValues((v) => ({ ...v, stages: [...v.stages, blankStage(v.ownerId)] }))}
            className="mt-3 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action"
          >
            <PlusIcon size={14} weight="bold" aria-hidden />
            Add stage
          </button>
        </fieldset>
      </div>
    </FormDialog>
  );
}
