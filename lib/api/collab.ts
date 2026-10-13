/**
 * Mock API for notes, files, project discussions and bookmarks. In memory;
 * everything resets when the page reloads. Files added from the browser live
 * only as object URLs in this tab — nothing is uploaded anywhere.
 */
import { CURRENT_USER_ID } from "@/lib/mock-data/people";
import type { Bookmark, BookmarkType, Comment, FileKind, FileRecord, Note } from "@/lib/types/workspace";
import { logActivity } from "./activity";
import { delay, newId } from "./mock";
import { projectsSnapshot, tasksSnapshot } from "./projects";
import { workflowsSnapshot } from "./workflows";
import { teamsSnapshot, templatesSnapshot } from "./workspace";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const DAY = 60 * 24;
const projectName = (id: string | null) => (id ? projectsSnapshot().find((p) => p.id === id)?.name : undefined);

// ── Notes ────────────────────────────────────────────────────────────

let notes: Note[] = [
  {
    id: "note-erp-brief",
    title: "ERP cutover checklist",
    body: "Freeze master data two weeks before go-live.\nConfirm the rollback plan with Finance.\nSchedule hypercare rota for the first two weeks.",
    projectId: "erp-implementation",
    authorId: "usr-nikhil",
    createdAt: ago(DAY * 9),
    updatedAt: ago(DAY * 2),
  },
  {
    id: "note-portal-feedback",
    title: "Portal beta feedback",
    body: "Customers want invoice download from the dashboard.\nSearch should include order numbers.\nMobile navigation felt crowded — revisit the tab bar.",
    projectId: "customer-portal",
    authorId: "usr-nikhil",
    createdAt: ago(DAY * 5),
    updatedAt: ago(DAY * 1),
  },
  {
    id: "note-weekly",
    title: "Weekly priorities",
    body: "Unblock the warehouse racking contract.\nPrepare the portfolio review deck.\nOne-to-ones with Sarah and John.",
    projectId: null,
    authorId: "usr-nikhil",
    createdAt: ago(DAY * 3),
    updatedAt: ago(90),
  },
];

export async function listNotes(): Promise<Note[]> {
  await delay(60);
  return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveNote(input: { id?: string; title: string; body: string; projectId: string | null }): Promise<Note> {
  await delay(60);
  const now = new Date().toISOString();
  const clean = { title: input.title.trim(), body: input.body, projectId: input.projectId };
  if (input.id) {
    const note = notes.find((n) => n.id === input.id);
    if (!note) throw new Error("This note was deleted");
    Object.assign(note, clean, { updatedAt: now });
    if (note.projectId) logActivity({ projectId: note.projectId, type: "note", action: "edited the note", target: note.title });
    return { ...note };
  }
  const note: Note = { id: newId("note"), ...clean, authorId: CURRENT_USER_ID, createdAt: now, updatedAt: now };
  notes = [note, ...notes];
  if (note.projectId) logActivity({ projectId: note.projectId, type: "note", action: "added the note", target: note.title });
  return { ...note };
}

export async function deleteNote(id: string): Promise<void> {
  await delay(50);
  const note = notes.find((n) => n.id === id);
  notes = notes.filter((n) => n.id !== id);
  bookmarks = bookmarks.filter((b) => !(b.type === "note" && b.refId === id));
  if (note?.projectId) logActivity({ projectId: note.projectId, type: "note", action: "deleted the note", target: note.title });
}

// ── Files ────────────────────────────────────────────────────────────

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EXT_KIND: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image",
  pdf: "pdf",
  doc: "document", docx: "document", rtf: "document", odt: "document",
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", ods: "spreadsheet",
  ppt: "presentation", pptx: "presentation", key: "presentation", odp: "presentation",
  txt: "text", md: "text", json: "text",
  zip: "archive",
  fig: "design", sketch: "design", xd: "design",
};

export const ACCEPTED_EXTENSIONS = Object.keys(EXT_KIND);

