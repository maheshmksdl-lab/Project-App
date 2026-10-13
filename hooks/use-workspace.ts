"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activitySnapshot } from "@/lib/api/activity";
import {
  addComment,
  addFile,
  deleteComment,
  deleteFile,
  deleteNote,
  editComment,
  listBookmarkKeys,
  listBookmarks,
  listComments,
  listFiles,
  listNotes,
  saveNote,
  toggleBookmark,
  updateFile,
} from "@/lib/api/collab";
import {
  createFolder,
  createProject,
  createTask,
  deleteTask,
  duplicateProject,
  listFolders,
  moveProjectToFolder,
  removeLink,
  saveLink,
  setProjectStatus,
  tasksSnapshot,
  updateProject,
  updateTask,
  type DuplicateOptions,
  type NewProject,
  type NewTask,
  type ProjectChanges,
  type TaskChanges,
} from "@/lib/api/projects";
import {
  advanceRun,
  createApproval,
  createWorkflow,
  decideApproval,
  deleteWorkflow,
  duplicateWorkflow,
  getWorkflow,
  listApprovals,
  listWorkflows,
  runWorkflow,
  setWorkflowStatus,
  updateWorkflow,
  type NewApproval,
} from "@/lib/api/workflows";
import {
  createMeeting,
  createProjectFromTemplate,
  createTeam,
  deleteMeeting,
  deleteTeam,
  deleteTemplate,
  getProfile,
  getReportData,
  getSettings,
  getTeam,
  inviteMember,
  listCalendarEvents,
  listTeams,
  listTemplates,
  revokeInvite,
  saveProjectAsTemplate,
  setMemberRole,
  setPersonTeams,
  setProjectTeams,
  updateProfile,
  updateSettings,
  updateTeam,
  type TeamInput,
} from "@/lib/api/workspace";
import type { ApprovalFilter, InviteFormValues, WorkflowFormValues, WorkflowQuery } from "@/lib/schemas/workspace";
import type { ProjectStatus } from "@/lib/types/project";
import type { BookmarkType, MemberRole, WorkflowStatus, WorkspaceSettings } from "@/lib/types/workspace";

export const workspaceKeys = {
  workflows: ["workflows"] as const,
  workflowList: (q: object) => ["workflows", "list", q] as const,
  workflow: (id: string) => ["workflows", "detail", id] as const,
  approvals: (q: object) => ["approvals", q] as const,
  calendar: (from: string, to: string) => ["calendar", from, to] as const,
  templates: ["templates"] as const,
  team: (id: string) => ["teams", id] as const,
  reports: ["reports"] as const,
  settings: ["settings"] as const,
};

/**
 * Projects, tasks, workflows and approvals feed each other (the calendar, reports,
 * team pages, Home), so a change anywhere refreshes every view built on them.
 */
function useRefreshAll() {
  const qc = useQueryClient();
  // Not awaited: the caller's onSuccess (toast, close dialog) must run before the
  // refetch can unmount the component that started the mutation.
  return () => {
    void qc.invalidateQueries();
  };
}

// ── Projects & tasks ─────────────────────────────────────────────────

export function useCreateProject() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (input: NewProject) => createProject(input), onSettled: refresh });
}

export function useCreateProjectFromTemplate() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ templateId, input }: { templateId: string; input: NewProject }) => createProjectFromTemplate(templateId, input), onSettled: refresh });
}

export function useSetProjectStatus() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => setProjectStatus(id, status), onSettled: refresh });
}

export function useCreateTask() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (input: NewTask) => createTask(input), onSettled: refresh });
}

// ── Workflows & approvals ────────────────────────────────────────────

export function useWorkflows(query: Pick<WorkflowQuery, "q" | "kind" | "status" | "sort" | "page">) {
  return useQuery({ queryKey: workspaceKeys.workflowList(query), queryFn: () => listWorkflows(query), placeholderData: keepPreviousData });
}

export function useWorkflow(id: string) {
  return useQuery({ queryKey: workspaceKeys.workflow(id), queryFn: () => getWorkflow(id) });
}

export function useSaveWorkflow() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, values, status }: { id?: string; values: WorkflowFormValues; status: WorkflowStatus }) =>
      id ? updateWorkflow(id, values).then(() => ({ id })) : createWorkflow(values, status),
    onSettled: refresh,
  });
}

export function useSetWorkflowStatus() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) => setWorkflowStatus(id, status), onSettled: refresh });
}

export function useDuplicateWorkflow() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => duplicateWorkflow(id), onSettled: refresh });
}

export function useDeleteWorkflow() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => deleteWorkflow(id), onSettled: refresh });
}

export function useRunWorkflow() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => runWorkflow(id), onSettled: refresh });
}

export function useAdvanceRun() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ workflowId, runId }: { workflowId: string; runId: string }) => advanceRun(workflowId, runId), onSettled: refresh });
}

export function useApprovals(query: { filter: ApprovalFilter; q: string; mine: boolean; page: number }) {
  return useQuery({ queryKey: workspaceKeys.approvals(query), queryFn: () => listApprovals(query), placeholderData: keepPreviousData });
}

export function useDecideApproval() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approved" | "rejected"; note: string }) => decideApproval(id, decision, note),
    onSettled: refresh,
  });
}

export function useCreateApproval() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (input: NewApproval) => createApproval(input), onSettled: refresh });
}

// ── Calendar ─────────────────────────────────────────────────────────

