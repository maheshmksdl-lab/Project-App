"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckIcon,
  DotsThreeIcon,
  FolderOpenIcon,
  FolderSimpleIcon,
  FunnelSimpleIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack } from "@/components/shared/person-avatar";
import { useCreate } from "@/components/shared/create-dialogs";
import { IconButton, OutlineButton, PrimaryButton, ProgressBar, StatusPill, UnderlineTabs } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePeople, useProjects } from "@/hooks/use-projects";
import { useFolders } from "@/hooks/use-workspace";
import { formatDate } from "@/lib/format";
import { personById } from "@/lib/mock-data/people";
import { ACCENT, TAB_LABEL } from "@/lib/project-meta";
import { projectHref, setProjectsListHref } from "@/lib/routes";
import { parseProjectQuery, PROJECT_SORTS, PROJECT_TABS, projectQueryString, type ProjectQuery, type ProjectSort } from "@/lib/schemas/project";
import type { Person, ProjectSummary } from "@/lib/types/project";
import { cn } from "@/lib/utils";
import { ProjectRowMenu } from "./project-actions";
import { ProjectThumb } from "./project-thumb";

const SORT_LABEL: Record<ProjectSort, string> = {
  default: "Recently updated",
  name: "Name",
  progress: "Progress",
  start: "Start date",
  end: "End date",
};

const members = (p: ProjectSummary) => p.memberIds.map(personById).filter((x): x is Person => !!x);

/** List state lives in the URL (tab, search, owner, sort, layout). */
function useProjectQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => parseProjectQuery(new URLSearchParams(params.toString())), [params]);
  const update = useCallback(
    (patch: Partial<ProjectQuery>) => router.replace(`${pathname}${projectQueryString({ ...query, ...patch })}`, { scroll: false }),
    [query, router, pathname],
  );
  return [query, update] as const;
}

// ── Toolbar ──────────────────────────────────────────────────────────

/** Search box; types locally and writes to the URL after a short pause. */
function ProjectSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // The URL changed from elsewhere (header search, Back): show it.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className="relative min-w-0 flex-1 sm:w-[170px] sm:flex-none">
      <MagnifyingGlassIcon size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search projects..."
        aria-label="Search projects"
        className="h-9 w-full rounded-lg border border-line bg-white pr-3 pl-8.5 text-[13px] text-ink outline-none placeholder:text-ink-muted transition-colors focus:border-brand-soft focus:ring-3 focus:ring-brand-10"
      />
    </div>
  );
}

