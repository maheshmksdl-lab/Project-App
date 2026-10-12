import type { ActivityItem, BriefItem, FocusSummary, WorkspaceTile } from "@/lib/types/project";

export const BRIEF: BriefItem[] = [
  {
    id: "br-1",
    kind: "milestone",
    title: "ERP Implementation",
    body: "Deployment milestone is due",
    highlight: "tomorrow.",
  },
  {
    id: "br-2",
    kind: "approvals",
    title: "2 approvals",
    body: "need your attention.",
    action: { label: "Review" },
  },
  {
    id: "br-3",
    kind: "blocked",
    title: "Warehouse Expansion",
    body: "is currently blocked.",
    action: { label: "View details", href: "/projects?project=warehouse-expansion" },
  },
  {
    id: "br-4",
    kind: "completed",
    title: "Sarah completed",
    body: "API integration yesterday.",
    action: { label: "View update" },
  },
  {
    id: "br-5",
    kind: "recurring",
    title: "3 recurring workflows",
    body: "begin today.",
    action: { label: "View workflows" },
  },
];

/** Projects on the "Continue working" strip, most recently opened first. */
export const CONTINUE_WORKING = ["erp-implementation", "warehouse-expansion", "customer-portal", "marketing-campaign-q3"];

export const FOCUS: FocusSummary = {
  done: 8,
  total: 20,
  tasks: { count: 11, highPriority: 3 },
  meetings: { count: 3, upcoming: 1 },
  approvals: { count: 2, pending: 2 },
  deadlines: { count: 1, dueToday: 1 },
};

export const WORKSPACE: WorkspaceTile[] = [
  { key: "my_day", label: "My Day", meta: "11 tasks" },
  { key: "approvals", label: "Approvals", meta: "2 pending" },
  { key: "calendar", label: "Calendar", meta: "3 events" },
  { key: "notes", label: "Notes", meta: "4 recent" },
  { key: "files", label: "Files", meta: "6 files" },
  { key: "bookmarks", label: "Bookmarks", meta: "5 items" },
  { key: "templates", label: "Templates", meta: "12 templates" },
];

export const ACTIVITY: ActivityItem[] = [
  { id: "act-1", actorId: "usr-mike", kind: "approved", verb: "approved", object: "Budget Review", minutesAgo: 10 },
  { id: "act-2", actorId: "usr-sarah", kind: "uploaded", verb: "uploaded", object: "Wireframes.fig", minutesAgo: 60 },
  { id: "act-3", actorId: "usr-john", kind: "completed", verb: "completed", object: "Sprint Planning", minutesAgo: 120 },
  { id: "act-4", actorId: "usr-anna", kind: "commented", verb: "commented on", object: "ERP Deployment", minutesAgo: 180 },
];
