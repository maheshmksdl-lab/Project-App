/**
 * Mock projects API — the only file to replace when a backend exists.
 * State lives in memory and resets on page reload.
 *
 * Each project's detail (milestones, tasks, links, budget …) is built once —
 * from its seed, its template, or derived from the summary — and then edited
 * in place, so every view reads the same record.
 */
import { BRIEF, CONTINUE_WORKING, FOCUS, WORKSPACE } from "@/lib/mock-data/home";
import { PEOPLE } from "@/lib/mock-data/people";
import { PROJECT_DETAILS, PROJECTS } from "@/lib/mock-data/projects";
import { STATUS_META, TAB_STATUSES } from "@/lib/project-meta";
import { PROJECT_TABS, type ProjectQuery, type ProjectTab } from "@/lib/schemas/project";
import { parseDate, toIsoDate } from "@/lib/format";
import type {
  Accent,
  ActivityKind,
  HomeData,
  Milestone,
  Person,
  ProjectDetail,
  ProjectIconKey,
  ProjectLink,
  ProjectStatus,
  ProjectSummary,
  ProjectTask,
  TaskPriority,
  TaskStatus,
  TimelineRow,
} from "@/lib/types/project";
import type { ActivityType, Folder } from "@/lib/types/workspace";
import { activitySnapshot, logActivity } from "./activity";
import { delay, newId, todayIso } from "./mock";

type DetailPart = Omit<ProjectDetail, keyof ProjectSummary>;

let store: ProjectSummary[] | null = null;
const db = () => (store ??= PROJECTS.map((p) => ({ ...p, memberIds: [...p.memberIds], folderId: SEED_FOLDERS[p.id] ?? null })));

/** Built detail per project id. */
const details = new Map<string, DetailPart>();
/** Status a task had before it was ticked done, so unticking restores it. */
const prevStatus = new Map<string, TaskStatus>();

const findProject = (id: string) => db().find((p) => p.id === id);
const requireProject = (id: string) => {
  const p = findProject(id);
  if (!p) throw new Error("Project not found");
  return p;
};

// ── Folders ──────────────────────────────────────────────────────────

let folders: Folder[] = [
  { id: "fld-enterprise", name: "Enterprise systems" },
  { id: "fld-operations", name: "Operations" },
  { id: "fld-growth", name: "Growth & marketing" },
];

const SEED_FOLDERS: Record<string, string> = {
  "erp-implementation": "fld-enterprise",
  "finance-system-migration": "fld-enterprise",
  "hrms-rollout": "fld-enterprise",
  "it-infrastructure-upgrade": "fld-enterprise",
  "warehouse-expansion": "fld-operations",
  "office-relocation": "fld-operations",
  "marketing-campaign-q3": "fld-growth",
  "customer-feedback-program": "fld-growth",
};

export interface FolderWithCount extends Folder {
  count: number;
}

export async function listFolders(): Promise<FolderWithCount[]> {
  await delay(40);
  return folders.map((f) => ({ ...f, count: db().filter((p) => p.folderId === f.id).length }));
}

export const foldersSnapshot = () => folders;

export async function createFolder(name: string): Promise<Folder> {
  await delay(50);
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Folder names need at least 2 characters");
  if (folders.some((f) => f.name.toLowerCase() === clean.toLowerCase())) throw new Error("A folder with that name already exists");
  const folder = { id: newId("fld"), name: clean };
  folders = [...folders, folder];
  return folder;
}

export async function moveProjectToFolder(projectId: string, folderId: string | null): Promise<void> {
  await delay(50);
  const p = requireProject(projectId);
  if (folderId && !folders.some((f) => f.id === folderId)) throw new Error("That folder no longer exists");
  if ((p.folderId ?? null) === folderId) return;
  p.folderId = folderId;
  const name = folders.find((f) => f.id === folderId)?.name;
  logActivity({ projectId, type: "project", action: folderId ? "moved to a folder" : "removed from its folder", target: p.name, detail: name });
}

// ── Lists ────────────────────────────────────────────────────────────

