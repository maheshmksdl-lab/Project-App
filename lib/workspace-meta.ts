import type { ApprovalStatus, CalendarKind, HelpTopic, MemberRole, Recurrence, RunState, TemplateCategory, WorkflowKind, WorkflowStatus } from "@/lib/types/workspace";

type Tone = { label: string; fg: string; bg: string; dot: boolean };

export const WORKFLOW_KIND_META: Record<WorkflowKind, Tone> = {
  approval: { label: "Approval", fg: "#C2410C", bg: "#FFF4EB", dot: false },
  recurring: { label: "Recurring", fg: "#5B3FF3", bg: "#F1EEFE", dot: false },
  operational: { label: "Operational", fg: "#2563EB", bg: "#EFF6FF", dot: false },
};

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, Tone> = {
  active: { label: "Active", fg: "#15803D", bg: "#ECFDF3", dot: true },
  paused: { label: "Paused", fg: "#B45309", bg: "#FFF7E8", dot: true },
  draft: { label: "Draft", fg: "#475467", bg: "#F2F4F7", dot: false },
};

export const RUN_STATE_META: Record<RunState, Tone> = {
  running: { label: "In progress", fg: "#5B3FF3", bg: "#F1EEFE", dot: true },
  waiting_approval: { label: "Waiting for approval", fg: "#C2410C", bg: "#FFF4EB", dot: true },
  completed: { label: "Completed", fg: "#15803D", bg: "#ECFDF3", dot: true },
  stopped: { label: "Stopped", fg: "#DC2626", bg: "#FEF2F2", dot: true },
};

export const APPROVAL_STATUS_META: Record<ApprovalStatus, Tone> = {
  pending: { label: "Pending", fg: "#C2410C", bg: "#FFF4EB", dot: true },
  approved: { label: "Approved", fg: "#15803D", bg: "#ECFDF3", dot: true },
  rejected: { label: "Rejected", fg: "#DC2626", bg: "#FEF2F2", dot: true },
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "Runs on demand",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

/** Calendar item colours: the chip's dot and soft fill, always shown with the item's label. */
export const CALENDAR_KIND_META: Record<CalendarKind, { label: string; dot: string; bg: string; fg: string }> = {
  task: { label: "Tasks", dot: "#6A4FF6", bg: "#F1EEFE", fg: "#4C32D9" },
  milestone: { label: "Milestones", dot: "#16A34A", bg: "#ECFDF3", fg: "#15803D" },
  deadline: { label: "Project deadlines", dot: "#DC2626", bg: "#FEF2F2", fg: "#B91C1C" },
  workflow: { label: "Workflow runs", dot: "#2563EB", bg: "#EFF6FF", fg: "#1D4ED8" },
  approval: { label: "Approvals due", dot: "#EA580C", bg: "#FFF4EB", fg: "#C2410C" },
  meeting: { label: "Meetings", dot: "#475467", bg: "#F2F4F7", fg: "#344054" },
};

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  software: "Software & Technology",
  pmo: "Enterprise PMO",
  manufacturing: "Manufacturing",
  engineering: "Engineering",
  construction: "Construction & Field Ops",
  healthcare: "Healthcare",
  logistics: "Logistics & Supply Chain",
  services: "Professional Services",
};

export const ROLE_META: Record<MemberRole, { label: string; hint: string }> = {
  admin: { label: "Admin", hint: "Manages the workspace, members and settings" },
  manager: { label: "Manager", hint: "Creates projects, workflows and approves requests" },
  member: { label: "Member", hint: "Works on projects and tasks" },
  viewer: { label: "Viewer", hint: "Can view projects and reports" },
};

export const HELP_TOPIC_LABEL: Record<HelpTopic, string> = {
  getting_started: "Getting started",
  projects: "Projects & tasks",
  workflows: "Workflows & approvals",
  calendar: "Calendar",
  reports: "Reports",
  admin: "Teams & admin",
};
