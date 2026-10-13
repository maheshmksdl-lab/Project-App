/**
 * Mock API for the modules that read across projects: calendar, templates,
 * teams, reports and settings. State lives in memory and resets on reload.
 */
import { CURRENT_USER_ID, PEOPLE } from "@/lib/mock-data/people";
import { TEAMS } from "@/lib/mock-data/teams";
import { TEMPLATES } from "@/lib/mock-data/templates";
import type { InviteFormValues } from "@/lib/schemas/workspace";
import type { Person, ProjectDetail, ProjectSummary, ProjectTask } from "@/lib/types/project";
import type { Approval, CalendarEvent, PendingInvite, Profile, ProjectTemplate, Team, Workflow, WorkspaceSettings } from "@/lib/types/workspace";
import { logActivity } from "./activity";
import { delay, newId, todayIso } from "./mock";
import { createProject, projectDetailsSnapshot, projectsSnapshot, type NewProject } from "./projects";
import { approvalsSnapshot, workflowsSnapshot } from "./workflows";

// ── Settings ─────────────────────────────────────────────────────────

let settings: WorkspaceSettings = {
  workspaceName: "EVOQ Projects",
  timezone: "Asia/Kolkata",
  weekStartsOn: 1,
  defaultTaskPriority: "medium",
  defaultApproverId: "usr-mike",
  notifications: {
    taskAssigned: true,
    approvalRequested: true,
    projectStatusChanged: true,
    workflowRunStarted: false,
    mentions: true,
    weeklyDigest: true,
  },
  members: PEOPLE.map((p) => ({
    personId: p.id,
    role: p.id === CURRENT_USER_ID ? "admin" : ["usr-mike", "usr-marcus", "usr-john", "usr-olivia", "usr-grace"].includes(p.id) ? "manager" : "member",
  })),
  invites: [{ id: "inv-1", email: "priya.nair@evoq.one", role: "member", invitedOn: "2026-10-08" }],
};

export async function getSettings(): Promise<WorkspaceSettings> {
  await delay(60);
  return structuredClone(settings);
}

export async function updateSettings(patch: Partial<Omit<WorkspaceSettings, "members" | "invites">>): Promise<WorkspaceSettings> {
  await delay(70);
  settings = { ...settings, ...structuredClone(patch) };
  return structuredClone(settings);
}

export async function setMemberRole(personId: string, role: WorkspaceSettings["members"][number]["role"]): Promise<void> {
  await delay(50);
  const admins = settings.members.filter((m) => m.role === "admin");
  if (role !== "admin" && admins.length === 1 && admins[0].personId === personId) throw new Error("The workspace needs at least one admin");
  settings = { ...settings, members: settings.members.map((m) => (m.personId === personId ? { ...m, role } : m)) };
}

export async function inviteMember(values: InviteFormValues): Promise<PendingInvite> {
  await delay(70);
  if (settings.invites.some((i) => i.email === values.email)) throw new Error("That address already has an invite");
  const invite: PendingInvite = { id: newId("inv"), email: values.email, role: values.role, invitedOn: todayIso() };
  settings = { ...settings, invites: [invite, ...settings.invites] };
  return invite;
}

export async function revokeInvite(id: string): Promise<void> {
  await delay(50);
  settings = { ...settings, invites: settings.invites.filter((i) => i.id !== id) };
}

/** Settings read synchronously by other mock modules (e.g. defaults). */
export const settingsSnapshot = () => settings;

// ── Templates ────────────────────────────────────────────────────────

let templates: ProjectTemplate[] = structuredClone(TEMPLATES);

export const templatesSnapshot = () => templates;

export async function listTemplates(): Promise<ProjectTemplate[]> {
  await delay();
  return templates;
}

/** Creates a project from a template: phases become milestones, tasks are scheduled across the dates. */
export async function createProjectFromTemplate(templateId: string, input: NewProject): Promise<ProjectSummary> {
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) throw new Error("Template not found");
  const project = await createProject(input, { phases: tpl.phases, tasks: tpl.tasks, icon: tpl.icon, tone: tpl.tone, tag: tpl.name });
  templates = templates.map((t) => (t.id === templateId ? { ...t, uses: t.uses + 1 } : t));
  return project;
}