export interface ProjectList {
  items: ProjectSummary[];
  counts: Record<ProjectTab, number>;
}

const inTab = (p: ProjectSummary, tab: ProjectTab) => {
  const statuses = TAB_STATUSES[tab];
  return !statuses || statuses.includes(p.status);
};

const inFolder = (p: ProjectSummary, folder: string) => !folder || (folder === "none" ? !p.folderId : p.folderId === folder);

export async function listProjects(query: ProjectQuery): Promise<ProjectList> {
  await delay();
  const q = query.q.toLowerCase();
  const matches = db().filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) &&
      (!query.owner || p.ownerId === query.owner) &&
      inFolder(p, query.folder ?? ""),
  );
  const counts = Object.fromEntries(PROJECT_TABS.map((t) => [t, matches.filter((p) => inTab(p, t)).length])) as Record<ProjectTab, number>;
  const items = matches.filter((p) => inTab(p, query.tab));
  const by: Record<ProjectQuery["sort"], ((a: ProjectSummary, b: ProjectSummary) => number) | null> = {
    default: null,
    name: (a, b) => a.name.localeCompare(b.name),
    progress: (a, b) => b.progress - a.progress,
    start: (a, b) => a.startDate.localeCompare(b.startDate),
    end: (a, b) => a.endDate.localeCompare(b.endDate),
  };
  const sorter = by[query.sort];
  return { items: sorter ? [...items].sort(sorter) : items, counts };
}

export async function listFavorites(): Promise<ProjectSummary[]> {
  await delay(40);
  return db().filter((p) => p.favorite);
}

export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  await delay(40);
  const p = findProject(id);
  if (p) p.favorite = favorite;
}

export async function archiveProject(id: string): Promise<void> {
  await delay(60);
  const p = findProject(id);
  store = db().filter((x) => x.id !== id);
  if (p) logActivity({ projectId: id, type: "project", action: "archived", target: p.name });
}

// ── Detail ───────────────────────────────────────────────────────────

