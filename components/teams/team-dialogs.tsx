"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiPicker } from "@/components/projects/project-dialogs";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Badge } from "@/components/shared/project-ui";
import { FormDialog, FormField, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { usePeople } from "@/hooks/use-projects";
import { useSaveTeam, useSetPersonTeams, useTasks, useTeams } from "@/hooks/use-workspace";
import { formatDate } from "@/lib/format";
import { PRIORITY_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import { fieldErrors, teamFormSchema, type TeamFormValues } from "@/lib/schemas/workspace";
import { cn } from "@/lib/utils";

/** Create a team, or edit one: name, description, lead and members. */
export function TeamDialog({ teamId, onClose }: { teamId?: string; onClose: () => void }) {
  const { data: teams } = useTeams();
  const team = teamId ? teams?.find((t) => t.id === teamId) : undefined;
  if (teamId && !teams) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="Edit team" submitLabel="Save" onSubmit={() => {}} pending>
        <Skeleton className="h-56 rounded-lg" />
      </FormDialog>
    );
  }
  return (
    <TeamForm
      key={teamId ?? "new"}
      teamId={team?.id}
      initial={team ? { name: team.name, description: team.description, leadId: team.leadId, memberIds: team.memberIds } : { name: "", description: "", leadId: "", memberIds: [] }}
      onClose={onClose}
    />
  );
}

function TeamForm({ teamId, initial, onClose }: { teamId?: string; initial: TeamFormValues; onClose: () => void }) {
  const router = useRouter();
  const { data: people = [] } = usePeople();
  const save = useSaveTeam();
  const [values, setValues] = useState<TeamFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof TeamFormValues>(k: K, v: TeamFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = () => {
    const parsed = teamFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      document.getElementById(`tm-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    save.mutate(
      { id: teamId, input: parsed.data },
      {
        onSuccess: (res) => {
          toast.success(teamId ? "Team updated" : "Team created", { description: parsed.data.name });
          onClose();
          if (!teamId) router.push(`/teams/${res.id}`);
        },
        // Duplicate names are caught here, against the live team list.
        onError: (err) => {
          setErrors({ name: err.message });
          document.getElementById("tm-name")?.focus();
        },
      },
    );
  };
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={teamId ? "Edit team" : "Create team"}
      description={teamId ? undefined : "Teams group people and the projects they work on."}
      submitLabel={teamId ? "Save team" : "Create team"}
      onSubmit={submit}
      pending={save.isPending}
    >
      <div className="grid gap-4">
        <FormField label="Team name" htmlFor="tm-name" error={errors.name}>
          <input id="tm-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Data Platform Team" aria-invalid={!!errors.name} className={fieldClass} autoFocus />
        </FormField>
        <FormField label="Description" htmlFor="tm-description" error={errors.description}>
          <textarea id="tm-description" rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description} className={cn(fieldClass, "h-auto resize-y py-2 leading-5")} />
        </FormField>
        <FormField label="Team lead" htmlFor="tm-leadId" error={errors.leadId}>
          <SelectField id="tm-leadId" value={values.leadId} onChange={(v) => set("leadId", v)} placeholder="Choose a lead" invalid={!!errors.leadId} options={people.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` }))} />
        </FormField>
        <FormField label="Members (optional)" htmlFor="tm-memberIds" hint="The lead is always a member">
          <MultiPicker id="tm-memberIds" value={values.memberIds.filter((m) => m !== values.leadId)} onChange={(v) => set("memberIds", v)} placeholder="Choose people" options={people.filter((p) => p.id !== values.leadId).map((p) => ({ value: p.id, label: p.name }))} />
        </FormField>
      </div>
    </FormDialog>
  );
}

/** A person's details, their open tasks, and which teams they belong to. */
export function MemberDialog({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { data: people } = usePeople();
  const { data: teams } = useTeams();
  const { data: tasks } = useTasks();
  const setTeams = useSetPersonTeams();
  const person = people?.find((p) => p.id === personId);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const current = teams?.filter((t) => t.memberIds.includes(personId)).map((t) => t.id) ?? [];
  const selected = chosen ?? current;
  const open = (tasks ?? []).filter((t) => t.task.assigneeId === personId && t.task.status !== "done").sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));

  const submit = () => {
    if (!chosen) return onClose();
    setTeams.mutate(
      { personId, teamIds: chosen },
      {
        onSuccess: () => {
          toast.success("Team membership updated", { description: person?.name });
          onClose();
        },
        onError: (err) => toast.error("Couldn't change teams", { description: err.message }),
      },
    );
  };

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Member details" submitLabel={chosen ? "Save teams" : "Done"} onSubmit={submit} pending={setTeams.isPending}>
      {!person || !teams ? (
        <Skeleton className="h-56 rounded-lg" />
      ) : (
        <div className="grid gap-5">
          <div className="flex items-center gap-3">
            <PersonAvatar name={person.name} src={person.avatar} size="lg" className="size-12" />
            <div>
              <p className="text-[15px] font-semibold text-ink">{person.name}</p>
              <p className="text-[13px] text-ink-muted">{person.role}</p>
            </div>
          </div>
          <fieldset>
            <legend className="text-field-label text-ink-body">Teams</legend>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {teams.map((t) => {
                const lead = t.leadId === personId;
                return (
                  <li key={t.id}>
                    <label htmlFor={`pt-${t.id}`} className={cn("flex items-center gap-2.5 rounded-lg border border-line px-3 py-2", lead ? "opacity-80" : "cursor-pointer hover:border-brand-soft")}>
                      <Checkbox
                        id={`pt-${t.id}`}
                        checked={selected.includes(t.id)}
                        disabled={lead}
                        onCheckedChange={(v) => setChosen(v === true ? [...selected, t.id] : selected.filter((x) => x !== t.id))}
                        className="data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.name}</span>
                      {lead && <Badge fg="#5B3FF3" bg="#F1EEFE">Lead</Badge>}
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[12px] text-ink-muted">A team lead can&apos;t leave their team — choose a new lead from Edit team first.</p>
          </fieldset>
          <div>
            <h3 className="text-field-label text-ink-body">Open tasks ({open.length})</h3>
            {open.length ? (
              <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto scrollbar-thin">
                {open.slice(0, 8).map(({ task, project }) => (
                  <li key={task.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {task.title}{" "}
                      <Link href={projectHref(project.id)} onClick={onClose} className="text-ink-muted hover:text-brand">
                        · {project.name}
                      </Link>
                    </span>
                    <Badge fg={PRIORITY_META[task.priority].fg} bg={PRIORITY_META[task.priority].bg}>
                      {PRIORITY_META[task.priority].label}
                    </Badge>
                    <span className="w-24 shrink-0 text-right text-ink-body tabular-nums">{formatDate(task.dueDate)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12.5px] text-ink-muted">No open tasks.</p>
            )}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
