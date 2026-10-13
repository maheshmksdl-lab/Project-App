"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  CompassIcon,
  CopyIcon,
  DotsThreeIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  SealCheckIcon,
  TrashIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, IconButton, OutlineButton, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { BackLink, ConfirmDialog, PersonChip, ToneBadge } from "@/components/shared/workspace-ui";
import { teamHref } from "@/components/layout/nav-config";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { useAdvanceRun, useReportData, useTeams, useWorkflow } from "@/hooks/use-workspace";
import { todayIso } from "@/lib/api/mock";
import { formatDate } from "@/lib/format";

import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import type { Workflow, WorkflowRun } from "@/lib/types/workspace";
import { RECURRENCE_LABEL, RUN_STATE_META, WORKFLOW_KIND_META, WORKFLOW_STATUS_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "./approval-card";
import { WorkflowDialog } from "./workflow-dialog";
import { useWorkflowActions } from "./workflows-view";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[11.5px] leading-4 text-ink-muted">{label}</dt>
      <dd className="mt-1 text-[13px] leading-5 text-ink">{children}</dd>
    </div>
  );
}

/** The ordered stages, each with its owner and whether it's a task or an approval. */
function StagePipeline({ wf }: { wf: Workflow }) {
  return (
    <ol className="px-5 pb-5">
      {wf.stages.map((s, i) => (
        <li key={s.id} className="relative flex gap-3.5 pb-5 last:pb-0">
          {i < wf.stages.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-line" aria-hidden />}
          <span
            className={cn(
              "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
              s.type === "approval" ? "bg-[#FFF4EB] text-[#C2410C]" : "bg-brand-tint text-brand",
            )}
          >
            {s.type === "approval" ? <SealCheckIcon size={15} aria-hidden /> : i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13.5px] leading-5 font-medium text-ink">{s.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <PersonChip personId={s.ownerId} size="xs" />
              <span className="text-[12px] text-ink-muted">{s.type === "approval" ? "Approval — owner decides" : "Task — owner completes"}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One run: where it is in the stages and what it's waiting on. */
function RunRow({ wf, run }: { wf: Workflow; run: WorkflowRun }) {
  const advance = useAdvanceRun();
  const stage = wf.stages[run.stageIndex];
  const done = Math.min(run.stageIndex, wf.stages.length);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft px-5 py-3.5">
      <div className="min-w-[150px] flex-1">
        <p className="text-[13px] leading-5 font-medium text-ink">Run started {formatDate(run.startedOn)}</p>
        <p className="text-[12px] leading-4 text-ink-muted">
          {run.state === "completed" ? "All stages complete" : run.state === "stopped" ? `Stopped at ${stage?.name ?? "the last stage"}` : `Stage ${run.stageIndex + 1} of ${wf.stages.length} · ${stage?.name}`}
        </p>
      </div>
      <span className="flex items-center gap-1" aria-label={`${done} of ${wf.stages.length} stages complete`}>
        {wf.stages.map((s, i) => (
          <span key={s.id} className={cn("h-1.5 w-6 rounded-full", i < done ? "bg-[#16A34A]" : i === run.stageIndex && run.state !== "completed" ? "bg-brand-action" : "bg-[#EEF0F4]")} aria-hidden />
        ))}
      </span>
      <ToneBadge tone={RUN_STATE_META[run.state]} />
      <div className="flex w-full justify-end sm:w-auto">
        {run.state === "running" && (
          <OutlineButton
            icon={CheckIcon}
            className="h-8"
            disabled={advance.isPending || wf.status !== "active"}
            onClick={() =>
              advance.mutate(
                { workflowId: wf.id, runId: run.id },
                {
                  onSuccess: (r) =>
                    toast.success(`${stage?.name} complete`, {
                      description: r.state === "completed" ? "The run is complete." : r.state === "waiting_approval" ? `Waiting for approval: ${wf.stages[r.stageIndex]?.name}` : `Next: ${wf.stages[r.stageIndex]?.name}`,
                    }),
                  onError: (err) => toast.error("Couldn't update the run", { description: err.message }),
                },
              )
            }
          >
            Complete stage
          </OutlineButton>
        )}
        {run.state === "waiting_approval" && (
          <a href="#workflow-approvals" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Review approval
            <ArrowRightIcon size={12} weight="bold" aria-hidden />
          </a>
        )}
      </div>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workflow">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-8 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function WorkflowDetailView({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: wf, isPending, isError, refetch } = useWorkflow(workflowId);
  const { data: report } = useReportData();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const { data: teams } = useTeams();
  const actions = useWorkflowActions();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  let body: ReactNode;
  if (isError) {
    body = <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />;
  } else if (isPending || !hydrated) {
    body = <DetailSkeleton />;
  } else if (!wf) {
    body = (
      <EmptyState
        icon={CompassIcon}
        title="This workflow isn't available"
        hint="It may have been deleted, or the link is wrong."
        action={
          <OutlineButton onClick={() => router.push("/workflows")}>Back to workflows</OutlineButton>
        }
      />
    );
  } else {
    const project = projectList?.items.find((p) => p.id === wf.projectId);
    const team = teams?.find((t) => t.id === wf.teamId);
    const approvals = (report?.approvals ?? []).filter((a) => a.workflowId === wf.id);
    const today = todayIso();
    body = (
      <>
        <BackLink href="/workflows" label="Workflows" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] leading-8 font-bold tracking-[-0.01em] text-ink sm:text-[26px] sm:leading-9">{wf.name}</h1>
              <ToneBadge tone={WORKFLOW_STATUS_META[wf.status]} />
              <ToneBadge tone={WORKFLOW_KIND_META[wf.kind]} />
              <BookmarkButton type="workflow" refId={wf.id} label={wf.name} />
            </div>
            <p className="mt-1 max-w-2xl text-[14px] leading-5 text-ink-muted">{wf.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OutlineButton icon={wf.status === "active" ? PauseIcon : CheckIcon} onClick={() => actions.toggle(wf)}>
              {wf.status === "active" ? "Pause" : "Activate"}
            </OutlineButton>
            <PrimaryButton icon={PlayIcon} disabled={wf.status !== "active"} onClick={() => actions.run(wf)} title={wf.status !== "active" ? "Activate the workflow to run it" : undefined}>
              Run now
            </PrimaryButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton aria-label="Workflow actions" className="size-9 border border-line bg-white">
                  <DotsThreeIcon size={20} weight="bold" aria-hidden />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <PencilSimpleIcon aria-hidden /> Edit workflow
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.duplicate(wf)}>
                  <CopyIcon aria-hidden /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  <TrashIcon aria-hidden /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <Card label="Stages">
              <CardHeader
                title={`Stages (${wf.stages.length})`}
                action={
                  <button type="button" onClick={() => setEditing(true)} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] text-ink-body hover:border-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    <PencilSimpleIcon size={13} aria-hidden />
                    Edit
                  </button>
                }
              />
              <StagePipeline wf={wf} />
            </Card>

            <Card label="Runs">
              <CardHeader title={`Runs (${wf.runs.length})`} />
              {wf.runs.length ? (
                <ul>
                  {wf.runs.map((r) => (
                    <RunRow key={r.id} wf={wf} run={r} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={PlayIcon}
                  title="No runs yet"
                  hint={wf.status === "active" ? "Start the first run with Run now." : "Activate the workflow, then start a run."}
                  className="py-10"
                />
              )}
            </Card>

            <section id="workflow-approvals" aria-label="Approvals" className="scroll-mt-[calc(var(--header-h)+16px)]">
              <h2 className="mb-3 text-[15px] leading-6 font-semibold text-ink">Approvals ({approvals.length})</h2>
              {approvals.length ? (
                <ul className="grid gap-3">
                  {approvals.map((a) => (
                    <ApprovalCard key={a.id} approval={a} today={today} />
                  ))}
                </ul>
              ) : (
                <Card>
                  <EmptyState icon={SealCheckIcon} title="No approval requests" hint="Approval stages raise a request here when a run reaches them." className="py-10" />
                </Card>
              )}
            </section>
          </div>

          <Card label="Workflow details" className="h-fit p-5">
            <dl className="divide-y divide-line-soft">
              <Detail label="Owner">
                <PersonChip personId={wf.ownerId} withRole />
              </Detail>
              <Detail label="Team">
                {team ? (
                  <Link href={teamHref(team.id)} className="inline-flex items-center gap-2 rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    <span className="inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold" style={{ color: team.fg, backgroundColor: team.bg }} aria-hidden>
                      {team.short}
                    </span>
                    {team.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Project">
                {project ? (
                  <Link href={projectHref(project.id)} className="rounded font-medium hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {project.name}
                  </Link>
                ) : (
                  <span className="text-ink-muted">Not linked to a project</span>
                )}
              </Detail>
              <Detail label="Schedule">{RECURRENCE_LABEL[wf.recurrence]}</Detail>
              {wf.nextRun && <Detail label="Next run">{wf.status === "active" ? formatDate(wf.nextRun) : `${formatDate(wf.nextRun)} (paused)`}</Detail>}
              <Detail label="Approval stages">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon size={14} aria-hidden className="text-ink-muted" />
                  {wf.stages.filter((s) => s.type === "approval").length} of {wf.stages.length}
                </span>
              </Detail>
              <Detail label="Last updated">{formatDate(wf.updatedOn)}</Detail>
            </dl>
          </Card>
        </div>

        {editing && <WorkflowDialog open workflow={wf} onOpenChange={setEditing} />}
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`Delete ${wf.name}?`}
          description="Its stages and run history are removed. Approval requests it raised stay on the Approvals tab."
          confirmLabel="Delete workflow"
          pending={actions.removing}
          onConfirm={() => actions.remove(wf, () => router.push("/workflows"))}
        />
      </>
    );
  }

  return <PageShell>{body}</PageShell>;
}