const addDays = (iso: string, days: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** Milestone states follow overall progress: each phase completes as progress passes its share. */
function restate(milestones: Milestone[], progress: number): Milestone[] {
  const n = milestones.length;
  return milestones.map((m, i) => {
    const from = (i / n) * 100;
    const to = ((i + 1) / n) * 100;
    const base = { id: m.id, name: m.name, startDate: m.startDate, endDate: m.endDate };
    if (progress >= to) return { ...base, state: "completed", completedOn: m.endDate };
    if (progress > from) return { ...base, state: "in_progress", progress: Math.round(((progress - from) / (to - from)) * 100) };
    return { ...base, state: "not_started" };
  });
}

/** Five even phases across the project's dates, their state following overall progress. */
function derivedPlan(p: ProjectSummary): { milestones: Milestone[]; timeline: TimelineRow[] } {
  const names = ["Discovery", "Design", "Build", "Rollout", "Launch"];
  const span = (parseDate(p.endDate).getTime() - parseDate(p.startDate).getTime()) / 86_400_000;
  const step = Math.max(1, Math.floor(span / names.length));
  const colors: TimelineRow["color"][] = ["green", "green", "purple", "orange", "red"];
  const ranges: Milestone[] = names.map((name, i) => ({
    id: `ms-${i}`,
    name,
    state: "not_started",
    startDate: addDays(p.startDate, i * step),
    endDate: i === names.length - 1 ? p.endDate : addDays(p.startDate, (i + 1) * step - 1),
  }));
  const milestones = restate(ranges, p.progress);
  // The last phase is drawn as a go-live diamond on the end date.
  const timeline = milestones.map((m, i): TimelineRow => {
    const last = i === names.length - 1;
    return { id: `tl-${i}`, label: m.name, startDate: last ? p.endDate : m.startDate, endDate: m.endDate, color: colors[i], milestone: last || undefined };
  });
  return { milestones, timeline };
}

/** Starter tasks for projects without hand-written detail, due around today. */
function derivedTasks(p: ProjectSummary): ProjectTask[] {
  const titles = ["Confirm scope with stakeholders", "Review delivery plan", "Prepare status report", "Update risk register"];
  const priorities: ProjectTask["priority"][] = ["high", "medium", "low", "medium"];
  const statuses: ProjectTask["status"][] = ["in_progress", "in_review", "not_started", "not_started"];
  const today = todayIso();
  return titles.map((title, i) => ({
    id: `${p.id}-tsk-${i}`,
    title,
    assigneeId: p.ownerId,
    dueDate: addDays(today, [-1, 2, 7, 12][i]),
    priority: priorities[i],
    status: statuses[i],
  }));
}

function initialDetail(p: ProjectSummary): DetailPart {
  const seeded = PROJECT_DETAILS[p.id];
  if (seeded) return structuredClone(seeded);
  return {
    ...derivedPlan(p),
    summary: `${p.description} — ${p.phase.toLowerCase()}`,
    about: `${p.description}. This project covers planning, delivery and handover, with progress tracked against its milestones and budget.`,
    tags: [{ label: p.phase.replace(/ Phase$/, ""), tone: "gray" }],
    heroImage: null,
    tasks: derivedTasks(p),
    budget: { spent: Math.round(p.progress * 2_500), total: 250_000 },
    links: [{ id: "lnk-1", label: "Project brief", href: "" }],
  };
}

/** The project's detail record, built on first use and edited in place afterwards. */
function detailOf(p: ProjectSummary): DetailPart {
  let d = details.get(p.id);
  if (!d) {
    d = initialDetail(p);
    details.set(p.id, d);
  }
  return d;
}

const buildDetail = (p: ProjectSummary): ProjectDetail => structuredClone({ ...p, ...detailOf(p) });

export async function getProject(id: string): Promise<ProjectDetail | null> {
  await delay();
  const p = findProject(id);
  return p ? buildDetail(p) : null;
}

/** Every project with its detail, for the modules that work across projects (calendar, reports …). */
export function projectDetailsSnapshot(): ProjectDetail[] {
  return db().map(buildDetail);
}

export function projectsSnapshot(): ProjectSummary[] {
  return db();
}

// ── Create & duplicate ───────────────────────────────────────────────

export interface NewProject {
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  status: ProjectStatus;
  startDate: string;
  endDate: string;
}

/** A starting plan (a template's phases and tasks), spread across the project's dates. */
export interface ProjectPlan {
  phases: { name: string; weeks: number }[];
  tasks: { title: string; priority: TaskPriority; phase: number }[];
  icon: ProjectIconKey;
  tone: "purple" | "blue" | "green" | "gray";
  tag: string;
}

const ACCENTS: Accent[] = ["purple", "blue", "green", "orange", "pink"];
const PLAN_COLORS: TimelineRow["color"][] = ["green", "purple", "lavender", "orange", "red"];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "project";

function uniqueId(name: string) {
  const taken = new Set(db().map((p) => p.id));
  let id = slug(name);
  for (let n = 2; taken.has(id); n++) id = `${slug(name)}-${n}`;
  return id;
}

function plannedDetail(p: ProjectSummary, plan: ProjectPlan | null): DetailPart {
  const base = derivedPlan(p);
  const span = Math.max(1, (parseDate(p.endDate).getTime() - parseDate(p.startDate).getTime()) / 86_400_000);
  let milestones = base.milestones;
  let timeline = base.timeline;
  let tasks: ProjectTask[] = [];
  if (plan && plan.phases.length) {
    // Each phase gets a share of the project's dates in proportion to its length in weeks.
    const total = plan.phases.reduce((n, ph) => n + ph.weeks, 0);
    let cursor = 0;
    const ranges = plan.phases.map((ph, i) => {
      const startDate = addDays(p.startDate, Math.round((cursor / total) * span));
      cursor += ph.weeks;
      const endDate = i === plan.phases.length - 1 ? p.endDate : addDays(p.startDate, Math.max(0, Math.round((cursor / total) * span) - 1));
      return { name: ph.name, startDate, endDate };
    });
    milestones = ranges.map((r, i) => ({ id: `ms-${i}`, name: r.name, state: "not_started", startDate: r.startDate, endDate: r.endDate }));
    timeline = ranges.map((r, i) => ({ id: `tl-${i}`, label: r.name, startDate: r.startDate, endDate: r.endDate, color: PLAN_COLORS[i % PLAN_COLORS.length] }));
    tasks = plan.tasks.map((t, i) => ({
      id: `${p.id}-tsk-${i}`,
      title: t.title,
      assigneeId: p.ownerId,
      dueDate: ranges[Math.min(t.phase, ranges.length - 1)].endDate,
      priority: t.priority,
      status: "not_started",
    }));
  }
  return {
    summary: p.description,
    about: p.description || "No description yet.",
    tags: plan ? [{ label: plan.tag, tone: "gray" }] : [],
    heroImage: null,
    milestones,
    timeline,
    tasks,
    budget: { spent: 0, total: 100_000 },
    links: [],
  };
}

export async function createProject(input: NewProject, plan: ProjectPlan | null = null): Promise<ProjectSummary> {
  await delay(80);
  const id = uniqueId(input.name);
  const summary: ProjectSummary = {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    phase: plan?.phases[0] ? `${plan.phases[0].name} Phase` : "Planning Phase",
    status: input.status,
    progress: 0,
    startDate: input.startDate,
    endDate: input.endDate,
    ownerId: input.ownerId,
    memberIds: input.memberIds.filter((m) => m !== input.ownerId).slice(0, 3),
    extraMembers: Math.max(0, input.memberIds.filter((m) => m !== input.ownerId).length - 3),
    accent: ACCENTS[db().length % ACCENTS.length],
    thumb: { kind: "icon", icon: plan?.icon ?? "chart", tone: plan?.tone ?? "purple" },
    favorite: false,
    folderId: null,
  };
  details.set(id, plannedDetail(summary, plan));
  store = [summary, ...db()];
  logActivity({ projectId: id, type: "project", action: "created", target: summary.name, detail: plan ? `From the ${plan.tag} template` : undefined });
  return summary;
}

export interface DuplicateOptions {
  name: string;
  /** About, tags, links and budget. */
  details: boolean;
  milestones: boolean;
  /** Copied as not started, with new ids. */
  tasks: boolean;
  team: boolean;
}

/** A copy with a new id; every copied milestone, timeline row, task and link gets a new id too. Approvals, runs, comments and activity stay with the original. */
export async function duplicateProject(sourceId: string, opts: DuplicateOptions): Promise<ProjectSummary> {
  await delay(90);
  const src = requireProject(sourceId);
  const srcDetail = structuredClone(detailOf(src));
  const id = uniqueId(opts.name);
  const summary: ProjectSummary = {
    ...structuredClone(src),
    id,
    name: opts.name.trim(),
    status: "planning",
    progress: 0,
    favorite: false,
    memberIds: opts.team ? [...src.memberIds] : [],
    extraMembers: opts.team ? src.extraMembers : 0,
    phase: opts.milestones && srcDetail.milestones[0] ? `${srcDetail.milestones[0].name} Phase` : "Planning Phase",
  };
  const blank = plannedDetail(summary, null);
  const detail: DetailPart = {
    summary: opts.details ? srcDetail.summary : summary.description,
    about: opts.details ? srcDetail.about : blank.about,
    tags: opts.details ? srcDetail.tags : [],
    heroImage: opts.details ? srcDetail.heroImage : null,
    links: opts.details ? srcDetail.links.map((l, i) => ({ ...l, id: `${id}-lnk-${i}` })) : [],
    budget: opts.details ? { spent: 0, total: srcDetail.budget.total } : blank.budget,
    milestones: opts.milestones ? restate(srcDetail.milestones.map((m, i) => ({ ...m, id: `${id}-ms-${i}` })), 0) : blank.milestones,
    timeline: opts.milestones ? srcDetail.timeline.map((r, i) => ({ ...r, id: `${id}-tl-${i}` })) : blank.timeline,
    tasks: opts.tasks ? srcDetail.tasks.map((t, i) => ({ ...t, id: `${id}-tsk-${i}`, status: "not_started" })) : [],
  };
  details.set(id, detail);
  const at = db().findIndex((p) => p.id === sourceId);
  const next = [...db()];
  next.splice(at + 1, 0, summary);
  store = next;
  logActivity({ projectId: id, type: "project", action: "created", target: summary.name, detail: `Duplicated from ${src.name}` });
  return summary;
}

// ── Change ───────────────────────────────────────────────────────────

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  await delay(50);
  const p = findProject(id);
  if (!p || p.status === status) return;
  logActivity({ projectId: id, type: "status", action: "changed the status of", target: p.name, detail: `${STATUS_META[p.status].label} → ${STATUS_META[status].label}` });
  p.status = status;
}

