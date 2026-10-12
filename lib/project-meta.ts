import type { Accent, ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types/project";
import type { ProjectTab } from "@/lib/schemas/project";

/** Status pill: label, colours, and whether it carries a leading dot. */
export const STATUS_META: Record<ProjectStatus, { label: string; fg: string; bg: string; dot: boolean }> = {
  on_track: { label: "On track", fg: "#15803D", bg: "#ECFDF3", dot: true },
  blocked: { label: "Blocked", fg: "#DC2626", bg: "#FEF2F2", dot: true },
  at_risk: { label: "At risk", fg: "#EA580C", bg: "#FFF7ED", dot: true },
  planning: { label: "Planning", fg: "#2563EB", bg: "#EFF6FF", dot: false },
  on_hold: { label: "On hold", fg: "#475467", bg: "#F2F4F7", dot: false },
  completed: { label: "Completed", fg: "#5B3FF3", bg: "#F1EEFE", dot: true },
};

/** Which statuses each list tab shows. */
export const TAB_STATUSES: Record<ProjectTab, ProjectStatus[] | null> = {
  all: null,
  active: ["on_track", "blocked", "at_risk"],
  planning: ["planning"],
  on_hold: ["on_hold"],
  completed: ["completed"],
};

export const TAB_LABEL: Record<ProjectTab, string> = {
  all: "All Projects",
  active: "Active",
  planning: "Planning",
  on_hold: "On Hold",
  completed: "Completed",
};

/** Accent colours: `bar` fills progress, `dot` marks favourites, `tint`/`fg` style the Continue button. */
export const ACCENT: Record<Accent, { bar: string; dot: string; fg: string; tint: string }> = {
  purple: { bar: "#6A4FF6", dot: "#6A4FF6", fg: "#5B3FF3", tint: "#F1EEFE" },
  orange: { bar: "#F97316", dot: "#F97316", fg: "#EA580C", tint: "#FFF4EB" },
  green: { bar: "#16A34A", dot: "#16A34A", fg: "#15803D", tint: "#ECFDF3" },
  blue: { bar: "#3B82F6", dot: "#3B82F6", fg: "#2563EB", tint: "#EFF6FF" },
  pink: { bar: "#F43F5E", dot: "#F43F5E", fg: "#E11D48", tint: "#FFF1F3" },
};

/** The project's own status dot colour ("On track" green, "Blocked" red …) on the Home cards. */
export const STATUS_DOT: Record<ProjectStatus, string> = {
  on_track: "#16A34A",
  blocked: "#EF4444",
  at_risk: "#F97316",
  planning: "#3B82F6",
  on_hold: "#98A2B3",
  completed: "#6A4FF6",
};

export const PRIORITY_META: Record<TaskPriority, { label: string; fg: string; bg: string }> = {
  high: { label: "High", fg: "#DC2626", bg: "#FEF2F2" },
  medium: { label: "Medium", fg: "#EA580C", bg: "#FFF7ED" },
  low: { label: "Low", fg: "#15803D", bg: "#ECFDF3" },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; fg: string; bg: string; dot: boolean }> = {
  in_progress: { label: "In progress", fg: "#5B3FF3", bg: "#F1EEFE", dot: true },
  in_review: { label: "In review", fg: "#475467", bg: "#F2F4F7", dot: false },
  not_started: { label: "Not started", fg: "#475467", bg: "#F2F4F7", dot: false },
  done: { label: "Done", fg: "#15803D", bg: "#ECFDF3", dot: true },
};
