"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CalendarBlankIcon, CheckIcon, TreeStructureIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { FormDialog, FormField, PersonChip, ToneBadge, fieldClass } from "@/components/shared/workspace-ui";
import { OutlineButton, PrimaryButton } from "@/components/shared/project-ui";
import { useProjects } from "@/hooks/use-projects";
import { useDecideApproval } from "@/hooks/use-workspace";
import { formatCurrency, formatDate } from "@/lib/format";
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import type { Approval } from "@/lib/types/workspace";
import { APPROVAL_STATUS_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";

/** Approve / reject with an optional note (required when rejecting). */
function DecisionDialog({ approval, decision, onOpenChange }: { approval: Approval; decision: "approved" | "rejected"; onOpenChange: (o: boolean) => void }) {
  const decide = useDecideApproval();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const approving = decision === "approved";

  const submit = () => {
    if (!approving && note.trim().length < 5) {
      setError("Tell the requester why (at least 5 characters)");
      document.getElementById("decision-note")?.focus();
      return;
    }
    decide.mutate(
      { id: approval.id, decision, note },
      {
        onSuccess: () => {
          toast.success(approving ? "Request approved" : "Request rejected", {
            description: approval.workflowId ? `${approval.title} · the workflow run has been updated` : approval.title,
          });
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't record the decision", { description: err.message }),
      },
    );
  };

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={approving ? "Approve request" : "Reject request"}
      description={approval.title}
      submitLabel={approving ? "Approve" : "Reject"}
      onSubmit={submit}
      pending={decide.isPending}
    >
      <FormField label={approving ? "Note (optional)" : "Reason"} htmlFor="decision-note" error={error}>
        <textarea
          id="decision-note"
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError("");
          }}
          placeholder={approving ? "Anything the requester should know" : "Why this can't go ahead"}
          aria-invalid={!!error}
          autoFocus
          className={cn(fieldClass, "h-auto resize-y py-2 leading-5")}
        />
      </FormField>
    </FormDialog>
  );
}

/** One approval request: what, which project / workflow, who asked whom, when it's due, and the decision buttons. */
export function ApprovalCard({ approval, today }: { approval: Approval; today: string }) {
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const project = projectList?.items.find((p) => p.id === approval.projectId);
  const pending = approval.status === "pending";
  const overdue = pending && approval.dueDate < today;
  const mine = approval.approverId === CURRENT_USER_ID;

  return (
    <li className="min-w-0 rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] leading-5 font-semibold text-ink">{approval.title}</h3>
            <ToneBadge tone={APPROVAL_STATUS_META[approval.status]} />
            {mine && pending && <span className="rounded-md bg-brand-tint px-2 py-0.5 text-[11px] leading-4 font-medium text-brand">Assigned to you</span>}
          </div>
          {approval.description && <p className="mt-1 text-[13px] leading-5 text-ink-muted">{approval.description}</p>}
        </div>
        {approval.amount !== null && <span className="text-[15px] leading-5 font-semibold text-ink tabular-nums">{formatCurrency(approval.amount)}</span>}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-[12.5px] sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-[11.5px] text-ink-muted">Project</dt>
          <dd className="truncate">
            {project ? (
              <Link href={projectHref(project.id)} className="rounded font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                {project.name}
              </Link>
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-ink-muted">Requested by</dt>
          <dd>
            <PersonChip personId={approval.requesterId} size="xs" />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-ink-muted">Approver</dt>
          <dd>
            <PersonChip personId={approval.approverId} size="xs" />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-ink-muted">{pending ? "Due" : "Decided"}</dt>
          <dd className={cn("inline-flex items-center gap-1.5", overdue ? "font-medium text-[#DC2626]" : "text-ink-body")}>
            <CalendarBlankIcon size={13} aria-hidden />
            {pending ? formatDate(approval.dueDate) : formatDate(approval.decidedOn ?? approval.requestedOn)}
            {overdue && " · overdue"}
          </dd>
        </div>
      </dl>

      {approval.decisionNote && <p className="mt-3 rounded-lg bg-[#F7F7FA] px-3 py-2 text-[12.5px] leading-5 text-ink-body">“{approval.decisionNote}”</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
        {approval.workflowId ? (
          <Link
            href={`/workflows/${approval.workflowId}`}
            className="inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action"
          >
            <TreeStructureIcon size={14} aria-hidden />
            Open workflow
            <ArrowRightIcon size={12} weight="bold" aria-hidden />
          </Link>
        ) : (
          <span className="text-[12px] text-ink-muted">Requested {formatDate(approval.requestedOn)}</span>
        )}
        {pending && (
          <div className="ml-auto flex gap-2">
            <OutlineButton icon={XIcon} className="h-8" onClick={() => setDecision("rejected")}>
              Reject
            </OutlineButton>
            <PrimaryButton icon={CheckIcon} className="h-8 px-3.5" onClick={() => setDecision("approved")}>
              Approve
            </PrimaryButton>
          </div>
        )}
      </div>
      {decision && <DecisionDialog approval={approval} decision={decision} onOpenChange={(o) => !o && setDecision(null)} />}
    </li>
  );
}
