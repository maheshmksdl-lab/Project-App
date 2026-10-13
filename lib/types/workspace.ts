/** Domain types for the modules around projects: workflows, approvals, calendar, templates, teams, settings, help. */
import type { ProjectIconKey, TaskPriority } from "./project";

// ── Teams ────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  /** Initials on the sidebar chip. */
  short: string;
  fg: string;
  bg: string;
  description: string;
  leadId: string;
  memberIds: string[];
  projectIds: string[];
}

// ── Workflows & approvals ────────────────────────────────────────────

export type WorkflowKind = "approval" | "recurring" | "operational";
export type WorkflowStatus = "active" | "paused" | "draft";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface WorkflowStage {
  id: string;
  name: string;
  ownerId: string;
  /** An approval stage waits for its owner's decision before the run moves on. */
  type: "task" | "approval";
}

export type RunState = "running" | "waiting_approval" | "completed" | "stopped";

export interface WorkflowRun {
  id: string;
  startedOn: string;
  /** Index into the workflow's stages; equals `stages.length` once completed. */
  stageIndex: number;
  state: RunState;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  kind: WorkflowKind;
  status: WorkflowStatus;
  projectId: string | null;
  teamId: string;
  ownerId: string;
  recurrence: Recurrence;
  /** Next scheduled start (recurring workflows only). */
  nextRun: string | null;
  stages: WorkflowStage[];
  runs: WorkflowRun[];
  updatedOn: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Approval {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  workflowId: string | null;
  /** The workflow run waiting on this decision, if any. */
  runId?: string;
  requesterId: string;
  approverId: string;
  requestedOn: string;
  dueDate: string;
  status: ApprovalStatus;
  amount: number | null;
  decidedOn?: string;
  decisionNote?: string;
}

// ── Calendar ─────────────────────────────────────────────────────────

export type CalendarKind = "task" | "milestone" | "deadline" | "workflow" | "approval" | "meeting";

export interface CalendarEvent {
  id: string;
  kind: CalendarKind;
  title: string;
  date: string;
  /** "09:30" for meetings; all-day otherwise. */
  time?: string;
  projectId: string | null;
  /** Task events: the task, so it can be opened in place. */
  taskId?: string;
  /** Where the event opens (the project, workflow …). */
  href: string | null;
  meta?: string;
}

// ── Templates ────────────────────────────────────────────────────────

export type TemplateCategory = "software" | "pmo" | "manufacturing" | "engineering" | "construction" | "healthcare" | "logistics" | "services";

export interface TemplatePhase {
  name: string;
  weeks: number;
}

export interface TemplateTask {
  title: string;
  priority: TaskPriority;
  /** Index into `phases`; the task is due at the end of that phase. */
  phase: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: ProjectIconKey;
  tone: "purple" | "blue" | "green" | "gray";
  phases: TemplatePhase[];
  tasks: TemplateTask[];
  uses: number;
  builtIn: boolean;
  updatedOn: string;
}

// ── Settings ─────────────────────────────────────────────────────────

export type MemberRole = "admin" | "manager" | "member" | "viewer";

export interface WorkspaceMember {
  personId: string;
  role: MemberRole;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  invitedOn: string;
}

export interface NotificationPrefs {
  taskAssigned: boolean;
  approvalRequested: boolean;
  projectStatusChanged: boolean;
  workflowRunStarted: boolean;
  mentions: boolean;
  weeklyDigest: boolean;
}

export interface WorkspaceSettings {
  workspaceName: string;
  timezone: string;
  /** 0 = Sunday, 1 = Monday — the Calendar's first column. */
  weekStartsOn: 0 | 1;
  defaultTaskPriority: TaskPriority;
  defaultApproverId: string;
  notifications: NotificationPrefs;
  members: WorkspaceMember[];
  invites: PendingInvite[];
}

// ── Help ─────────────────────────────────────────────────────────────

export type HelpTopic = "getting_started" | "projects" | "workflows" | "calendar" | "reports" | "admin";

export interface HelpArticle {
  id: string;
  topic: HelpTopic;
  title: string;
  summary: string;
  /** Paragraphs. */
  body: string[];
  /** In-app page the article is about. */
  href?: string;
}

// ── Activity ─────────────────────────────────────────────────────────

export type ActivityType = "project" | "status" | "task" | "milestone" | "comment" | "file" | "note" | "approval" | "team" | "link";

/** One thing someone did, recorded when it happens. */
export interface ActivityEntry {
  id: string;
  projectId: string | null;
  actorId: string;
  type: ActivityType;
  /** "changed the status of", "uploaded", "approved" … */
  action: string;
  /** The record it affected ("Customer Portal", "Wireframes.fig"). */
  target: string;
  /** Extra detail ("On track → At risk"). */
  detail?: string;
  /** ISO date-time. */
  at: string;
}

// ── Notes, files, comments, bookmarks, folders ───────────────────────

export interface Note {
  id: string;
  title: string;
  body: string;
  projectId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export type FileKind = "image" | "pdf" | "document" | "spreadsheet" | "presentation" | "text" | "archive" | "design" | "other";

export interface FileRecord {
  id: string;
  name: string;
  kind: FileKind;
  mime: string;
  size: number;
  projectId: string | null;
  uploaderId: string;
  uploadedAt: string;
  /** Object URL of a file added in this browser session; null for sample records (no content). */
  url: string | null;
}

export interface Comment {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  /** Reply to another comment (one level). */
  parentId: string | null;
  createdAt: string;
  editedAt?: string;
}

export type BookmarkType = "project" | "task" | "workflow" | "template" | "note" | "file" | "report" | "team";

export interface Bookmark {
  id: string;
  type: BookmarkType;
  /** Stable id of the saved record (a page key such as "reports" for report bookmarks). */
  refId: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
}

// ── Profile & product updates ────────────────────────────────────────

export interface Profile {
  personId: string;
  name: string;
  email: string;
  title: string;
  department: string;
  avatar: string | null;
}

export type ReleaseCategory = "new" | "improved" | "fixed";

export interface ReleaseNote {
  id: string;
  date: string;
  category: ReleaseCategory;
  title: string;
  body: string;
  href?: string;
}