/** Saves an existing project's plan as a reusable template. */
export async function saveProjectAsTemplate(projectId: string, name: string): Promise<ProjectTemplate> {
  await delay(80);
  const detail = projectDetailsSnapshot().find((p) => p.id === projectId);
  if (!detail) throw new Error("Project not found");
  const day = 86_400_000;
  const weeks = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / day / 7));
  const phases = detail.milestones.map((m) => ({ name: m.name, weeks: weeks(m.startDate, m.endDate) }));
  const tpl: ProjectTemplate = {
    id: newId("tpl"),
    name: name.trim(),
    description: detail.summary || detail.description,
    category: "pmo",
    icon: detail.thumb.kind === "icon" ? detail.thumb.icon : "chart",
    tone: detail.thumb.kind === "icon" ? detail.thumb.tone : "purple",
    phases,
    tasks: detail.tasks.map((t) => {
      const idx = detail.milestones.findIndex((m) => t.dueDate <= m.endDate);
      return { title: t.title, priority: t.priority, phase: idx < 0 ? Math.max(0, phases.length - 1) : idx };
    }),
    uses: 0,
    builtIn: false,
    updatedOn: todayIso(),
  };
  templates = [tpl, ...templates];
  return tpl;
}

export async function deleteTemplate(id: string): Promise<void> {
  await delay(50);
  templates = templates.filter((t) => t.id !== id || t.builtIn);
}

// ── Calendar ─────────────────────────────────────────────────────────

let meetings: CalendarEvent[] = [
  { id: "mtg-1", kind: "meeting", title: "ERP steering committee", date: "2026-10-14", time: "10:00", projectId: "erp-implementation", href: null },
  { id: "mtg-2", kind: "meeting", title: "Portal launch readiness", date: "2026-10-13", time: "15:30", projectId: "customer-portal", href: null },
  { id: "mtg-3", kind: "meeting", title: "Warehouse vendor call", date: "2026-10-16", time: "11:00", projectId: "warehouse-expansion", href: null },
  { id: "mtg-4", kind: "meeting", title: "Portfolio review", date: "2026-10-21", time: "09:30", projectId: null, href: null },
  { id: "mtg-5", kind: "meeting", title: "Mobile app kickoff", date: "2026-10-08", time: "14:00", projectId: "mobile-app-v2", href: null },
];

const projectHref = (id: string) => `/projects/${encodeURIComponent(id)}`;

