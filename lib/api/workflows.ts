/**
 * Mock workflows & approvals API. State lives in memory and resets on page reload.
 * Approving a request that a workflow run is waiting on moves that run along.
 */
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import { APPROVALS, WORKFLOWS } from "@/lib/mock-data/workflows";
import { parseDate, toIsoDate } from "@/lib/format";
import { PAGE_SIZE, type ApprovalFilter, type WorkflowFormValues, type WorkflowQuery } from "@/lib/schemas/workspace";
import type { Approval, ApprovalStatus, Workflow, WorkflowRun, WorkflowStatus } from "@/lib/types/workspace";
import { logActivity } from "./activity";
import { delay, newId, todayIso } from "./mock";

let workflows: Workflow[] | null = null;
let approvals: Approval[] | null = null;
const wfDb = () => (workflows ??= structuredClone(WORKFLOWS));
const apDb = () => (approvals ??= structuredClone(APPROVALS));

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

function paginate<T>(rows: T[], page: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const p = Math.min(page, pageCount);
  return { items: rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), total: rows.length, page: p, pageCount };
}

// ── Workflows ────────────────────────────────────────────────────────

export interface WorkflowList extends Page<Workflow> {
  counts: { all: number; active: number; paused: number; draft: number };
}

export async function listWorkflows(query: Pick<WorkflowQuery, "q" | "kind" | "status" | "sort" | "page">): Promise<WorkflowList> {
  await delay();
  const q = query.q.toLowerCase();
  const matches = wfDb().filter((w) => (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)) && (query.kind === "all" || w.kind === query.kind));
  const counts = {
    all: matches.length,
    active: matches.filter((w) => w.status === "active").length,
    paused: matches.filter((w) => w.status === "paused").length,
    draft: matches.filter((w) => w.status === "draft").length,
  };
  const rows = matches.filter((w) => query.status === "all" || w.status === query.status);
  const sorted = [...rows].sort((a, b) => {
    if (query.sort === "name") return a.name.localeCompare(b.name);
    if (query.sort === "next_run") return (a.nextRun ?? "9999").localeCompare(b.nextRun ?? "9999");
    return b.updatedOn.localeCompare(a.updatedOn);
  });
  return { ...paginate(sorted, query.page), counts };
}

/** Every workflow, unpaged — for the calendar, team pages and reports. */
export function workflowsSnapshot(): Workflow[] {
  return wfDb();
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  await delay();
  return wfDb().find((w) => w.id === id) ?? null;
}

function fromForm(values: WorkflowFormValues): Omit<Workflow, "id" | "status" | "runs" | "updatedOn"> {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    kind: values.kind,
    projectId: values.projectId || null,
    teamId: values.teamId,
    ownerId: values.ownerId,
    recurrence: values.recurrence,
    nextRun: values.recurrence === "none" ? null : values.nextRun,
    stages: values.stages.map((s, i) => ({ ...s, id: s.id || `st-${i + 1}`, name: s.name.trim() })),
  };
}

export async function createWorkflow(values: WorkflowFormValues, status: WorkflowStatus): Promise<Workflow> {
  await delay(80);
  const wf: Workflow = { ...fromForm(values), id: newId("wf"), status, runs: [], updatedOn: todayIso() };
  workflows = [wf, ...wfDb()];
  return wf;
}

export async function updateWorkflow(id: string, values: WorkflowFormValues): Promise<void> {
  await delay(80);
  const wf = wfDb().find((w) => w.id === id);
  if (!wf) throw new Error("Workflow not found");
  Object.assign(wf, fromForm(values), { updatedOn: todayIso() });
}

export async function setWorkflowStatus(id: string, status: WorkflowStatus): Promise<void> {
  await delay(50);
  const wf = wfDb().find((w) => w.id === id);
  if (wf) Object.assign(wf, { status, updatedOn: todayIso() });
}

export async function duplicateWorkflow(id: string): Promise<Workflow> {
  await delay(60);
  const src = wfDb().find((w) => w.id === id);
  if (!src) throw new Error("Workflow not found");
  const copy: Workflow = { ...structuredClone(src), id: newId("wf"), name: `${src.name} (copy)`, status: "draft", runs: [], updatedOn: todayIso() };
  workflows = [copy, ...wfDb()];
  return copy;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await delay(60);
  workflows = wfDb().filter((w) => w.id !== id);
  // Requests raised by the workflow stay, unlinked.
  for (const a of apDb()) if (a.workflowId === id) Object.assign(a, { workflowId: null, runId: undefined });
}

