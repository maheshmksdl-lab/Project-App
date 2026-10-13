"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  HourglassIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  SealCheckIcon,
  TrashIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreate } from "@/components/shared/create-dialogs";
import { IconButton, OutlineButton, PageShell, PrimaryButton, UnderlineTabs } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { ConfirmDialog, FilterSelect, PageHeader, Pagination, PersonChip, SearchInput, StatTile, ToneBadge } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { useApprovals, useDeleteWorkflow, useDuplicateWorkflow, useReportData, useRunWorkflow, useSetWorkflowStatus, useWorkflows } from "@/hooks/use-workspace";
import { todayIso } from "@/lib/api/mock";
import { formatDate } from "@/lib/format";
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import {
  APPROVAL_FILTERS,
  PAGE_SIZE,
  parseWorkflowQuery,
  workflowQueryString,
  type ApprovalFilter,
  type WorkflowQuery,
  type WorkflowSort,
} from "@/lib/schemas/workspace";
import type { Workflow } from "@/lib/types/workspace";
import { RECURRENCE_LABEL, WORKFLOW_KIND_META, WORKFLOW_STATUS_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "./approval-card";
import { WorkflowDialog } from "./workflow-dialog";

/** Page state lives in the URL (tab, search, filters, sort, page). */
function useWorkflowQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => parseWorkflowQuery(new URLSearchParams(params.toString())), [params]);
  const update = useCallback(
    // Any change other than paging goes back to page 1.
    (patch: Partial<WorkflowQuery>) => router.replace(`${pathname}${workflowQueryString({ ...query, page: 1, ...patch })}`, { scroll: false }),
    [query, router, pathname],
  );
  return [query, update] as const;
}

// ── Row actions ──────────────────────────────────────────────────────

export function useWorkflowActions() {
  const router = useRouter();
  const run = useRunWorkflow();
  const setStatus = useSetWorkflowStatus();
  const duplicate = useDuplicateWorkflow();
  const remove = useDeleteWorkflow();
  const onError = (err: Error) => toast.error("Something went wrong", { description: err.message });
  return {
    run: (wf: Workflow) =>
      run.mutate(wf.id, {
        onSuccess: (r) => toast.success(`${wf.name} started`, { description: r.state === "waiting_approval" ? "The first stage is waiting for an approval." : `Stage 1 · ${wf.stages[0]?.name}` }),
        onError,
      }),
    toggle: (wf: Workflow) => {
      const status = wf.status === "active" ? "paused" : "active";
      setStatus.mutate({ id: wf.id, status }, { onSuccess: () => toast.success(status === "active" ? `${wf.name} is active` : `${wf.name} paused`), onError });
    },
    duplicate: (wf: Workflow) =>
      duplicate.mutate(wf.id, {
        onSuccess: (copy) => toast.success("Workflow duplicated", { description: `${copy.name} · saved as a draft`, action: { label: "Open", onClick: () => router.push(`/workflows/${copy.id}`) } }),
        onError,
      }),
    remove: (wf: Workflow, after?: () => void) =>
      remove.mutate(wf.id, {
        onSuccess: () => {
          toast.success(`${wf.name} deleted`);
          after?.();
        },
        onError,
      }),
    removing: remove.isPending,
  };
}

function WorkflowMenu({ wf, onEdit, onDelete }: { wf: Workflow; onEdit: () => void; onDelete: () => void }) {
  const actions = useWorkflowActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Actions for ${wf.name}`}>
          <DotsThreeVerticalIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem asChild>
          <Link href={`/workflows/${wf.id}`}>
            <ArrowRightIcon aria-hidden /> Open workflow
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={wf.status !== "active"} onSelect={() => actions.run(wf)}>
          <PlayIcon aria-hidden /> Run now
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.toggle(wf)}>
          {wf.status === "active" ? <PauseIcon aria-hidden /> : <CheckIcon aria-hidden />} {wf.status === "active" ? "Pause" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <PencilSimpleIcon aria-hidden /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.duplicate(wf)}>
          <CopyIcon aria-hidden /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <TrashIcon aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Workflows list ───────────────────────────────────────────────────

/** Stage dots: approval stages as squares-with-a-tick colour, task stages as violet dots. */
function StageStrip({ wf }: { wf: Workflow }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${wf.stages.length} stages, ${wf.stages.filter((s) => s.type === "approval").length} approvals`}>
      {wf.stages.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1" aria-hidden>
          {i > 0 && <span className="h-px w-2 bg-line" />}
          <span className={cn("size-2 rounded-full", s.type === "approval" ? "bg-[#F97316]" : "bg-brand-action")} title={`${s.name} (${s.type})`} />
        </span>
      ))}
      <span className="ml-1.5 text-[12px] text-ink-muted tabular-nums">{wf.stages.length}</span>
    </span>
  );
}

