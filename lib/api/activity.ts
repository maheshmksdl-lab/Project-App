/**
 * Activity log for the mock APIs: every meaningful change records an entry
 * here, and the Activity tab, the Activity page and Home's Recent Activity
 * read from it. In memory; resets on reload.
 */
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import type { ActivityEntry } from "@/lib/types/workspace";
import { newId } from "./mock";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

let log: ActivityEntry[] = [
  { id: "act-1", projectId: "erp-implementation", actorId: "usr-mike", type: "approval", action: "approved", target: "Budget Review", at: ago(10) },
  { id: "act-2", projectId: "customer-portal", actorId: "usr-sarah", type: "file", action: "uploaded", target: "Wireframes.fig", at: ago(60) },
  { id: "act-3", projectId: "mobile-app-v2", actorId: "usr-john", type: "task", action: "completed", target: "Sprint Planning", at: ago(120) },
  { id: "act-4", projectId: "erp-implementation", actorId: "usr-anna", type: "comment", action: "commented on", target: "ERP Deployment", at: ago(180) },
  { id: "act-5", projectId: "customer-portal", actorId: "usr-sarah", type: "task", action: "completed", target: "API integration", at: ago(60 * 20) },
  { id: "act-6", projectId: "warehouse-expansion", actorId: "usr-marcus", type: "status", action: "changed the status of", target: "Warehouse Expansion", detail: "At risk → Blocked", at: ago(60 * 26) },
  { id: "act-7", projectId: "erp-implementation", actorId: "usr-nikhil", type: "milestone", action: "completed the milestone", target: "System design", at: ago(60 * 24 * 6) },
  { id: "act-8", projectId: "hrms-rollout", actorId: "usr-grace", type: "approval", action: "requested approval for", target: "HRMS data retention policy", at: ago(60 * 24 * 11) },
];

export function logActivity(entry: Omit<ActivityEntry, "id" | "at" | "actorId"> & { actorId?: string }): void {
  log = [{ id: newId("act"), at: new Date().toISOString(), actorId: CURRENT_USER_ID, ...entry }, ...log];
}

/** Newest first; scoped to one project when given. */
export function activitySnapshot(projectId?: string): ActivityEntry[] {
  return projectId ? log.filter((a) => a.projectId === projectId) : log;
}