export interface ProjectChanges {
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  budgetTotal: number;
}

/** Project Settings: changes one project's properties; nothing else is touched. */
export async function updateProject(id: string, c: ProjectChanges): Promise<void> {
  await delay(80);
  const p = requireProject(id);
  if (c.endDate <= c.startDate) throw new Error("End date must be after the start date");
  const d = detailOf(p);
  const changed: string[] = [];
  if (p.name !== c.name.trim()) changed.push("name");
  if (p.ownerId !== c.ownerId) changed.push("owner");
  if (p.startDate !== c.startDate || p.endDate !== c.endDate) changed.push("dates");
  if (p.progress !== c.progress) changed.push("progress");
  if (d.budget.total !== c.budgetTotal) changed.push("budget");
  if (p.status !== c.status) logActivity({ projectId: id, type: "status", action: "changed the status of", target: c.name.trim(), detail: `${STATUS_META[p.status].label} → ${STATUS_META[c.status].label}` });
  const members = c.memberIds.filter((m) => m !== c.ownerId);
  Object.assign(p, {
    name: c.name.trim(),
    description: c.description.trim(),
    ownerId: c.ownerId,
    memberIds: members.slice(0, 3),
    extraMembers: Math.max(0, members.length - 3),
    status: c.status,
    progress: c.progress,
    startDate: c.startDate,
    endDate: c.endDate,
  });
  d.budget = { ...d.budget, total: c.budgetTotal };
  if (changed.includes("progress")) d.milestones = restate(d.milestones, c.progress);
  if (changed.length) logActivity({ projectId: id, type: "project", action: "updated the settings of", target: p.name, detail: `Changed ${changed.join(", ")}` });
}

