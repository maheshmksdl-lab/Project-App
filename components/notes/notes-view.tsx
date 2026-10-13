"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, NoteIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { Card, OutlineButton, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { ConfirmDialog, FilterSelect, FormField, PageHeader, SearchInput, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { useDeleteNote, useNotes, useSaveNote } from "@/hooks/use-workspace";
import { formatAgo, formatDate } from "@/lib/format";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import { fieldErrors, noteFormSchema, type NoteFormValues } from "@/lib/schemas/workspace";
import type { Note } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60_000;

/** The editor for one note (or a new one). Remount per note so it starts from that note's saved text. */
function NoteEditor({ note, defaultProject, onSaved, onCancel, onDeleted }: { note: Note | null; defaultProject: string; onSaved: (id: string) => void; onCancel: () => void; onDeleted: () => void }) {
  const save = useSaveNote();
  const remove = useDeleteNote();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const initial: NoteFormValues = { title: note?.title ?? "", body: note?.body ?? "", projectId: note?.projectId ?? defaultProject };
  const [values, setValues] = useState<NoteFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const submit = () => {
    const parsed = noteFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      document.getElementById("nn-title")?.focus();
      return;
    }
    save.mutate(
      { id: note?.id, ...parsed.data, projectId: parsed.data.projectId || null },
      {
        onSuccess: (saved) => {
          toast.success(note ? "Note saved" : "Note created", { description: saved.title });
          onSaved(saved.id);
        },
        onError: (err) => toast.error("Couldn't save the note", { description: err.message }),
      },
    );
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex h-full flex-col"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded text-[12.5px] text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action lg:hidden">
          <ArrowLeftIcon size={13} aria-hidden /> All notes
        </button>
        <span className="text-[12px] text-ink-muted">{note ? `Created ${formatDate(note.createdAt.slice(0, 10))} · updated ${formatAgo(minutesSince(note.updatedAt))}` : "New note"}</span>
        <div className="ml-auto flex items-center gap-1">
          {note && <BookmarkButton type="note" refId={note.id} label={note.title} />}
          {note && (
            <OutlineButton icon={TrashIcon} className="h-8 hover:text-[#DC2626]" onClick={() => setConfirm(true)}>
              Delete
            </OutlineButton>
          )}
        </div>
      </div>
      <div className="grid flex-1 gap-4 px-5 py-4">
        <FormField label="Title" htmlFor="nn-title" error={errors.title}>
          <input
            id="nn-title"
            value={values.title}
            onChange={(e) => {
              setValues((v) => ({ ...v, title: e.target.value }));
              setErrors({});
            }}
            aria-invalid={!!errors.title}
            className={fieldClass}
            autoFocus={!note}
          />
        </FormField>
        <FormField label="Project" htmlFor="nn-project">
          <SelectField
            id="nn-project"
            value={values.projectId || "none"}
            onChange={(v) => setValues((s) => ({ ...s, projectId: v === "none" ? "" : v }))}
            options={[{ value: "none", label: "No project (personal)" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
          />
        </FormField>
        <FormField label="Note" htmlFor="nn-body" error={errors.body}>
          <textarea
            id="nn-body"
            value={values.body}
            onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
            rows={12}
            placeholder="Write anything — one idea per line works well."
            aria-invalid={!!errors.body}
            className={cn(fieldClass, "h-auto min-h-[240px] resize-y py-2.5 leading-[22px]")}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">
        <OutlineButton onClick={() => (dirty ? setValues(initial) : onCancel())}>{dirty ? "Discard changes" : "Close"}</OutlineButton>
        <PrimaryButton type="submit" disabled={save.isPending || (!!note && !dirty)}>
          {save.isPending ? "Saving…" : note ? "Save note" : "Create note"}
        </PrimaryButton>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete "${note?.title}"?`}
        description="The note is removed everywhere it appears. This can't be undone."
        confirmLabel="Delete note"
        pending={remove.isPending}
        onConfirm={() =>
          note &&
          remove.mutate(note.id, {
            onSuccess: () => {
              toast.success("Note deleted", { description: note.title });
              setConfirm(false);
              onDeleted();
            },
          })
        }
      />
    </form>
  );
}

export function NotesView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const { data, isError, refetch } = useNotes();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const [q, setQ] = useState("");
  const project = params.get("project") ?? "all";
  const selected = params.get("note"); // a note id, "new", or none
  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    router.replace(`/notes${s ? `?${s}` : ""}`, { scroll: false });
  };

  const projectName = (id: string | null) => (id ? (projectList?.items.find((p) => p.id === id)?.name ?? null) : null);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (n) => (project === "all" || (project === "none" ? !n.projectId : n.projectId === project)) && (!needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)),
    );
  }, [data, q, project]);
  const current = selected && selected !== "new" ? data?.find((n) => n.id === selected) : null;
  const editing = selected === "new" || !!current;

  return (
    <PageShell>
      <PageHeader
        title="Notes"
        subtitle="Capture decisions, ideas and to-dos — on their own or linked to a project."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => go({ note: "new" })}>
            New note
          </PrimaryButton>
        }
      />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search notes..." label="Search notes" />
        <FilterSelect
          label="Project"
          value={project}
          onChange={(v) => go({ project: v })}
          className="min-w-[180px] sm:ml-auto"
          options={[{ value: "all", label: "All notes" }, { value: "none", label: "Personal notes" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
        />
      </div>

      {isError ? (
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      ) : !hydrated || !data ? (
        <Skeleton className="mt-4 h-96 rounded-xl" />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card label="Note list" className={cn("min-w-0", editing && "hidden lg:block")}>
            {items.length ? (
              <ul className="p-2">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => go({ note: n.id })}
                      aria-current={n.id === selected ? "true" : undefined}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                        n.id === selected ? "bg-brand-tint" : "hover:bg-brand-surface",
                      )}
                    >
                      <span className="block truncate text-[13.5px] leading-5 font-medium text-ink">{n.title}</span>
                      <span className="block truncate text-[12px] leading-4 text-ink-muted">{n.body.split("\n")[0] || "No text"}</span>
                      <span className="mt-1 block text-[11.5px] leading-4 text-ink-muted">
                        {projectName(n.projectId) ?? "Personal"} · {formatAgo(minutesSince(n.updatedAt))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={NoteIcon}
                title={q || project !== "all" ? "No notes match" : "No notes yet"}
                hint={q || project !== "all" ? "Try a different search or project." : "Create your first note."}
                className="py-10"
              />
            )}
          </Card>
          <Card label="Note" className={cn("min-w-0", !editing && "hidden lg:block")}>
            {editing ? (
              <NoteEditor
                key={selected ?? "none"}
                note={current ?? null}
                defaultProject={project !== "all" && project !== "none" ? project : ""}
                onSaved={(id) => go({ note: id })}
                onCancel={() => go({ note: null })}
                onDeleted={() => go({ note: null })}
              />
            ) : selected && !current ? (
              <EmptyState icon={NoteIcon} title="This note isn't available" hint="It may have been deleted." className="py-16" />
            ) : (
              <EmptyState
                icon={NoteIcon}
                title="Choose a note"
                hint="Or start a new one."
                action={
                  <OutlineButton icon={PlusIcon} onClick={() => go({ note: "new" })}>
                    New note
                  </OutlineButton>
                }
                className="py-16"
              />
            )}
          </Card>
        </div>
      )}
      {current?.projectId && (
        <p className="mt-3 text-[12.5px] text-ink-muted">
          Linked to{" "}
          <Link href={projectHref(current.projectId)} className="font-medium text-brand hover:text-brand-press">
            {projectName(current.projectId)}
          </Link>
          .
        </p>
      )}
    </PageShell>
  );
}