const head = "px-3 py-3 text-left text-table-header whitespace-nowrap text-ink-body first:pl-1 last:pr-1";
const cell = "px-3 py-3.5 align-middle first:pl-1 last:pr-1";

function WorkflowTable({ items, projectName, onEdit, onDelete }: { items: Workflow[]; projectName: (id: string | null) => string | null; onEdit: (w: Workflow) => void; onDelete: (w: Workflow) => void }) {
  const router = useRouter();
  return (
    <>
      <div className="relative hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={cn(head, "w-[30%]")}>Name</th>
              <th scope="col" className={head}>Type</th>
              <th scope="col" className={head}>Status</th>
              <th scope="col" className={head}>Stages</th>
              <th scope="col" className={head}>Schedule</th>
              <th scope="col" className={head}>Owner</th>
              <th scope="col" className={cn(head, "w-10")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((wf) => (
              <tr key={wf.id} onClick={() => router.push(`/workflows/${wf.id}`)} className="cursor-pointer border-b border-line-soft transition-colors hover:bg-brand-surface">
                <td className={cn(cell, "max-w-0")}>
                  <Link
                    href={`/workflows/${wf.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate rounded text-[13px] leading-5 font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
                  >
                    {wf.name}
                  </Link>
                  <span className="block truncate text-[12px] leading-4 text-ink-muted">{projectName(wf.projectId) ?? wf.description}</span>
                </td>
                <td className={cell}>
                  <ToneBadge tone={WORKFLOW_KIND_META[wf.kind]} />
                </td>
                <td className={cell}>
                  <ToneBadge tone={WORKFLOW_STATUS_META[wf.status]} />
                </td>
                <td className={cell}>
                  <StageStrip wf={wf} />
                </td>
                <td className={cn(cell, "text-[12.5px] whitespace-nowrap text-ink-body")}>
                  {RECURRENCE_LABEL[wf.recurrence]}
                  {wf.nextRun && wf.status === "active" && <span className="block text-[11.5px] text-ink-muted">Next {formatDate(wf.nextRun)}</span>}
                </td>
                <td className={cell}>
                  <PersonChip personId={wf.ownerId} />
                </td>
                <td className={cn(cell, "text-right")} onClick={(e) => e.stopPropagation()}>
                  <WorkflowMenu wf={wf} onEdit={() => onEdit(wf)} onDelete={() => onDelete(wf)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phones: cards */}
      <ul className="grid grid-cols-1 gap-3 pt-4 md:hidden">
        {items.map((wf) => (
          <li key={wf.id} className="relative min-w-0 rounded-xl border border-line bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <Link href={`/workflows/${wf.id}`} className="block truncate rounded text-[13.5px] leading-5 font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                  {wf.name}
                </Link>
                <span className="block truncate text-[12px] leading-4 text-ink-muted">{projectName(wf.projectId) ?? wf.description}</span>
              </span>
              <WorkflowMenu wf={wf} onEdit={() => onEdit(wf)} onDelete={() => onDelete(wf)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ToneBadge tone={WORKFLOW_STATUS_META[wf.status]} />
              <ToneBadge tone={WORKFLOW_KIND_META[wf.kind]} />
              <span className="ml-auto">
                <StageStrip wf={wf} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
              <span>
                {RECURRENCE_LABEL[wf.recurrence]}
                {wf.nextRun && wf.status === "active" ? ` · next ${formatDate(wf.nextRun)}` : ""}
              </span>
              <PersonChip personId={wf.ownerId} size="xs" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const SORT_OPTIONS: { value: WorkflowSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name" },
  { value: "next_run", label: "Next run" },
];

function WorkflowsTab({ query, update }: { query: WorkflowQuery; update: (p: Partial<WorkflowQuery>) => void }) {
  const hydrated = useHydrated();
  const { data, isError, refetch, isFetching } = useWorkflows(query);
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const actions = useWorkflowActions();
  const { openCreateWorkflow } = useCreate();
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [deleting, setDeleting] = useState<Workflow | null>(null);
  const onSearch = useCallback((q: string) => update({ q }), [update]);
  const projectName = (id: string | null) => (id ? (projectList?.items.find((p) => p.id === id)?.name ?? null) : null);
  const filtered = !!query.q || query.kind !== "all" || query.status !== "all";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query.q} onChange={onSearch} placeholder="Search workflows..." label="Search workflows" />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <FilterSelect
            label="Type"
            value={query.kind}
            onChange={(kind) => update({ kind })}
            options={[{ value: "all", label: "All types" }, ...(["approval", "recurring", "operational"] as const).map((k) => ({ value: k, label: WORKFLOW_KIND_META[k].label }))]}
          />
          <FilterSelect
            label="Status"
            value={query.status}
            onChange={(status) => update({ status })}
            options={[
              { value: "all", label: `Any status${data ? ` (${data.counts.all})` : ""}` },
              ...(["active", "paused", "draft"] as const).map((s) => ({ value: s, label: `${WORKFLOW_STATUS_META[s].label}${data ? ` (${data.counts[s]})` : ""}` })),
            ]}
          />
          <FilterSelect label="Sort by" value={query.sort} onChange={(sort) => update({ sort })} options={SORT_OPTIONS} />
        </div>
      </div>

      <div className={cn("mt-2 transition-opacity", isFetching && data && "opacity-70")}>
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <ListSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={TreeStructureIcon}
            title={filtered ? "No workflows match" : "No workflows yet"}
            hint={filtered ? "Try a different search or clear the filters." : "Build a workflow for any repeatable process or approval chain."}
            action={
              filtered ? (
                <OutlineButton onClick={() => update({ q: "", kind: "all", status: "all" })}>Clear search and filters</OutlineButton>
              ) : (
                <PrimaryButton icon={PlusIcon} onClick={openCreateWorkflow}>
                  New workflow
                </PrimaryButton>
              )
            }
          />
        ) : (
          <>
            <WorkflowTable items={data.items} projectName={projectName} onEdit={setEditing} onDelete={setDeleting} />
            <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={PAGE_SIZE} noun="workflows" onPage={(page) => update({ page })} />
          </>
        )}
      </div>

      {editing && <WorkflowDialog key={editing.id} open workflow={editing} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "workflow"}?`}
        description="Its stages and run history are removed. Approval requests it raised stay on the Approvals tab."
        confirmLabel="Delete workflow"
        pending={actions.removing}
        onConfirm={() => deleting && actions.remove(deleting, () => setDeleting(null))}
      />
    </div>
  );
}

// ── Approvals ────────────────────────────────────────────────────────

const APPROVAL_TAB_LABEL: Record<ApprovalFilter, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", all: "All" };

function ApprovalsTab({ query, update }: { query: WorkflowQuery; update: (p: Partial<WorkflowQuery>) => void }) {
  const hydrated = useHydrated();
  const mine = query.mine === "1";
  const { data, isError, refetch, isFetching } = useApprovals({ filter: query.approvals, q: query.q, mine, page: query.page });
  const { openRequestApproval } = useCreate();
  const onSearch = useCallback((q: string) => update({ q }), [update]);
  const today = hydrated ? todayIso() : "";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Approval status" className="flex flex-wrap gap-1 rounded-lg bg-[#F2F4F7] p-1">
          {APPROVAL_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={query.approvals === f}
              onClick={() => update({ approvals: f })}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                query.approvals === f ? "bg-white text-ink shadow-card" : "text-ink-body hover:text-ink",
              )}
            >
              {APPROVAL_TAB_LABEL[f]}
              {data && <span className="text-[11px] text-ink-muted tabular-nums">{data.counts[f]}</span>}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <SearchInput value={query.q} onChange={onSearch} placeholder="Search approvals..." label="Search approvals" />
          <OutlineButton aria-pressed={mine} onClick={() => update({ mine: mine ? "0" : "1" })}>
            Assigned to me
          </OutlineButton>
        </div>
      </div>

      <div className={cn("mt-4 transition-opacity", isFetching && data && "opacity-70")}>
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <ListSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={SealCheckIcon}
            title={query.approvals === "pending" ? "Nothing waiting for a decision" : `No ${APPROVAL_TAB_LABEL[query.approvals].toLowerCase()} requests`}
            hint={query.q || mine ? "Try a different search or show everyone's requests." : "Requests raised by workflows or by people appear here."}
            action={
              <OutlineButton icon={PlusIcon} onClick={() => openRequestApproval()}>
                Request approval
              </OutlineButton>
            }
          />
        ) : (
          <>
            <ul className="grid gap-3">
              {data.items.map((a) => (
                <ApprovalCard key={a.id} approval={a} today={today} />
              ))}
            </ul>
            <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={PAGE_SIZE} noun="requests" onPage={(page) => update({ page })} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-1 pt-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-52" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
          <Skeleton className="hidden h-3 w-56 md:block" />
        </div>
      ))}
    </div>
  );
}