export function useCalendarEvents(from: string, to: string) {
  return useQuery({ queryKey: workspaceKeys.calendar(from, to), queryFn: () => listCalendarEvents(from, to), placeholderData: keepPreviousData });
}

export function useCreateMeeting() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: createMeeting, onSettled: refresh });
}

export function useDeleteMeeting() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteMeeting, onSettled: refresh });
}

// ── Templates ────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery({ queryKey: workspaceKeys.templates, queryFn: listTemplates });
}

export function useSaveAsTemplate() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ projectId, name }: { projectId: string; name: string }) => saveProjectAsTemplate(projectId, name), onSettled: refresh });
}

export function useDeleteTemplate() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteTemplate, onSettled: refresh });
}

// ── Teams, reports, settings ─────────────────────────────────────────

export function useTeam(id: string) {
  return useQuery({ queryKey: workspaceKeys.team(id), queryFn: () => getTeam(id) });
}

export function useReportData() {
  return useQuery({ queryKey: workspaceKeys.reports, queryFn: getReportData });
}

export function useSettings() {
  return useQuery({ queryKey: workspaceKeys.settings, queryFn: getSettings });
}

export function useUpdateSettings() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (patch: Partial<Omit<WorkspaceSettings, "members" | "invites">>) => updateSettings(patch), onSettled: refresh });
}

export function useSetMemberRole() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ personId, role }: { personId: string; role: MemberRole }) => setMemberRole(personId, role), onSettled: refresh });
}

export function useInviteMember() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (values: InviteFormValues) => inviteMember(values), onSettled: refresh });
}

export function useRevokeInvite() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: revokeInvite, onSettled: refresh });
}

// ── Teams & profile ──────────────────────────────────────────────────

export function useTeams() {
  return useQuery({ queryKey: ["teams", "list"], queryFn: listTeams });
}

export function useSaveTeam() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: TeamInput }) => (id ? updateTeam(id, input).then(() => ({ id })) : createTeam(input)), onSettled: refresh });
}

export function useDeleteTeam() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteTeam, onSettled: refresh });
}

export function useSetPersonTeams() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ personId, teamIds }: { personId: string; teamIds: string[] }) => setPersonTeams(personId, teamIds), onSettled: refresh });
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: getProfile });
}

export function useUpdateProfile() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: updateProfile, onSettled: refresh });
}

// ── Project actions ──────────────────────────────────────────────────

export function useFolders() {
  return useQuery({ queryKey: ["folders"], queryFn: listFolders });
}

export function useCreateFolder() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: createFolder, onSettled: refresh });
}

export function useMoveToFolder() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ projectId, folderId }: { projectId: string; folderId: string | null }) => moveProjectToFolder(projectId, folderId), onSettled: refresh });
}

export function useDuplicateProject() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ sourceId, opts }: { sourceId: string; opts: DuplicateOptions }) => duplicateProject(sourceId, opts), onSettled: refresh });
}

/** Project Settings: the project's own fields, then which teams it belongs to. */
export function useUpdateProject() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: async ({ id, changes, teamIds }: { id: string; changes: ProjectChanges; teamIds: string[] }) => {
      await updateProject(id, changes);
      await setProjectTeams(id, teamIds);
    },
    onSettled: refresh,
  });
}

export function useUpdateTask() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ taskId, changes }: { taskId: string; changes: TaskChanges }) => updateTask(taskId, changes), onSettled: refresh });
}

export function useDeleteTask() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteTask, onSettled: refresh });
}

export function useSaveLink() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ projectId, link }: { projectId: string; link: { id?: string; label: string; href: string } }) => saveLink(projectId, link), onSettled: refresh });
}

export function useRemoveLink() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ projectId, linkId }: { projectId: string; linkId: string }) => removeLink(projectId, linkId), onSettled: refresh });
}

// ── Notes, files, discussion, bookmarks, activity ────────────────────

export function useNotes() {
  return useQuery({ queryKey: ["notes"], queryFn: listNotes });
}

export function useSaveNote() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: saveNote, onSettled: refresh });
}

export function useDeleteNote() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteNote, onSettled: refresh });
}

export function useFiles() {
  return useQuery({ queryKey: ["files"], queryFn: listFiles });
}

export function useAddFile() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ file, projectId }: { file: File; projectId: string | null }) => addFile(file, projectId), onSettled: refresh });
}

export function useUpdateFile() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ id, changes }: { id: string; changes: { name?: string; projectId?: string | null } }) => updateFile(id, changes), onSettled: refresh });
}

export function useDeleteFile() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteFile, onSettled: refresh });
}

export function useComments(projectId: string) {
  return useQuery({ queryKey: ["comments", projectId], queryFn: () => listComments(projectId) });
}

export function useAddComment() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: addComment, onSettled: refresh });
}

export function useEditComment() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: string }) => editComment(id, body), onSettled: refresh });
}

export function useDeleteComment() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: deleteComment, onSettled: refresh });
}

export function useBookmarkKeys() {
  return useQuery({ queryKey: ["bookmarks", "keys"], queryFn: listBookmarkKeys });
}

export function useBookmarks() {
  return useQuery({ queryKey: ["bookmarks", "list"], queryFn: listBookmarks });
}

export function useToggleBookmark() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: ({ type, refId }: { type: BookmarkType; refId: string }) => toggleBookmark(type, refId), onSettled: refresh });
}

export function useActivity(projectId?: string) {
  return useQuery({ queryKey: ["activity", projectId ?? "all"], queryFn: async () => activitySnapshot(projectId) });
}

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: async () => tasksSnapshot() });
}
