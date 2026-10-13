import { z } from "zod";

// ── URL state ────────────────────────────────────────────────────────

export const WORKFLOW_TABS = ["workflows", "approvals"] as const;
export const WORKFLOW_KIND_FILTERS = ["all", "approval", "recurring", "operational"] as const;
export const WORKFLOW_STATUS_FILTERS = ["all", "active", "paused", "draft"] as const;
export const WORKFLOW_SORTS = ["updated", "name", "next_run"] as const;
export const APPROVAL_FILTERS = ["pending", "approved", "rejected", "all"] as const;
export const PAGE_SIZE = 8;

export type WorkflowSort = (typeof WORKFLOW_SORTS)[number];
export type ApprovalFilter = (typeof APPROVAL_FILTERS)[number];

/** Workflows page state, read from (and written to) the URL. */
export const workflowQuerySchema = z.object({
  tab: z.enum(WORKFLOW_TABS).catch("workflows"),
  q: z.string().trim().max(100).catch(""),
  kind: z.enum(WORKFLOW_KIND_FILTERS).catch("all"),
  status: z.enum(WORKFLOW_STATUS_FILTERS).catch("all"),
  sort: z.enum(WORKFLOW_SORTS).catch("updated"),
  approvals: z.enum(APPROVAL_FILTERS).catch("pending"),
  mine: z.enum(["0", "1"]).catch("0"),
  page: z.coerce.number().int().min(1).max(999).catch(1),
});

export type WorkflowQuery = z.infer<typeof workflowQuerySchema>;

export const DEFAULT_WORKFLOW_QUERY: WorkflowQuery = { tab: "workflows", q: "", kind: "all", status: "all", sort: "updated", approvals: "pending", mine: "0", page: 1 };

export function parseWorkflowQuery(params: URLSearchParams): WorkflowQuery {
  const raw = Object.fromEntries(Object.keys(DEFAULT_WORKFLOW_QUERY).map((k) => [k, params.get(k) ?? undefined]));
  return workflowQuerySchema.parse(raw);
}

/** Query string for a page state, leaving out defaults. */
export function workflowQueryString(query: WorkflowQuery): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_WORKFLOW_QUERY) as (keyof WorkflowQuery)[]) {
    if (query[key] !== DEFAULT_WORKFLOW_QUERY[key]) params.set(key, String(query[key]));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ── Forms ────────────────────────────────────────────────────────────

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(3, "Enter at least 3 characters").max(80, "Keep it under 80 characters"),
    description: z.string().trim().max(160, "Keep it under 160 characters"),
    ownerId: z.string().min(1, "Choose an owner"),
    memberIds: z.array(z.string()),
    status: z.enum(["planning", "on_track", "at_risk", "blocked", "on_hold", "completed"]),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "End date must be after the start date" });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const taskFormSchema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  title: z.string().trim().min(3, "Enter at least 3 characters").max(120, "Keep it under 120 characters"),
  assigneeId: z.string().min(1, "Choose an assignee"),
  dueDate: isoDate,
  priority: z.enum(["high", "medium", "low"]),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const workflowFormSchema = z.object({
  name: z.string().trim().min(3, "Enter at least 3 characters").max(80, "Keep it under 80 characters"),
  description: z.string().trim().max(200, "Keep it under 200 characters"),
  kind: z.enum(["approval", "recurring", "operational"]),
  projectId: z.string(),
  teamId: z.string().min(1, "Choose a team"),
  ownerId: z.string().min(1, "Choose an owner"),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
  nextRun: z.string(),
  stages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(2, "Name this stage"),
        ownerId: z.string().min(1, "Choose an owner"),
        type: z.enum(["task", "approval"]),
      }),
    )
    .min(1, "Add at least one stage"),
}).refine((v) => v.recurrence === "none" || /^\d{4}-\d{2}-\d{2}$/.test(v.nextRun), { path: ["nextRun"], message: "Choose when the first run starts" });

export type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

