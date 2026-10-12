/**
 * Mock projects API — the only file to replace when a backend exists.
 * State lives in memory and resets on page reload.
 */
import { ACTIVITY, BRIEF, CONTINUE_WORKING, FOCUS, WORKSPACE } from "@/lib/mock-data/home";
import { PEOPLE } from "@/lib/mock-data/people";
import { PROJECT_DETAILS, PROJECTS } from "@/lib/mock-data/projects";
import { TAB_STATUSES } from "@/lib/project-meta";
import { PROJECT_TABS, type ProjectQuery, type ProjectTab } from "@/lib/schemas/project";
import { parseDate, toIsoDate } from "@/lib/format";
import type { HomeData, Milestone, Person, ProjectDetail, ProjectSummary, ProjectTask, TaskStatus, TimelineRow } from "@/lib/types/project";

const delay = (ms = 80 + Math.random() * 120) => new Promise((r) => setTimeout(r, ms));

let store: ProjectSummary[] | null = null;
const db = () => (store ??= PROJECTS.map((p) => ({ ...p, memberIds: [...p.memberIds] })));

/** Task completion toggled in this session, by task id. */
const taskStatus = new Map<string, TaskStatus>();
/** Session edits to a project's description, by project id. */
const aboutEdits = new Map<string, string>();

// ── Lists ────────────────────────────────────────────────────────────

export interface ProjectList {
  items: ProjectSummary[];
  counts: Record<ProjectTab, number>;
}

const inTab = (p: ProjectSummary, tab: ProjectTab) => {
  const statuses = TAB_STATUSES[tab];
  return !statuses || statuses.includes(p.status);
};

export async function listProjects(query: ProjectQuery): Promise<ProjectList> {
  await delay();
  const q = query.q.toLowerCase();
  const matches = db().filter(
    (p) => (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) && (!query.owner || p.ownerId === query.owner),
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
  const p = db().find((x) => x.id === id);
  if (p) p.favorite = favorite;
}

export async function archiveProject(id: string): Promise<void> {
  await delay(60);
  store = db().filter((p) => p.id !== id);
}

// ── Detail ───────────────────────────────────────────────────────────

const addDays = (iso: string, days: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** Five even phases across the project's dates, their state following overall progress. */
function derivedPlan(p: ProjectSummary): { milestones: Milestone[]; timeline: TimelineRow[] } {
  const names = ["Discovery", "Design", "Build", "Rollout", "Launch"];
  const span = (parseDate(p.endDate).getTime() - parseDate(p.startDate).getTime()) / 86_400_000;
  const step = Math.max(1, Math.floor(span / names.length));
  const colors: TimelineRow["color"][] = ["green", "green", "purple", "orange", "red"];
  const milestones: Milestone[] = names.map((name, i) => {
    const startDate = addDays(p.startDate, i * step);
    const endDate = i === names.length - 1 ? p.endDate : addDays(p.startDate, (i + 1) * step - 1);
    const from = (i / names.length) * 100;
    const to = ((i + 1) / names.length) * 100;
    if (p.progress >= to) return { id: `ms-${i}`, name, state: "completed", completedOn: endDate, startDate, endDate };
    if (p.progress > from) return { id: `ms-${i}`, name, state: "in_progress", progress: Math.round(((p.progress - from) / (to - from)) * 100), startDate, endDate };
    return { id: `ms-${i}`, name, state: "not_started", startDate, endDate };
  });
  // The last phase is drawn as a go-live diamond on the end date.
  const timeline = milestones.map((m, i): TimelineRow => {
    const last = i === names.length - 1;
    return { id: `tl-${i}`, label: m.name, startDate: last ? p.endDate : m.startDate, endDate: m.endDate, color: colors[i], milestone: last || undefined };
  });
  return { milestones, timeline };
}

function derivedTasks(p: ProjectSummary): ProjectTask[] {
  const titles = ["Confirm scope with stakeholders", "Review delivery plan", "Prepare status report", "Update risk register"];
  const priorities: ProjectTask["priority"][] = ["high", "medium", "low", "medium"];
  const statuses: ProjectTask["status"][] = ["in_progress", "in_review", "not_started", "not_started"];
  return titles.map((title, i) => ({
    id: `${p.id}-tsk-${i}`,
    title,
    assigneeId: p.ownerId,
    dueDate: addDays("2026-10-12", [0, 3, 8, 13][i]),
    priority: priorities[i],
    status: statuses[i],
  }));
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  await delay();
  const p = db().find((x) => x.id === id);
  if (!p) return null;
  const seeded = PROJECT_DETAILS[id];
  const detail: ProjectDetail = seeded
    ? { ...p, ...seeded }
    : {
        ...p,
        ...derivedPlan(p),
        summary: `${p.description} — ${p.phase.toLowerCase()}`,
        about: `${p.description}. This project covers planning, delivery and handover, with progress tracked against its milestones and budget.`,
        tags: [{ label: p.phase.replace(/ Phase$/, ""), tone: "gray" }],
        heroImage: null,
        tasks: derivedTasks(p),
        budget: { spent: Math.round(p.progress * 2_500), total: 250_000 },
        links: [{ id: "lnk-1", label: "Project brief", href: "#" }],
      };
  return {
    ...detail,
    about: aboutEdits.get(id) ?? detail.about,
    tasks: detail.tasks.map((t) => ({ ...t, status: taskStatus.get(t.id) ?? t.status })),
  };
}

export async function updateProjectAbout(id: string, about: string): Promise<void> {
  await delay(60);
  aboutEdits.set(id, about.trim());
}

/** Ticks a task done, or back to the status it had before. */
export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  await delay(40);
  if (done) taskStatus.set(taskId, "done");
  else taskStatus.delete(taskId);
}

// ── Home ─────────────────────────────────────────────────────────────

export async function getHome(): Promise<HomeData> {
  await delay();
  const projects = db();
  return {
    brief: BRIEF,
    continueWorking: CONTINUE_WORKING.map((id) => projects.find((p) => p.id === id)).filter((p): p is ProjectSummary => !!p),
    focus: FOCUS,
    workspace: WORKSPACE,
    activity: ACTIVITY,
  };
}

// ── Lookups ──────────────────────────────────────────────────────────

export async function getPeople(): Promise<Person[]> {
  await delay(30);
  return PEOPLE;
}