/** Recurring runs projected forward from their next start, inside the window. */
function runDates(wf: Workflow, from: string, to: string): string[] {
  if (!wf.nextRun || wf.status !== "active") return [];
  const out: string[] = [];
  const d = new Date(`${wf.nextRun}T00:00:00`);
  for (let i = 0; i < 400; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (iso > to) break;
    if (iso >= from) out.push(iso);
    if (wf.recurrence === "daily") d.setDate(d.getDate() + 1);
    else if (wf.recurrence === "weekly") d.setDate(d.getDate() + 7);
    else if (wf.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
    else break;
  }
  return out;
}

/** Everything dated between `from` and `to` (inclusive): tasks, milestones, deadlines, runs, approvals, meetings. */
export async function listCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  await delay();
  const inRange = (d: string) => d >= from && d <= to;
  const events: CalendarEvent[] = [];
  for (const p of projectDetailsSnapshot()) {
    for (const t of p.tasks) {
      if (inRange(t.dueDate))
        events.push({ id: `task-${p.id}-${t.id}`, taskId: t.id, kind: "task", title: t.title, date: t.dueDate, projectId: p.id, href: projectHref(p.id), meta: t.status === "done" ? "Done" : `Due · ${t.priority} priority` });
    }
    for (const m of p.milestones) {
      if (inRange(m.endDate)) events.push({ id: `ms-${p.id}-${m.id}`, kind: "milestone", title: m.name, date: m.endDate, projectId: p.id, href: projectHref(p.id), meta: "Milestone due" });
    }
    if (inRange(p.endDate)) events.push({ id: `end-${p.id}`, kind: "deadline", title: `${p.name} ends`, date: p.endDate, projectId: p.id, href: projectHref(p.id), meta: "Project end date" });
  }
  for (const wf of workflowsSnapshot()) {
    for (const d of runDates(wf, from, to))
      events.push({ id: `run-${wf.id}-${d}`, kind: "workflow", title: wf.name, date: d, projectId: wf.projectId, href: `/workflows/${wf.id}`, meta: `Scheduled ${wf.recurrence} run` });
  }
  for (const a of approvalsSnapshot()) {
    if (a.status === "pending" && inRange(a.dueDate))
      events.push({ id: `apr-${a.id}`, kind: "approval", title: a.title, date: a.dueDate, projectId: a.projectId, href: "/workflows?tab=approvals", meta: "Approval due" });
  }
  for (const m of meetings) if (inRange(m.date)) events.push(m);
  return events.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

export async function createMeeting(input: { title: string; date: string; time: string; projectId: string | null }): Promise<CalendarEvent> {
  await delay(60);
  const ev: CalendarEvent = { id: newId("mtg"), kind: "meeting", title: input.title.trim(), date: input.date, time: input.time, projectId: input.projectId, href: null };
  meetings = [...meetings, ev];
  return ev;
}

export async function deleteMeeting(id: string): Promise<void> {
  await delay(40);
  meetings = meetings.filter((m) => m.id !== id);
}

// ── Teams ────────────────────────────────────────────────────────────

let teams: Team[] = structuredClone(TEAMS);

export interface TeamMemberLoad {
  person: Person;
  openTasks: number;
  overdue: number;
}

export interface TeamOverview {
  team: Team;
  projects: ProjectSummary[];
  members: TeamMemberLoad[];
  workflows: Workflow[];
  approvals: Approval[];
  upcoming: { task: ProjectTask; project: ProjectSummary }[];
}

/** Open (not done) tasks per person across all projects. */
function workload(details: ProjectDetail[], today: string) {
  const load = new Map<string, { open: number; overdue: number }>();
  for (const p of details) {
    for (const t of p.tasks) {
      if (t.status === "done") continue;
      const cur = load.get(t.assigneeId) ?? { open: 0, overdue: 0 };
      cur.open += 1;
      if (t.dueDate < today) cur.overdue += 1;
      load.set(t.assigneeId, cur);
    }
  }
  return load;
}

export async function getTeam(id: string): Promise<TeamOverview | null> {
  await delay();
  const team = teams.find((t) => t.id === id);
  if (!team) return null;
  const today = todayIso();
  const details = projectDetailsSnapshot();
  const projects = projectsSnapshot().filter((p) => team.projectIds.includes(p.id));
  const load = workload(details, today);
  const members = team.memberIds
    .map((pid) => PEOPLE.find((p) => p.id === pid))
    .filter((p): p is Person => !!p)
    .map((person) => ({ person, openTasks: load.get(person.id)?.open ?? 0, overdue: load.get(person.id)?.overdue ?? 0 }));
  const upcoming = details
    .filter((p) => team.projectIds.includes(p.id))
    .flatMap((p) => p.tasks.filter((t) => t.status !== "done").map((task) => ({ task, project: p as ProjectSummary })))
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))
    .slice(0, 6);
  return {
    team,
    projects,
    members,
    workflows: workflowsSnapshot().filter((w) => w.teamId === team.id),
    approvals: approvalsSnapshot().filter((a) => a.status === "pending" && !!a.projectId && team.projectIds.includes(a.projectId)),
    upcoming,
  };
}

export const teamsSnapshot = () => teams;

export async function listTeams(): Promise<Team[]> {
  await delay(40);
  return structuredClone(teams);
}

export interface TeamInput {
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
}

const TEAM_COLORS = [
  { fg: "#5B3FF3", bg: "#F1EEFE" },
  { fg: "#EA580C", bg: "#FFF4EB" },
  { fg: "#15803D", bg: "#ECFDF3" },
  { fg: "#2563EB", bg: "#EFF6FF" },
  { fg: "#BE185D", bg: "#FDF2F8" },
  { fg: "#0E7490", bg: "#ECFEFF" },
];

function checkTeamName(name: string, exceptId?: string) {
  const clean = name.trim();
  if (clean.length < 3) throw new Error("Team names need at least 3 characters");
  if (teams.some((t) => t.id !== exceptId && t.name.toLowerCase() === clean.toLowerCase())) throw new Error("A team with that name already exists");
  return clean;
}

const initialsOf = (name: string) =>
  name
    .replace(/\bteam\b/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "T");

export async function createTeam(input: TeamInput): Promise<Team> {
  await delay(70);
  const name = checkTeamName(input.name);
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
  let id = base;
  for (let n = 2; teams.some((t) => t.id === id); n++) id = `${base}-${n}`;
  const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
  const team: Team = {
    id,
    name,
    short: initialsOf(name),
    ...color,
    description: input.description.trim(),
    leadId: input.leadId,
    memberIds: [...new Set([input.leadId, ...input.memberIds])],
    projectIds: [],
  };
  teams = [...teams, team];
  logActivity({ projectId: null, type: "team", action: "created the team", target: name });
  return team;
}