const addDays = (iso: string, days: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** Puts a run on its current stage: an approval stage raises a request for the stage owner. */
function enterStage(wf: Workflow, run: WorkflowRun) {
  const stage = wf.stages[run.stageIndex];
  if (!stage) {
    run.state = "completed";
    return;
  }
  if (stage.type === "approval") {
    run.state = "waiting_approval";
    const today = todayIso();
    approvals = [
      {
        id: newId("apr"),
        title: `${wf.name}: ${stage.name}`,
        description: `Raised by the ${wf.name} workflow run started ${run.startedOn}.`,
        projectId: wf.projectId,
        workflowId: wf.id,
        runId: run.id,
        requesterId: wf.ownerId,
        approverId: stage.ownerId,
        requestedOn: today,
        dueDate: addDays(today, 3),
        status: "pending",
        amount: null,
      },
      ...apDb(),
    ];
  } else {
    run.state = "running";
  }
}

export async function runWorkflow(id: string): Promise<WorkflowRun> {
  await delay(80);
  const wf = wfDb().find((w) => w.id === id);
  if (!wf) throw new Error("Workflow not found");
  if (wf.status !== "active") throw new Error("Only active workflows can run");
  const run: WorkflowRun = { id: newId("run"), startedOn: todayIso(), stageIndex: 0, state: "running" };
  enterStage(wf, run);
  wf.runs = [run, ...wf.runs];
  wf.updatedOn = todayIso();
  return run;
}

/** Completes the run's current task stage. Approval stages move on only by decision. */
export async function advanceRun(workflowId: string, runId: string): Promise<WorkflowRun> {
  await delay(60);
  const wf = wfDb().find((w) => w.id === workflowId);
  const run = wf?.runs.find((r) => r.id === runId);
  if (!wf || !run) throw new Error("Run not found");
  if (run.state !== "running") throw new Error("This run is waiting on an approval");
  run.stageIndex += 1;
  enterStage(wf, run);
  wf.updatedOn = todayIso();
  return run;
}

// ── Approvals ────────────────────────────────────────────────────────

export interface ApprovalList extends Page<Approval> {
  counts: Record<ApprovalFilter, number>;
}

export async function listApprovals(query: { filter: ApprovalFilter; q: string; mine: boolean; page: number }): Promise<ApprovalList> {
  await delay();
  const q = query.q.toLowerCase();
  const matches = apDb().filter((a) => (!q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) && (!query.mine || a.approverId === CURRENT_USER_ID));
  const counts = {
    pending: matches.filter((a) => a.status === "pending").length,
    approved: matches.filter((a) => a.status === "approved").length,
    rejected: matches.filter((a) => a.status === "rejected").length,
    all: matches.length,
  };
  const rows = matches
    .filter((a) => query.filter === "all" || a.status === query.filter)
    // Pending: soonest due first. Decided: most recent decision first.
    .sort((a, b) => (a.status === "pending" && b.status === "pending" ? a.dueDate.localeCompare(b.dueDate) : (b.decidedOn ?? b.requestedOn).localeCompare(a.decidedOn ?? a.requestedOn)));
  return { ...paginate(rows, query.page), counts };
}

export function approvalsSnapshot(): Approval[] {
  return apDb();
}

export async function decideApproval(id: string, decision: Exclude<ApprovalStatus, "pending">, note: string): Promise<Approval> {
  await delay(70);
  const a = apDb().find((x) => x.id === id);
  if (!a) throw new Error("Approval not found");
  if (a.status !== "pending") throw new Error("This request has already been decided");
  Object.assign(a, { status: decision, decidedOn: todayIso(), decisionNote: note.trim() || undefined });
  logActivity({ projectId: a.projectId, type: "approval", action: decision, target: a.title, detail: note.trim() || undefined });
  // An approved stage lets the waiting run continue; a rejection stops it where it is.
  const wf = a.workflowId ? wfDb().find((w) => w.id === a.workflowId) : undefined;
  const run = wf?.runs.find((r) => r.id === a.runId);
  if (wf && run && run.state === "waiting_approval") {
    if (decision === "approved") {
      run.stageIndex += 1;
      enterStage(wf, run);
    } else {
      run.state = "stopped";
    }
    wf.updatedOn = todayIso();
  }
  return a;
}

export interface NewApproval {
  title: string;
  description: string;
  projectId: string;
  approverId: string;
  dueDate: string;
  amount: number | null;
}

export async function createApproval(input: NewApproval): Promise<Approval> {
  await delay(70);
  const a: Approval = {
    id: newId("apr"),
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    workflowId: null,
    requesterId: CURRENT_USER_ID,
    requestedOn: todayIso(),
    status: "pending",
  };
  approvals = [a, ...apDb()];
  logActivity({ projectId: a.projectId, type: "approval", action: "requested approval for", target: a.title });
  return a;
}