/** Headline numbers for the page — they read the same data as the lists. */
function WorkflowStats({ onPending }: { onPending: () => void }) {
  const hydrated = useHydrated();
  const { data } = useReportData();
  if (!hydrated || !data) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[78px] rounded-xl" />
        ))}
      </div>
    );
  }
  const active = data.workflows.filter((w) => w.status === "active");
  const runs = data.workflows.flatMap((w) => w.runs);
  const pendingMine = data.approvals.filter((a) => a.status === "pending" && a.approverId === CURRENT_USER_ID).length;
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile icon={TreeStructureIcon} fg="#5B3FF3" bg="#F1EEFE" value={active.length} label="Active workflows" note={`${data.workflows.length} in total`} />
      <StatTile icon={ArrowsClockwiseIcon} fg="#2563EB" bg="#EFF6FF" value={active.filter((w) => w.recurrence !== "none").length} label="Recurring" note="Run on a schedule" />
      <StatTile icon={HourglassIcon} fg="#EA580C" bg="#FFF4EB" value={runs.filter((r) => r.state === "running" || r.state === "waiting_approval").length} label="Runs in progress" note={`${runs.filter((r) => r.state === "waiting_approval").length} waiting for approval`} />
      <StatTile icon={SealCheckIcon} fg="#15803D" bg="#ECFDF3" value={pendingMine} label="Approvals for you" note="Open the Approvals tab" onClick={onPending} />
    </div>
  );
}