export const fileKindOf = (name: string): FileKind | null => EXT_KIND[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;

let files: FileRecord[] = [
  { id: "file-req", name: "Requirements document.docx", kind: "document", mime: "", size: 482_000, projectId: "erp-implementation", uploaderId: "usr-anna", uploadedAt: ago(DAY * 30), url: null },
  { id: "file-design", name: "Design files.fig", kind: "design", mime: "", size: 12_400_000, projectId: "erp-implementation", uploaderId: "usr-sarah", uploadedAt: ago(DAY * 21), url: null },
  { id: "file-migration", name: "Data migration plan.xlsx", kind: "spreadsheet", mime: "", size: 96_000, projectId: "erp-implementation", uploaderId: "usr-nikhil", uploadedAt: ago(DAY * 4), url: null },
  { id: "file-wireframes", name: "Wireframes.fig", kind: "design", mime: "", size: 8_200_000, projectId: "customer-portal", uploaderId: "usr-sarah", uploadedAt: ago(60), url: null },
  { id: "file-site-plan", name: "Site plan.pdf", kind: "pdf", mime: "application/pdf", size: 2_300_000, projectId: "warehouse-expansion", uploaderId: "usr-marcus", uploadedAt: ago(DAY * 12), url: null },
  { id: "file-campaign", name: "Campaign results.pptx", kind: "presentation", mime: "", size: 5_600_000, projectId: "marketing-campaign-q3", uploaderId: "usr-olivia", uploadedAt: ago(DAY * 8), url: null },
];

export async function listFiles(): Promise<FileRecord[]> {
  await delay(60);
  return [...files].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Validates and keeps a file picked in the browser for this tab only (object URL; nothing leaves the browser). */
export async function addFile(file: File, projectId: string | null): Promise<FileRecord> {
  await delay(120);
  const kind = fileKindOf(file.name);
  if (!kind) throw new Error(`${file.name}: this file type isn't supported`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: files can be up to 10 MB`);
  if (file.size === 0) throw new Error(`${file.name} is empty`);
  const record: FileRecord = {
    id: newId("file"),
    name: file.name,
    kind,
    mime: file.type,
    size: file.size,
    projectId,
    uploaderId: CURRENT_USER_ID,
    uploadedAt: new Date().toISOString(),
    url: URL.createObjectURL(file),
  };
  files = [record, ...files];
  if (projectId) logActivity({ projectId, type: "file", action: "uploaded", target: record.name });
  return record;
}

export async function updateFile(id: string, changes: { name?: string; projectId?: string | null }): Promise<FileRecord> {
  await delay(50);
  const f = files.find((x) => x.id === id);
  if (!f) throw new Error("This file was removed");
  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) throw new Error("Enter a file name");
    if (/[\\/:*?"<>|]/.test(name)) throw new Error('File names can\'t contain \\ / : * ? " < > |');
    if (name !== f.name) {
      if (f.projectId) logActivity({ projectId: f.projectId, type: "file", action: "renamed", target: name, detail: `Was ${f.name}` });
      f.name = name;
    }
  }
  if (changes.projectId !== undefined && changes.projectId !== f.projectId) {
    if (f.projectId) logActivity({ projectId: f.projectId, type: "file", action: "moved out", target: f.name, detail: projectName(changes.projectId) ? `To ${projectName(changes.projectId)}` : undefined });
    if (changes.projectId) logActivity({ projectId: changes.projectId, type: "file", action: "added", target: f.name, detail: projectName(f.projectId) ? `From ${projectName(f.projectId)}` : undefined });
    f.projectId = changes.projectId;
  }
  return { ...f };
}

export async function deleteFile(id: string): Promise<void> {
  await delay(50);
  const f = files.find((x) => x.id === id);
  if (f?.url) URL.revokeObjectURL(f.url);
  files = files.filter((x) => x.id !== id);
  bookmarks = bookmarks.filter((b) => !(b.type === "file" && b.refId === id));
  if (f?.projectId) logActivity({ projectId: f.projectId, type: "file", action: "deleted", target: f.name });
}

// ── Discussion ───────────────────────────────────────────────────────

let comments: Comment[] = [
  { id: "cmt-1", projectId: "erp-implementation", authorId: "usr-anna", body: "Data migration dry run finished — 98.6% of records matched. The remaining mismatches are all legacy cost centres.", parentId: null, createdAt: ago(180) },
  { id: "cmt-2", projectId: "erp-implementation", authorId: "usr-john", body: "I can map the legacy cost centres this week. Can Finance confirm the target codes?", parentId: "cmt-1", createdAt: ago(150) },
  { id: "cmt-3", projectId: "erp-implementation", authorId: "usr-mike", body: "Confirmed — I've shared the mapping sheet in Files.", parentId: "cmt-1", createdAt: ago(95) },
  { id: "cmt-4", projectId: "customer-portal", authorId: "usr-sarah", body: "Wireframes for the billing flow are uploaded. Feedback welcome before Thursday's review.", parentId: null, createdAt: ago(60) },
  { id: "cmt-5", projectId: "warehouse-expansion", authorId: "usr-marcus", body: "Racking supplier is waiting on the signed contract — this is what's blocking the project.", parentId: null, createdAt: ago(DAY + 120) },
];

export async function listComments(projectId: string): Promise<Comment[]> {
  await delay(60);
  return comments.filter((c) => c.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addComment(input: { projectId: string; body: string; parentId: string | null }): Promise<Comment> {
  await delay(60);
  const body = input.body.trim();
  if (body.length < 2) throw new Error("Write a little more");
  if (input.parentId && !comments.some((c) => c.id === input.parentId)) throw new Error("The comment you replied to was deleted");
  const c: Comment = { id: newId("cmt"), projectId: input.projectId, authorId: CURRENT_USER_ID, body, parentId: input.parentId, createdAt: new Date().toISOString() };
  comments = [...comments, c];
  logActivity({ projectId: input.projectId, type: "comment", action: input.parentId ? "replied in" : "commented on", target: projectName(input.projectId) ?? "the project" });
  return c;
}

export async function editComment(id: string, body: string): Promise<void> {
  await delay(50);
  const c = comments.find((x) => x.id === id);
  if (!c) throw new Error("This comment was deleted");
  if (c.authorId !== CURRENT_USER_ID) throw new Error("You can only edit your own comments");
  if (body.trim().length < 2) throw new Error("Write a little more");
  c.body = body.trim();
  c.editedAt = new Date().toISOString();
}

/** Deleting a comment also removes its replies. */
export async function deleteComment(id: string): Promise<void> {
  await delay(50);
  const c = comments.find((x) => x.id === id);
  if (!c) return;
  if (c.authorId !== CURRENT_USER_ID) throw new Error("You can only delete your own comments");
  comments = comments.filter((x) => x.id !== id && x.parentId !== id);
  logActivity({ projectId: c.projectId, type: "comment", action: "deleted a comment in", target: projectName(c.projectId) ?? "the project" });
}

// ── Bookmarks ────────────────────────────────────────────────────────

let bookmarks: Bookmark[] = [
  { id: "bm-1", type: "project", refId: "erp-implementation", createdAt: ago(DAY * 6) },
  { id: "bm-2", type: "workflow", refId: "wf-budget-review", createdAt: ago(DAY * 4) },
  { id: "bm-3", type: "template", refId: "tpl-agile-product", createdAt: ago(DAY * 3) },
  { id: "bm-4", type: "report", refId: "reports", createdAt: ago(DAY * 2) },
  { id: "bm-5", type: "note", refId: "note-erp-brief", createdAt: ago(DAY) },
];

export async function listBookmarkKeys(): Promise<string[]> {
  await delay(30);
  return bookmarks.map((b) => `${b.type}:${b.refId}`);
}

export async function toggleBookmark(type: BookmarkType, refId: string): Promise<boolean> {
  await delay(40);
  const exists = bookmarks.some((b) => b.type === type && b.refId === refId);
  bookmarks = exists ? bookmarks.filter((b) => !(b.type === type && b.refId === refId)) : [{ id: newId("bm"), type, refId, createdAt: new Date().toISOString() }, ...bookmarks];
  return !exists;
}

export interface ResolvedBookmark {
  bookmark: Bookmark;
  title: string;
  subtitle: string;
  /** Null when the record has been deleted. */
  href: string | null;
}

const REPORT_PAGES: Record<string, { title: string; href: string }> = {
  reports: { title: "Reports", href: "/reports" },
  portfolio: { title: "Portfolio", href: "/portfolio" },
  calendar: { title: "Calendar", href: "/calendar" },
};

/** Bookmarks with the current name of each saved record (looked up by id, so renames carry through). */
export async function listBookmarks(): Promise<ResolvedBookmark[]> {
  await delay(60);
  const projects = projectsSnapshot();
  const tasks = tasksSnapshot();
  const workflows = workflowsSnapshot();
  const templates = templatesSnapshot();
  const teams = teamsSnapshot();
  return bookmarks.map((bookmark) => {
    const gone = { bookmark, title: "Deleted item", subtitle: "This record no longer exists", href: null };
    const { type, refId } = bookmark;
    if (type === "project") {
      const p = projects.find((x) => x.id === refId);
      return p ? { bookmark, title: p.name, subtitle: p.description, href: `/projects/${encodeURIComponent(p.id)}` } : gone;
    }
    if (type === "task") {
      const t = tasks.find((x) => x.task.id === refId);
      return t ? { bookmark, title: t.task.title, subtitle: t.project.name, href: `/projects/${encodeURIComponent(t.project.id)}?tab=tasks&task=${encodeURIComponent(refId)}` } : gone;
    }
    if (type === "workflow") {
      const w = workflows.find((x) => x.id === refId);
      return w ? { bookmark, title: w.name, subtitle: w.description, href: `/workflows/${w.id}` } : gone;
    }
    if (type === "template") {
      const t = templates.find((x) => x.id === refId);
      return t ? { bookmark, title: t.name, subtitle: t.description, href: `/templates?preview=${t.id}` } : gone;
    }
    if (type === "note") {
      const n = notes.find((x) => x.id === refId);
      return n ? { bookmark, title: n.title, subtitle: projectName(n.projectId) ?? "Personal note", href: `/notes?note=${n.id}` } : gone;
    }
    if (type === "file") {
      const f = files.find((x) => x.id === refId);
      return f ? { bookmark, title: f.name, subtitle: projectName(f.projectId) ?? "No project", href: `/files?file=${f.id}` } : gone;
    }
    if (type === "team") {
      const t = teams.find((x) => x.id === refId);
      return t ? { bookmark, title: t.name, subtitle: t.description, href: `/teams/${t.id}` } : gone;
    }
    const page = REPORT_PAGES[refId];
    return page ? { bookmark, title: page.title, subtitle: "Page", href: page.href } : gone;
  });
}

