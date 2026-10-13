"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowSquareOutIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileArchiveIcon,
  FileDocIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileXlsIcon,
  FolderSimpleIcon,
  InfoIcon,
  PencilSimpleIcon,
  PenNibIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookmark } from "@/components/shared/bookmark-button";
import { IconButton, OutlineButton, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { ConfirmDialog, FilterSelect, FormDialog, FormField, PersonChip, SearchInput, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProjects } from "@/hooks/use-projects";
import { useAddFile, useDeleteFile, useFiles, useUpdateFile } from "@/hooks/use-workspace";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from "@/lib/api/collab";
import { formatDate } from "@/lib/format";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import type { FileKind, FileRecord } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

const KIND: Record<FileKind, { label: string; icon: Icon; fg: string; bg: string }> = {
  image: { label: "Image", icon: FileImageIcon, fg: "#2563EB", bg: "#EFF6FF" },
  pdf: { label: "PDF", icon: FilePdfIcon, fg: "#DC2626", bg: "#FEF2F2" },
  document: { label: "Document", icon: FileDocIcon, fg: "#2563EB", bg: "#EFF6FF" },
  spreadsheet: { label: "Spreadsheet", icon: FileXlsIcon, fg: "#15803D", bg: "#ECFDF3" },
  presentation: { label: "Presentation", icon: FilePptIcon, fg: "#EA580C", bg: "#FFF4EB" },
  text: { label: "Text", icon: FileTextIcon, fg: "#475467", bg: "#F2F4F7" },
  archive: { label: "Archive", icon: FileArchiveIcon, fg: "#475467", bg: "#F2F4F7" },
  design: { label: "Design", icon: PenNibIcon, fg: "#5B3FF3", bg: "#F1EEFE" },
  other: { label: "File", icon: FileIcon, fg: "#475467", bg: "#F2F4F7" },
};

/** Browsers can show these inline; the rest are download-only. */
const PREVIEWABLE: FileKind[] = ["image", "pdf", "text"];

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function FileIconTile({ kind, size = 36 }: { kind: FileKind; size?: number }) {
  const k = KIND[kind];
  const IconCmp = k.icon;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-lg" style={{ width: size, height: size, color: k.fg, backgroundColor: k.bg }}>
      <IconCmp size={Math.round(size * 0.55)} weight="duotone" aria-hidden />
    </span>
  );
}