export async function updateTeam(id: string, input: TeamInput): Promise<void> {
  await delay(70);
  const team = teams.find((t) => t.id === id);
  if (!team) throw new Error("Team not found");
  const name = checkTeamName(input.name, id);
  Object.assign(team, { name, short: initialsOf(name), description: input.description.trim(), leadId: input.leadId, memberIds: [...new Set([input.leadId, ...input.memberIds])] });
  logActivity({ projectId: null, type: "team", action: "updated the team", target: name });
}

export async function deleteTeam(id: string): Promise<void> {
  await delay(70);
  const team = teams.find((t) => t.id === id);
  if (!team) return;
  const owned = workflowsSnapshot().filter((w) => w.teamId === id).length;
  if (owned) throw new Error(`Move its ${owned} workflow${owned === 1 ? "" : "s"} to another team first`);
  teams = teams.filter((t) => t.id !== id);
  logActivity({ projectId: null, type: "team", action: "deleted the team", target: team.name });
}

/** A person's team memberships (from Members on a team page). A team's lead stays a member. */
export async function setPersonTeams(personId: string, teamIds: string[]): Promise<void> {
  await delay(60);
  const leads = teams.filter((t) => t.leadId === personId && !teamIds.includes(t.id));
  if (leads.length) throw new Error(`${leads.map((t) => t.name).join(", ")} needs a new lead before this person can leave`);
  teams = teams.map((t) => {
    const member = t.memberIds.includes(personId);
    const want = teamIds.includes(t.id);
    if (member === want) return t;
    return { ...t, memberIds: want ? [...t.memberIds, personId] : t.memberIds.filter((m) => m !== personId) };
  });
}

/** Which teams a project belongs to (Project Settings). */
export async function setProjectTeams(projectId: string, teamIds: string[]): Promise<void> {
  await delay(40);
  teams = teams.map((t) => {
    const has = t.projectIds.includes(projectId);
    const want = teamIds.includes(t.id);
    if (has === want) return t;
    return { ...t, projectIds: want ? [...t.projectIds, projectId] : t.projectIds.filter((p) => p !== projectId) };
  });
}

// ── Reports ──────────────────────────────────────────────────────────

export interface ReportData {
  projects: ProjectDetail[];
  approvals: Approval[];
  workflows: Workflow[];
  workload: { person: Person; open: number; overdue: number; done: number }[];
  today: string;
}

/** Raw rows for the Reports page; filtering and aggregation happen on the page so filters stay instant. */
export async function getReportData(): Promise<ReportData> {
  await delay();
  const today = todayIso();
  const projects = projectDetailsSnapshot();
  const load = workload(projects, today);
  const done = new Map<string, number>();
  for (const p of projects) for (const t of p.tasks) if (t.status === "done") done.set(t.assigneeId, (done.get(t.assigneeId) ?? 0) + 1);
  return {
    projects,
    approvals: approvalsSnapshot(),
    workflows: workflowsSnapshot(),
    workload: PEOPLE.map((person) => ({ person, open: load.get(person.id)?.open ?? 0, overdue: load.get(person.id)?.overdue ?? 0, done: done.get(person.id) ?? 0 })),
    today,
  };
}

// ── Profile ──────────────────────────────────────────────────────────

const profileExtras = { email: "nikhil.v@evoq.one", department: "Project Management Office" };

function currentProfile(): Profile {
  const me = PEOPLE.find((p) => p.id === CURRENT_USER_ID)!;
  return { personId: me.id, name: me.name, title: me.role, avatar: me.avatar, ...profileExtras };
}

export async function getProfile(): Promise<Profile> {
  await delay(40);
  return currentProfile();
}

/**
 * Saves the signed-in user's profile. The person record is updated in place,
 * so every avatar, owner label and assignee picker shows the new details.
 */
export async function updateProfile(input: Omit<Profile, "personId">): Promise<Profile> {
  await delay(80);
  const me = PEOPLE.find((p) => p.id === CURRENT_USER_ID)!;
  Object.assign(me, { name: input.name.trim(), role: input.title.trim(), avatar: input.avatar });
  Object.assign(profileExtras, { email: input.email.trim().toLowerCase(), department: input.department.trim() });
  return currentProfile();
}