export async function updateProjectAbout(id: string, about: string): Promise<void> {
  await delay(60);
  const p = requireProject(id);
  detailOf(p).about = about.trim();
  logActivity({ projectId: id, type: "project", action: "edited the description of", target: p.name });
}

// ── Links ────────────────────────────────────────────────────────────

export async function saveLink(projectId: string, link: { id?: string; label: string; href: string }): Promise<ProjectLink> {
  await delay(50);
  const p = requireProject(projectId);
  const d = detailOf(p);
  const clean = { label: link.label.trim(), href: link.href.trim() };
  if (link.id) {
    const existing = d.links.find((l) => l.id === link.id);
    if (!existing) throw new Error("Link not found");
    Object.assign(existing, clean);
    logActivity({ projectId, type: "link", action: "edited the link", target: clean.label });
    return existing;
  }
  const created = { id: newId("lnk"), ...clean };
  d.links = [...d.links, created];
  logActivity({ projectId, type: "link", action: "added the link", target: clean.label });
  return created;
}

export async function removeLink(projectId: string, linkId: string): Promise<void> {
  await delay(40);
  const d = detailOf(requireProject(projectId));
  const link = d.links.find((l) => l.id === linkId);
  d.links = d.links.filter((l) => l.id !== linkId);
  if (link) logActivity({ projectId, type: "link", action: "removed the link", target: link.label });
}

// ── Tasks ────────────────────────────────────────────────────────────

