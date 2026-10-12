import { z } from "zod";

/** Status tabs on the Projects list. */
export const PROJECT_TABS = ["all", "active", "planning", "on_hold", "completed"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export const PROJECT_SORTS = ["default", "name", "progress", "start", "end"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const PROJECT_LAYOUTS = ["list", "grid"] as const;
export type ProjectLayout = (typeof PROJECT_LAYOUTS)[number];

/** Projects list state, read from (and written to) the URL so views are shareable. */
export const projectQuerySchema = z.object({
  tab: z.enum(PROJECT_TABS).catch("all"),
  q: z.string().trim().max(100).catch(""),
  sort: z.enum(PROJECT_SORTS).catch("default"),
  layout: z.enum(PROJECT_LAYOUTS).catch("list"),
  owner: z.string().catch(""),
  /** The project open in the side panel. */
  project: z.string().max(100).catch(""),
});

export type ProjectQuery = z.infer<typeof projectQuerySchema>;

export const DEFAULT_PROJECT_QUERY: ProjectQuery = { tab: "all", q: "", sort: "default", layout: "list", owner: "", project: "" };

export function parseProjectQuery(params: URLSearchParams): ProjectQuery {
  return projectQuerySchema.parse({
    tab: params.get("tab") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: params.get("sort") ?? undefined,
    layout: params.get("layout") ?? undefined,
    owner: params.get("owner") ?? undefined,
    project: params.get("project") ?? undefined,
  });
}

/** Query string for a list state, leaving out defaults. */
export function projectQueryString(query: ProjectQuery): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_PROJECT_QUERY) as (keyof ProjectQuery)[]) {
    if (query[key] !== DEFAULT_PROJECT_QUERY[key]) params.set(key, query[key]);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