export const approvalFormSchema = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().max(300, "Keep it under 300 characters"),
  projectId: z.string().min(1, "Choose a project"),
  approverId: z.string().min(1, "Choose an approver"),
  dueDate: isoDate,
  amount: z.string().regex(/^\d{0,9}$/, "Whole numbers only"),
});

export type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

export const eventFormSchema = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(100, "Keep it under 100 characters"),
  date: isoDate,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time"),
  projectId: z.string(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const inviteFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["admin", "manager", "member", "viewer"]),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;

export const generalSettingsSchema = z.object({
  workspaceName: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Keep it under 60 characters"),
  timezone: z.string().min(1),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
});

export const contactFormSchema = z.object({
  subject: z.string().trim().min(5, "Enter at least 5 characters").max(120, "Keep it under 120 characters"),
  topic: z.string().min(1, "Choose a topic"),
  message: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(2000, "Keep it under 2,000 characters"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** First error message per field, from a failed Zod parse. Nested fields are keyed by path ("stages.0.name"). */
export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    out[key] ??= issue.message;
  }
  return out;
}

export const teamFormSchema = z.object({
  name: z.string().trim().min(3, "Enter at least 3 characters").max(40, "Keep it under 40 characters").regex(/^[\p{L}\p{N} &'().,-]+$/u, "Use letters, numbers and simple punctuation"),
  description: z.string().trim().max(160, "Keep it under 160 characters"),
  leadId: z.string().min(1, "Choose a team lead"),
  memberIds: z.array(z.string()),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60, "Keep it under 60 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  title: z.string().trim().min(2, "Enter your job title").max(60, "Keep it under 60 characters"),
  department: z.string().trim().max(60, "Keep it under 60 characters"),
  avatar: z.string().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const noteFormSchema = z.object({
  title: z.string().trim().min(1, "Give the note a title").max(100, "Keep it under 100 characters"),
  body: z.string().max(10_000, "Keep notes under 10,000 characters"),
  projectId: z.string(),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export const linkFormSchema = z.object({
  label: z.string().trim().min(2, "Enter a name for the link").max(60, "Keep it under 60 characters"),
  href: z
    .string()
    .trim()
    .refine((v) => {
      // In-app pages ("/files?file=…") are fine too.
      if (/^\/[^/\s]/.test(v)) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a web address starting with https:// or an app page starting with /"),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

export const projectSettingsSchema = z
  .object({
    name: z.string().trim().min(3, "Enter at least 3 characters").max(80, "Keep it under 80 characters"),
    description: z.string().trim().max(160, "Keep it under 160 characters"),
    ownerId: z.string().min(1, "Choose an owner"),
    memberIds: z.array(z.string()),
    teamIds: z.array(z.string()),
    status: z.enum(["planning", "on_track", "at_risk", "blocked", "on_hold", "completed"]),
    progress: z.coerce.number({ message: "Enter a number from 0 to 100" }).int("Whole numbers only").min(0, "Enter a number from 0 to 100").max(100, "Enter a number from 0 to 100"),
    startDate: isoDate,
    endDate: isoDate,
    budgetTotal: z.coerce.number({ message: "Enter an amount" }).int("Whole numbers only").min(0, "Budget can't be negative").max(1_000_000_000, "That budget is too large"),
  })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "End date must be after the start date" });

export const duplicateFormSchema = z.object({
  name: z.string().trim().min(3, "Enter at least 3 characters").max(80, "Keep it under 80 characters"),
  details: z.boolean(),
  milestones: z.boolean(),
  tasks: z.boolean(),
  team: z.boolean(),
});

export type DuplicateFormValues = z.infer<typeof duplicateFormSchema>;

export const taskEditSchema = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(120, "Keep it under 120 characters"),
  assigneeId: z.string().min(1, "Choose an assignee"),
  dueDate: isoDate,
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["not_started", "in_progress", "in_review", "done"]),
});

export type TaskEditValues = z.infer<typeof taskEditSchema>;