/** Finds a task (and its project) by its id across every project. */
function locateTask(taskId: string) {
  for (const p of db()) {
    const task = detailOf(p).tasks.find((t) => t.id === taskId);
    if (task) return { p, task };
  }
  throw new Error("Task not found");
}

export interface NewTask {
  projectId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
}

export async function createTask(input: NewTask): Promise<ProjectTask> {
  await delay(60);
  const p = requireProject(input.projectId);
  const task: ProjectTask = {
    id: newId("task"),
    title: input.title.trim(),
    assigneeId: input.assigneeId,
    dueDate: input.dueDate,
    priority: input.priority,
    status: "not_started",
  };
  const d = detailOf(p);
  d.tasks = [...d.tasks, task];
  logActivity({ projectId: p.id, type: "task", action: "added the task", target: task.title });
  return task;
}

export type TaskChanges = Partial<Pick<ProjectTask, "title" | "assigneeId" | "dueDate" | "priority" | "status">>;

export async function updateTask(taskId: string, changes: TaskChanges): Promise<ProjectTask> {
  await delay(50);
  const { p, task } = locateTask(taskId);
  const before = task.status;
  Object.assign(task, changes, changes.title ? { title: changes.title.trim() } : {});
  if (changes.status && changes.status !== before) {
    if (changes.status === "done") prevStatus.set(taskId, before);
    logActivity({ projectId: p.id, type: "task", action: changes.status === "done" ? "completed" : "moved the task", target: task.title, detail: changes.status === "done" ? undefined : `to ${changes.status.replace("_", " ")}` });
  } else {
    logActivity({ projectId: p.id, type: "task", action: "updated the task", target: task.title });
  }
  return task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await delay(50);
  const { p, task } = locateTask(taskId);
  const d = detailOf(p);
  d.tasks = d.tasks.filter((t) => t.id !== taskId);
  logActivity({ projectId: p.id, type: "task", action: "deleted the task", target: task.title });
}

/** Ticks a task done, or back to the status it had before. */
export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  await delay(40);
  const { p, task } = locateTask(taskId);
  if (done && task.status !== "done") {
    prevStatus.set(taskId, task.status);
    task.status = "done";
    logActivity({ projectId: p.id, type: "task", action: "completed", target: task.title });
  } else if (!done && task.status === "done") {
    task.status = prevStatus.get(taskId) ?? "not_started";
    prevStatus.delete(taskId);
    logActivity({ projectId: p.id, type: "task", action: "reopened", target: task.title });
  }
}

/** Every task with its project — for My Day, the calendar and reports. */
export function tasksSnapshot(): { task: ProjectTask; project: ProjectSummary }[] {
  return db().flatMap((p) => detailOf(p).tasks.map((task) => ({ task: { ...task }, project: p })));
}

// ── Home ─────────────────────────────────────────────────────────────

const HOME_KIND: Partial<Record<ActivityType, ActivityKind>> = { approval: "approved", file: "uploaded", comment: "commented", task: "completed" };

export async function getHome(): Promise<HomeData> {
  await delay();
  const projects = db();
  const now = Date.now();
  return {
    brief: BRIEF,
    continueWorking: CONTINUE_WORKING.map((id) => projects.find((p) => p.id === id)).filter((p): p is ProjectSummary => !!p),
    focus: FOCUS,
    workspace: WORKSPACE,
    // The latest four entries from the live activity log.
    activity: activitySnapshot()
      .slice(0, 4)
      .map((a) => ({
        id: a.id,
        actorId: a.actorId,
        kind: a.type === "task" && a.action !== "completed" ? "updated" : (HOME_KIND[a.type] ?? "updated"),
        verb: a.action,
        object: a.target,
        minutesAgo: Math.max(0, (now - new Date(a.at).getTime()) / 60_000),
      })),
  };
}

// ── Lookups ──────────────────────────────────────────────────────────

export async function getPeople(): Promise<Person[]> {
  await delay(30);
  return PEOPLE.map((p) => ({ ...p }));
}
