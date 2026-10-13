"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowRightIcon, CheckSquareIcon, ClockIcon, EyeIcon, FloppyDiskIcon, FlagIcon, SquaresFourIcon, TrashIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { useCreate } from "@/components/shared/create-dialogs";
import { Badge, OutlineButton, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { ConfirmDialog, FilterSelect, FormDialog, FormField, PageHeader, SearchInput, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { ProjectThumb } from "@/components/projects/project-thumb";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { useDeleteTemplate, useSaveAsTemplate, useTemplates } from "@/hooks/use-workspace";
import { pluralize } from "@/lib/format";
import { PRIORITY_META } from "@/lib/project-meta";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import type { ProjectTemplate, TemplateCategory } from "@/lib/types/workspace";
import { TEMPLATE_CATEGORY_LABEL } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";

type Sort = "popular" | "name" | "recent";
type Source = "all" | "builtin" | "custom";

const totalWeeks = (t: ProjectTemplate) => t.phases.reduce((n, p) => n + p.weeks, 0);
const PHASE_COLORS = ["#22C55E", "#7C5CFA", "#C4B5FD", "#FB923C", "#F43F5E", "#3B82F6"];

/** Phases as proportional bars, then the starter tasks grouped by phase. */
function TemplatePreview({ tpl, onUse, onClose }: { tpl: ProjectTemplate; onUse: () => void; onClose: () => void }) {
  const weeks = totalWeeks(tpl);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(92dvh,760px)] flex-col gap-0 rounded-2xl p-0 sm:max-w-2xl">
        <div className="flex items-start gap-3 border-b border-line-soft px-5 pt-5 pb-4 pr-12">
          <ProjectThumb thumb={{ kind: "icon", icon: tpl.icon, tone: tpl.tone }} size={40} />
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-6 font-semibold text-ink">{tpl.name}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] leading-5 text-ink-muted">{tpl.description}</DialogDescription>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <h3 className="text-[13px] font-semibold text-ink">
            Phases <span className="font-normal text-ink-muted">· about {weeks} weeks</span>
          </h3>
          <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {tpl.phases.map((p, i) => (
              <span key={p.name} style={{ flexGrow: p.weeks, backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }} />
            ))}
          </div>
          <ol className="mt-3 space-y-3">
            {tpl.phases.map((p, i) => {
              const tasks = tpl.tasks.filter((t) => t.phase === i);
              return (
                <li key={p.name} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }} aria-hidden />
                    <span className="text-[13px] font-medium text-ink">
                      {i + 1}. {p.name}
                    </span>
                    <span className="ml-auto text-[12px] text-ink-muted">{pluralize(p.weeks, "week")}</span>
                  </div>
                  {tasks.length > 0 && (
                    <ul className="mt-2 space-y-1.5 pl-4.5">
                      {tasks.map((t) => (
                        <li key={t.title} className="flex items-center gap-2 text-[12.5px] text-ink-body">
                          <CheckSquareIcon size={14} aria-hidden className="shrink-0 text-ink-muted" />
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          <Badge fg={PRIORITY_META[t.priority].fg} bg={PRIORITY_META[t.priority].bg} dot>
                            {PRIORITY_META[t.priority].label}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
          <OutlineButton onClick={onClose}>Close</OutlineButton>
          <PrimaryButton icon={ArrowRightIcon} onClick={onUse}>
            Use template
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaveAsTemplateDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const save = useSaveAsTemplate();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const errs: Record<string, string> = {};
    if (!projectId) errs.projectId = "Choose a project";
    if (name.trim().length < 3) errs.name = "Enter at least 3 characters";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`st-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    save.mutate(
      { projectId, name },
      {
        onSuccess: (tpl) => {
          toast.success("Template saved", { description: `${tpl.name} · ${pluralize(tpl.phases.length, "phase")}, ${pluralize(tpl.tasks.length, "task")}` });
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't save the template", { description: err.message }),
      },
    );
  };
  return (
    <FormDialog open onOpenChange={onOpenChange} title="Save a project as a template" description="Its milestones become phases and its tasks become starter tasks." submitLabel="Save template" onSubmit={submit} pending={save.isPending}>
      <div className="grid gap-4">
        <FormField label="Project" htmlFor="st-projectId" error={errors.projectId}>
          <SelectField
            id="st-projectId"
            value={projectId}
            onChange={(v) => {
              setProjectId(v);
              setErrors((e) => ({ ...e, projectId: "" }));
              if (!name) setName(`${projectList?.items.find((p) => p.id === v)?.name ?? ""} template`);
            }}
            placeholder="Choose a project"
            options={(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            invalid={!!errors.projectId}
          />
        </FormField>
        <FormField label="Template name" htmlFor="st-name" error={errors.name}>
          <input
            id="st-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, name: "" }));
            }}
            aria-invalid={!!errors.name}
            className={fieldClass}
          />
        </FormField>
      </div>
    </FormDialog>
  );
}

function TemplateCard({ tpl, onPreview, onUse, onDelete }: { tpl: ProjectTemplate; onPreview: () => void; onUse: () => void; onDelete: () => void }) {
  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-soft">
      <div className="flex items-start gap-3">
        <ProjectThumb thumb={{ kind: "icon", icon: tpl.icon, tone: tpl.tone }} size={42} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] leading-5 font-semibold text-ink">{tpl.name}</h3>
          <p className="truncate text-[12px] leading-4 text-ink-muted">{TEMPLATE_CATEGORY_LABEL[tpl.category]}</p>
        </div>
        {!tpl.builtIn && (
          <Badge fg="#5B3FF3" bg="#F1EEFE" className="shrink-0">
            Yours
          </Badge>
        )}
        <BookmarkButton type="template" refId={tpl.id} label={tpl.name} className="-mt-1 -mr-1" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-5 text-ink-body">{tpl.description}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
        <li className="inline-flex items-center gap-1.5">
          <FlagIcon size={13} aria-hidden /> {pluralize(tpl.phases.length, "phase")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <CheckSquareIcon size={13} aria-hidden /> {pluralize(tpl.tasks.length, "task")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <ClockIcon size={13} aria-hidden /> ~{totalWeeks(tpl)} weeks
        </li>
        <li className="inline-flex items-center gap-1.5">
          <UsersThreeIcon size={13} aria-hidden /> Used {tpl.uses}×
        </li>
      </ul>
      <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3">
        <OutlineButton icon={EyeIcon} className="h-8" onClick={onPreview}>
          Preview
        </OutlineButton>
        {!tpl.builtIn && (
          <OutlineButton icon={TrashIcon} aria-label={`Delete ${tpl.name}`} className="h-8 w-8 px-0 hover:text-[#DC2626]" onClick={onDelete}>
            <span className="sr-only">Delete</span>
          </OutlineButton>
        )}
        <PrimaryButton className="ml-auto h-8 px-3.5" onClick={onUse}>
          Use template
        </PrimaryButton>
      </div>
    </li>
  );
}

export function TemplatesView({ previewId }: { previewId?: string | null }) {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useTemplates();
  const remove = useDeleteTemplate();
  const { openCreateProject } = useCreate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [source, setSource] = useState<Source>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [preview, setPreview] = useState<ProjectTemplate | null>(null);
  const [deleting, setDeleting] = useState<ProjectTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const onSearch = useCallback((v: string) => setQ(v), []);
  // Bookmarks link to /templates?preview=<id>: open that template's preview once loaded.
  const [previewOpened, setPreviewOpened] = useState(false);
  if (previewId && data && !previewOpened) {
    setPreviewOpened(true);
    const tpl = data.find((t) => t.id === previewId);
    if (tpl) setPreview(tpl);
  }

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = (data ?? []).filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (source === "all" || (source === "builtin") === t.builtIn) &&
        (!needle || t.name.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle)),
    );
    return [...rows].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? b.updatedOn.localeCompare(a.updatedOn) : b.uses - a.uses));
  }, [data, q, category, source, sort]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const t of data ?? []) c.set(t.category, (c.get(t.category) ?? 0) + 1);
    return c;
  }, [data]);
  const filtered = !!q || category !== "all" || source !== "all";
  const use = (tpl: ProjectTemplate) => {
    setPreview(null);
    openCreateProject({ templateId: tpl.id });
  };

  return (
    <PageShell>
      <PageHeader
        title="Templates"
        subtitle="Start projects from proven plans for every way your teams work."
        actions={
          <>
            <OutlineButton icon={FloppyDiskIcon} onClick={() => setSaving(true)}>
              Save project as template
            </OutlineButton>
            <PrimaryButton onClick={() => openCreateProject()}>New blank project</PrimaryButton>
          </>
        }
      />

      <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Template categories">
        {(["all", ...Object.keys(TEMPLATE_CATEGORY_LABEL)] as (TemplateCategory | "all")[]).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
              category === c ? "border-brand-soft bg-brand-tint text-brand" : "border-line bg-white text-ink-body hover:border-brand-soft",
            )}
          >
            {c === "all" ? "All templates" : TEMPLATE_CATEGORY_LABEL[c]}
            <span className="text-[11px] text-ink-muted tabular-nums">{c === "all" ? (data?.length ?? "") : (counts.get(c) ?? 0)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={onSearch} placeholder="Search templates..." label="Search templates" />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: "all", label: "Built-in and yours" },
              { value: "builtin", label: "Built-in" },
              { value: "custom", label: "Yours" },
            ]}
          />
          <FilterSelect
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "popular", label: "Most used" },
              { value: "recent", label: "Recently updated" },
              { value: "name", label: "Name" },
            ]}
          />
        </div>
      </div>

      <div className="@container mt-4">
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[220px] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={SquaresFourIcon}
            title={filtered ? "No templates match" : "No templates yet"}
            hint={source === "custom" && !q ? "Save any project as a template to reuse its plan." : "Try a different search or category."}
            action={
              <OutlineButton
                onClick={() => {
                  setQ("");
                  setCategory("all");
                  setSource("all");
                }}
              >
                Show all templates
              </OutlineButton>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-[13px] text-ink-muted" aria-live="polite">
              {pluralize(items.length, "template")}
            </p>
            <ul className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-3">
              {items.map((t) => (
                <TemplateCard key={t.id} tpl={t} onPreview={() => setPreview(t)} onUse={() => use(t)} onDelete={() => setDeleting(t)} />
              ))}
            </ul>
          </>
        )}
      </div>

      {preview && <TemplatePreview tpl={preview} onUse={() => use(preview)} onClose={() => setPreview(null)} />}
      {saving && <SaveAsTemplateDialog onOpenChange={setSaving} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "template"}?`}
        description="Projects already created from it keep their plan."
        confirmLabel="Delete template"
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Template deleted", { description: deleting.name });
              setDeleting(null);
            },
          })
        }
      />
    </PageShell>
  );
}
