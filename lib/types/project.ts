/** Domain types for the Projects app. Dates are ISO calendar dates (YYYY-MM-DD). */

export type ProjectStatus = "on_track" | "blocked" | "at_risk" | "planning" | "on_hold" | "completed";

/** Colour family for a project's accents (progress bar, favourite dot, Continue button). */
export type Accent = "purple" | "orange" | "green" | "blue" | "pink";

export interface Person {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
}

/** Name of a Phosphor glyph in `PROJECT_ICONS` (components/projects/project-thumb.tsx). */
export type ProjectIconKey = "phone" | "server" | "users" | "chart" | "building" | "leaf" | "chat" | "book";

export type ProjectThumb = { kind: "photo"; src: string } | { kind: "icon"; icon: ProjectIconKey; tone: "purple" | "blue" | "green" | "gray" };

export interface ProjectSummary {
  id: string;
  name: string;
  /** One-line description under the name in the list. */
  description: string;
  /** Current phase, shown on the Home "Continue working" cards. */
  phase: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  ownerId: string;
  /** Members shown as faces; `extraMembers` more are summarised as "+N". */
  memberIds: string[];
  extraMembers: number;
  accent: Accent;
  thumb: ProjectThumb;
  favorite: boolean;
  /** Folder the project is filed in (Move to folder); none when unset. */
  folderId?: string | null;
}

export type MilestoneState = "completed" | "in_progress" | "not_started";

export interface Milestone {
  id: string;
  name: string;
  state: MilestoneState;
  /** Completion date (completed) — progress is read from `progress` while in progress. */
  completedOn?: string;
  progress?: number;
  startDate: string;
  endDate: string;
}

/** A bar (or diamond, for a single-day milestone) on the project timeline. */
export interface TimelineRow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  color: "green" | "purple" | "lavender" | "orange" | "red";
  milestone?: boolean;
}

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "in_progress" | "in_review" | "not_started" | "done";

export interface ProjectTask {
  id: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface ProjectTag {
  label: string;
  tone: "gray" | "red";
}

export interface ProjectLink {
  id: string;
  label: string;
  href: string;
}

export interface ProjectDetail extends ProjectSummary {
  /** Subtitle under the title on the project page. */
  summary: string;
  about: string;
  tags: ProjectTag[];
  heroImage: string | null;
  milestones: Milestone[];
  timeline: TimelineRow[];
  tasks: ProjectTask[];
  budget: { spent: number; total: number };
  links: ProjectLink[];
}

// ── Home dashboard ───────────────────────────────────────────────────

export type BriefKind = "milestone" | "approvals" | "blocked" | "completed" | "recurring";

export interface BriefItem {
  id: string;
  kind: BriefKind;
  title: string;
  /** Body text; `highlight` (if any) is appended in the accent colour. */
  body: string;
  highlight?: string;
  action?: { label: string; href?: string };
}

export interface FocusSummary {
  done: number;
  total: number;
  tasks: { count: number; highPriority: number };
  meetings: { count: number; upcoming: number };
  approvals: { count: number; pending: number };
  deadlines: { count: number; dueToday: number };
}

export type WorkspaceKey = "my_day" | "approvals" | "calendar" | "notes" | "files" | "bookmarks" | "templates";

export interface WorkspaceTile {
  key: WorkspaceKey;
  label: string;
  meta: string;
}

export type ActivityKind = "approved" | "uploaded" | "completed" | "commented" | "updated";

export interface ActivityItem {
  id: string;
  actorId: string;
  kind: ActivityKind;
  verb: string;
  object: string;
  minutesAgo: number;
}

export interface HomeData {
  brief: BriefItem[];
  continueWorking: ProjectSummary[];
  focus: FocusSummary;
  workspace: WorkspaceTile[];
  activity: ActivityItem[];
}