function OwnerFilter({ value, onChange }: { value: string; onChange: (owner: string) => void }) {
  const { data: people } = usePeople();
  const owner = value ? personById(value) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <OutlineButton icon={FunnelSimpleIcon} aria-pressed={!!value} aria-label={owner ? `Filter: owner ${owner.name}` : "Filter"}>
          <span className="hidden sm:inline">{owner ? owner.name.split(" ")[0] : "Filter"}</span>
        </OutlineButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 rounded-xl">
        <DropdownMenuLabel>Owner</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
          <DropdownMenuRadioItem value="any">Anyone</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {(people ?? []).map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              {p.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Folder filter: any, unfiled, or one folder (folders come from Move to folder). */
function FolderFilter({ value, onChange }: { value: string; onChange: (folder: string) => void }) {
  const { data: folders } = useFolders();
  const current = folders?.find((f) => f.id === value);
  const label = value === "none" ? "No folder" : current?.name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <OutlineButton icon={FolderSimpleIcon} aria-pressed={!!value} aria-label={label ? `Folder: ${label}` : "Folder"}>
          <span className="hidden max-w-[120px] truncate sm:inline">{label ?? "Folder"}</span>
        </OutlineButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 rounded-xl">
        <DropdownMenuLabel>Folder</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
          <DropdownMenuRadioItem value="any">All folders</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="none">No folder</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {(folders ?? []).map((f) => (
            <DropdownMenuRadioItem key={f.id} value={f.id}>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-[11px] text-ink-muted tabular-nums">{f.count}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LayoutToggle({ value, onChange }: { value: ProjectQuery["layout"]; onChange: (v: ProjectQuery["layout"]) => void }) {
  const grid = value === "grid";
  return (
    <OutlineButton
      onClick={() => onChange(grid ? "list" : "grid")}
      aria-label={grid ? "Switch to list view" : "Switch to grid view"}
      title={grid ? "List view" : "Grid view"}
      className="w-9 border-brand-soft bg-brand-tint px-0 text-brand hover:bg-brand-10 hover:text-brand"
    >
      {grid ? <SquaresFourIcon size={17} aria-hidden /> : <ListBulletsIcon size={17} aria-hidden />}
    </OutlineButton>
  );
}

function SortMenu({ value, onChange }: { value: ProjectSort; onChange: (s: ProjectSort) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Sort by: ${SORT_LABEL[value]}`} className="size-7 rounded-md border border-line bg-white">
          <DotsThreeIcon size={16} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as ProjectSort)}>
          {PROJECT_SORTS.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {SORT_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── List ─────────────────────────────────────────────────────────────

/** Rows and cards open the project's Details page. */
type OpenProject = (id: string) => void;

const head = "px-3 py-3 text-left text-table-header whitespace-nowrap text-ink-body first:pl-1 last:pr-1";
const cell = "px-3 py-3.5 align-middle first:pl-1 last:pr-1";

function NameCell({ project }: { project: ProjectSummary }) {
  return (
    <span className="flex min-w-0 items-center gap-3.5">
      <ProjectThumb thumb={project.thumb} size={42} />
      <span className="min-w-0">
        <Link
          href={projectHref(project.id)}
          // The row/card handles plain clicks too; don't navigate twice.
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 block truncate rounded text-[13px] leading-5 font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
        >
          {project.name}
        </Link>
        <span className="block truncate text-[12px] leading-4 text-ink-muted">{project.description}</span>
      </span>
    </span>
  );
}

function ProgressCell({ project }: { project: ProjectSummary }) {
  return (
    <span className="block w-[64px]">
      <span className="block text-[12px] leading-4 text-ink-body tabular-nums">{project.progress}%</span>
      <ProgressBar value={project.progress} color={ACCENT[project.accent].bar} className="mt-1.5" label={`${project.name}: ${project.progress}% complete`} />
    </span>
  );
}

function ProjectTable({ items, sort, onSort, onOpen }: { items: ProjectSummary[]; sort: ProjectSort; onSort: (s: ProjectSort) => void; onOpen: OpenProject }) {
  const date = cn(cell, "text-[12.5px] whitespace-nowrap text-ink-body");
  return (
    <div className="hidden overflow-x-auto scrollbar-thin md:block">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={cn(head, "w-[34%]")}>
              Name
            </th>
            <th scope="col" className={head}>
              Status
            </th>
            <th scope="col" className={head}>
              Progress
            </th>
            <th scope="col" className={head}>
              Start Date
            </th>
            <th scope="col" className={head}>
              End Date
            </th>
            <th scope="col" className={head}>
              Owner
            </th>
            <th scope="col" className={cn(head, "w-10 text-right")}>
              <span className="sr-only">Actions</span>
              <SortMenu value={sort} onChange={onSort} />
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer border-b border-line-soft transition-colors hover:bg-brand-surface">
              <td className={cn(cell, "max-w-0")}>
                <NameCell project={p} />
              </td>
              <td className={cell}>
                <StatusPill status={p.status} />
              </td>
              <td className={cell}>
                <ProgressCell project={p} />
              </td>
              <td className={date}>{formatDate(p.startDate)}</td>
              <td className={date}>{formatDate(p.endDate)}</td>
              <td className={cell}>
                <AvatarStack people={members(p)} extra={p.extraMembers} size="sm" />
              </td>
              <td className={cn(cell, "text-right")}>
                <ProjectRowMenu project={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: one card per project instead of the table. Also the grid layout. */
function ProjectCards({ items, grid, onOpen }: { items: ProjectSummary[]; grid: boolean; onOpen: OpenProject }) {
  return (
    <ul className={cn("grid gap-3 pt-4", grid ? "@xl:grid-cols-2 @5xl:grid-cols-3" : "md:hidden")}>
      {items.map((p) => (
        <li key={p.id} className="relative rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-soft">
          <div className="flex items-start gap-3">
            <NameCell project={p} />
            <div className="relative z-10 ml-auto">
              <ProjectRowMenu project={p} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <StatusPill status={p.status} />
            <ProgressBar value={p.progress} color={ACCENT[p.accent].bar} className="flex-1" label={`${p.name}: ${p.progress}% complete`} />
            <span className="text-[12px] text-ink-body tabular-nums">{p.progress}%</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
            <span>
              {formatDate(p.startDate)} – {formatDate(p.endDate)}
            </span>
            <AvatarStack people={members(p)} extra={p.extraMembers} size="sm" />
          </div>
          {/* Whole card opens the project; the name link and menu stay on top for keyboard users. */}
          <button type="button" onClick={() => onOpen(p.id)} className="absolute inset-0 rounded-xl" aria-hidden tabIndex={-1} />
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 pt-3" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-2.5">
          <Skeleton className="size-[42px] rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
          <Skeleton className="hidden h-3 w-64 md:block" />
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

const listPane = "@container min-w-0 px-4 py-5 sm:px-6 lg:py-7";

function PageTitle() {
  const { openCreateProject } = useCreate();
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-9 font-bold tracking-[-0.01em] text-ink sm:text-[28px]">Projects</h1>
        <p className="mt-1 text-[14px] leading-5 text-ink-muted">Plan, track and deliver all your projects in one place.</p>
      </div>
      <PrimaryButton onClick={() => openCreateProject()} className="mt-1">
        <PlusIcon size={16} weight="bold" aria-hidden className="sm:hidden" />
        New Project
      </PrimaryButton>
    </div>
  );
}

export function ProjectsViewFallback() {
  return (
    <div className={cn(listPane, "mx-auto w-full max-w-[1600px] lg:px-9")}>
      <PageTitle />
      <ListSkeleton />
    </div>
  );
}

export function ProjectsView() {
  const [query, update] = useProjectQuery();
  const { data, isError, refetch } = useProjects(query);
  const hydrated = useHydrated();
  const router = useRouter();
  const legacyProject = useSearchParams().get("project");
  const onSearch = useCallback((q: string) => update({ q }), [update]);
  const onOpen = useCallback((id: string) => router.push(projectHref(id)), [router]);
  const filtered = !!query.q || !!query.owner || !!query.folder;

  // "Back to Projects" from a project returns to this exact list state.
  useEffect(() => setProjectsListHref(`/projects${projectQueryString(query)}`), [query]);
  // Old `/projects?project=…` links (from the side-panel days) open the Details page.
  useEffect(() => {
    if (legacyProject) router.replace(projectHref(legacyProject));
  }, [legacyProject, router]);

  return (
    <div className="flex-1">
      <div className={cn(listPane, "mx-auto w-full max-w-[1600px] lg:px-9")}>
        <PageTitle />

        <div className="mt-5 flex items-center justify-end gap-2 lg:mt-1">
          <ProjectSearch value={query.q} onChange={onSearch} />
          <OwnerFilter value={query.owner} onChange={(owner) => update({ owner })} />
          <FolderFilter value={query.folder} onChange={(folder) => update({ folder })} />
          <LayoutToggle value={query.layout} onChange={(layout) => update({ layout })} />
          <div className="md:hidden">
            <SortMenu value={query.sort} onChange={(sort) => update({ sort })} />
          </div>
        </div>
        <UnderlineTabs
          label="Project status"
          className="mt-3"
          dot={false}
          value={query.tab}
          onChange={(tab) => update({ tab })}
          tabs={PROJECT_TABS.map((t) => ({ value: t, label: TAB_LABEL[t], count: hydrated ? data?.counts[t] : undefined }))}
        />

        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <ListSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={FolderOpenIcon}
            title={filtered ? "No projects match" : `No ${TAB_LABEL[query.tab].toLowerCase()} projects`}
            hint={filtered ? "Try a different search or clear the filter." : "Projects appear here as their status changes."}
            action={
              filtered ? (
                <OutlineButton icon={CheckIcon} onClick={() => update({ q: "", owner: "", folder: "" })}>
                  Clear search and filter
                </OutlineButton>
              ) : undefined
            }
          />
        ) : query.layout === "grid" ? (
          <ProjectCards items={data.items} grid onOpen={onOpen} />
        ) : (
          <>
            <ProjectTable items={data.items} sort={query.sort} onSort={(sort) => update({ sort })} onOpen={onOpen} />
            <ProjectCards items={data.items} grid={false} onOpen={onOpen} />
          </>
        )}
      </div>
    </div>
  );
}