function download(f: FileRecord) {
  if (!f.url) return;
  const a = Object.assign(document.createElement("a"), { href: f.url, download: f.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Preview for images, PDFs and text; everything else explains why and offers a download. */
export function FilePreview({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const canPreview = !!file.url && PREVIEWABLE.includes(file.kind);
  useEffect(() => {
    if (!file.url || file.kind !== "text") return;
    let live = true;
    fetch(file.url)
      .then((r) => r.text())
      .then((t) => live && setText(t.slice(0, 20_000)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [file.url, file.kind]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-3 rounded-2xl sm:max-w-3xl">
        <div className="flex items-center gap-3 pr-8">
          <FileIconTile kind={file.kind} />
          <div className="min-w-0">
            <DialogTitle className="truncate text-[15px] font-semibold text-ink">{file.name}</DialogTitle>
            <DialogDescription className="text-[12.5px] text-ink-muted">
              {KIND[file.kind].label} · {formatBytes(file.size)} · added {formatDate(file.uploadedAt.slice(0, 10))}
            </DialogDescription>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-[#F7F7FA]">
          {!file.url ? (
            <EmptyState icon={InfoIcon} title="Sample record" hint="This file is part of the sample data, so there's no content to show or download in this preview." />
          ) : failed ? (
            <ErrorState title="Couldn't read this file" hint="It may have been removed from this browser tab." />
          ) : !canPreview ? (
            <EmptyState icon={FileIcon} title="No preview for this file type" hint="Your browser can't display it here. Download it to open it in another app." />
          ) : file.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
            <img src={file.url} alt={file.name} className="mx-auto max-h-[65dvh] object-contain" />
          ) : file.kind === "pdf" ? (
            <iframe src={file.url} title={file.name} className="h-[65dvh] w-full" />
          ) : (
            <pre className="max-h-[65dvh] p-4 text-[12.5px] leading-5 whitespace-pre-wrap text-ink-body">{text ?? "Loading…"}</pre>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {file.url && (
            <OutlineButton icon={ArrowSquareOutIcon} onClick={() => window.open(file.url!, "_blank", "noopener")}>
              Open in new tab
            </OutlineButton>
          )}
          <PrimaryButton icon={DownloadSimpleIcon} disabled={!file.url} onClick={() => download(file)} title={file.url ? undefined : "Sample records have no content"}>
            Download
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const update = useUpdateFile();
  const [name, setName] = useState(file.name);
  const [error, setError] = useState("");
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Rename file"
      submitLabel="Rename"
      pending={update.isPending}
      onSubmit={() =>
        update.mutate(
          { id: file.id, changes: { name } },
          {
            onSuccess: (f) => {
              toast.success("File renamed", { description: f.name });
              onClose();
            },
            onError: (err) => setError(err.message),
          },
        )
      }
    >
      <FormField label="File name" htmlFor="fr-name" error={error}>
        <input
          id="fr-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          className={fieldClass}
          autoFocus
        />
      </FormField>
    </FormDialog>
  );
}

function ProjectDialog({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const update = useUpdateFile();
  const { data } = useProjects(DEFAULT_PROJECT_QUERY);
  const [projectId, setProjectId] = useState(file.projectId ?? "none");
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Link to a project"
      description={file.name}
      submitLabel="Save"
      pending={update.isPending}
      onSubmit={() =>
        update.mutate(
          { id: file.id, changes: { projectId: projectId === "none" ? null : projectId } },
          {
            onSuccess: () => {
              toast.success("File updated", { description: projectId === "none" ? "No longer linked to a project" : `Now in ${data?.items.find((p) => p.id === projectId)?.name}` });
              onClose();
            },
            onError: (err) => toast.error("Couldn't update the file", { description: err.message }),
          },
        )
      }
    >
      <FormField label="Project" htmlFor="fp-project">
        <SelectField id="fp-project" value={projectId} onChange={setProjectId} options={[{ value: "none", label: "No project" }, ...(data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
      </FormField>
    </FormDialog>
  );
}

function FileMenu({ file, onPreview, onRename, onProject, onDelete }: { file: FileRecord; onPreview: () => void; onRename: () => void; onProject: () => void; onDelete: () => void }) {
  const bm = useBookmark("file", file.id, file.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Actions for ${file.name}`}>
          <DotsThreeVerticalIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem onSelect={onPreview}>
          <EyeIcon aria-hidden /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!file.url} onSelect={() => download(file)}>
          <DownloadSimpleIcon aria-hidden /> {file.url ? "Download" : "Download (sample — no content)"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <PencilSimpleIcon aria-hidden /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onProject}>
          <FolderSimpleIcon aria-hidden /> Link to project
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={bm.toggle}>{bm.saved ? "Remove bookmark" : "Bookmark"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <TrashIcon aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type KindFilter = FileKind | "all";

/**
 * Files list with search, type and project filters and add-from-browser.
 * Scoped to one project when `projectId` is given (Project Details → Files).
 */
export function FilesPanel({ projectId, openFileId }: { projectId?: string; openFileId?: string | null }) {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useFiles();
  const { data: projectList } = useProjects(DEFAULT_PROJECT_QUERY);
  const add = useAddFile();
  const remove = useDeleteFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [project, setProject] = useState(projectId ?? "all");
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [renaming, setRenaming] = useState<FileRecord | null>(null);
  const [linking, setLinking] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState<FileRecord | null>(null);
  const [dragging, setDragging] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);

  // Bookmarks link to /files?file=<id>: open that file once it's loaded.
  if (openFileId && data && opened !== openFileId) {
    setOpened(openFileId);
    const f = data.find((x) => x.id === openFileId);
    if (f) setPreview(f);
  }

  const projectName = (id: string | null) => (id ? (projectList?.items.find((p) => p.id === id)?.name ?? null) : null);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (f) => (kind === "all" || f.kind === kind) && (project === "all" || (project === "none" ? !f.projectId : f.projectId === project)) && (!needle || f.name.toLowerCase().includes(needle)),
    );
  }, [data, q, kind, project]);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const target = projectId ?? (project !== "all" && project !== "none" ? project : null);
    for (const file of Array.from(list)) {
      add.mutate(
        { file, projectId: target },
        {
          onSuccess: (f) => toast.success("File added", { description: `${f.name}${target ? ` · ${projectName(target)}` : ""} · kept in this browser tab only` }),
          onError: (err) => toast.error("Couldn't add the file", { description: err.message }),
        },
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const filtered = !!q || kind !== "all" || (!projectId && project !== "all");

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={onDrop}
      className={cn("rounded-xl transition-shadow", dragging && "ring-2 ring-brand-soft ring-offset-4 ring-offset-[var(--bg-page)]")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search files..." label="Search files" />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <FilterSelect
            label="File type"
            value={kind}
            onChange={setKind}
            options={[{ value: "all", label: "All types" }, ...(Object.keys(KIND) as FileKind[]).filter((k) => k !== "other").map((k) => ({ value: k, label: KIND[k].label }))]}
          />
          {!projectId && (
            <FilterSelect
              label="Project"
              value={project}
              onChange={setProject}
              className="min-w-[160px]"
              options={[{ value: "all", label: "All projects" }, { value: "none", label: "No project" }, ...(projectList?.items ?? []).map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
          <PrimaryButton icon={UploadSimpleIcon} onClick={() => inputRef.current?.click()} disabled={add.isPending}>
            {add.isPending ? "Adding…" : "Add files"}
          </PrimaryButton>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            onChange={(e) => addFiles(e.target.files)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-4 text-ink-muted">
        <InfoIcon size={13} aria-hidden className="mt-px shrink-0" />
        Up to {formatBytes(MAX_FILE_BYTES)} each. Files you add stay in this browser tab only — nothing is uploaded, and they&apos;re cleared when the page reloads.
      </p>

      <div className="mt-3">
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading files">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card">
            <EmptyState
              icon={UploadSimpleIcon}
              title={filtered ? "No files match" : "No files yet"}
              hint={filtered ? "Try a different search or filter." : "Add files with the button above, or drop them here."}
              action={
                filtered ? (
                  <OutlineButton
                    onClick={() => {
                      setQ("");
                      setKind("all");
                      if (!projectId) setProject("all");
                    }}
                  >
                    Clear filters
                  </OutlineButton>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {items.map((f) => (
              <li key={f.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 shadow-card">
                <button type="button" onClick={() => setPreview(f)} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-action" aria-label={`Preview ${f.name}`}>
                  <FileIconTile kind={f.kind} />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setPreview(f)} className="block max-w-full truncate rounded text-left text-[13px] leading-5 font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {f.name}
                  </button>
                  <p className="truncate text-[12px] leading-4 text-ink-muted">
                    {KIND[f.kind].label} · {formatBytes(f.size)} · {formatDate(f.uploadedAt.slice(0, 10))}
                    {!f.url && " · sample"}
                    {!projectId && (
                      <>
                        {" · "}
                        {f.projectId ? (
                          <Link href={projectHref(f.projectId)} className="hover:text-brand">
                            {projectName(f.projectId)}
                          </Link>
                        ) : (
                          "No project"
                        )}
                      </>
                    )}
                  </p>
                </div>
                <PersonChip personId={f.uploaderId} size="xs" className="hidden w-36 md:inline-flex" />
                <FileMenu file={f} onPreview={() => setPreview(f)} onRename={() => setRenaming(f)} onProject={() => setLinking(f)} onDelete={() => setDeleting(f)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
      {renaming && <RenameDialog file={renaming} onClose={() => setRenaming(null)} />}
      {linking && <ProjectDialog file={linking} onClose={() => setLinking(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "file"}?`}
        description="It's removed from Files and from its project."
        confirmLabel="Delete file"
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("File deleted", { description: deleting.name });
              setDeleting(null);
            },
          })
        }
      />
    </div>
  );
}