export function WorkflowsView() {
  const [query, update] = useWorkflowQuery();
  const hydrated = useHydrated();
  const { openCreateWorkflow, openRequestApproval } = useCreate();
  const { data: pending } = useApprovals({ filter: "pending", q: "", mine: false, page: 1 });

  return (
    <PageShell>
      <PageHeader
        title="Workflows"
        subtitle="Coordinate recurring work, operational processes and approvals across teams."
        actions={
          <>
            <OutlineButton icon={SealCheckIcon} onClick={() => openRequestApproval()}>
              Request approval
            </OutlineButton>
            <PrimaryButton icon={PlusIcon} onClick={openCreateWorkflow}>
              New workflow
            </PrimaryButton>
          </>
        }
      />
      <WorkflowStats onPending={() => update({ tab: "approvals", approvals: "pending", mine: "1", q: "" })} />
      <UnderlineTabs
        label="Workflows sections"
        className="mt-6"
        value={query.tab}
        onChange={(tab) => update({ tab, q: "" })}
        tabs={[
          { value: "workflows", label: "All workflows" },
          { value: "approvals", label: "Approvals", count: hydrated ? pending?.counts.pending : undefined },
        ]}
      />
      {query.tab === "workflows" ? <WorkflowsTab query={query} update={update} /> : <ApprovalsTab query={query} update={update} />}
    </PageShell>
  );
}

export function WorkflowsFallback() {
  return (
    <PageShell>
      <PageHeader title="Workflows" subtitle="Coordinate recurring work, operational processes and approvals across teams." />
      <ListSkeleton />
    </PageShell>
  );
}

