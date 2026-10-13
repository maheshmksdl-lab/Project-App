"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { InsightsSheet } from "@/components/layout/insights";
import { LogoutDialog } from "@/components/layout/session";
import { WhatsNewSheet } from "@/components/layout/whats-new";
import { DuplicateProjectDialog, LinkDialog, MoveToFolderDialog, ProjectSettingsDialog, TaskDialog } from "@/components/projects/project-dialogs";
import { MemberDialog, TeamDialog } from "@/components/teams/team-dialogs";
import type { ProjectLink } from "@/lib/types/project";

type Open =
  | { kind: "task"; taskId: string }
  | { kind: "projectSettings"; projectId: string }
  | { kind: "duplicate"; projectId: string; name: string }
  | { kind: "move"; projectId: string; name: string; folderId: string | null }
  | { kind: "link"; projectId: string; link: ProjectLink | null }
  | { kind: "team"; teamId?: string }
  | { kind: "member"; personId: string }
  | { kind: "logout" }
  | { kind: "whatsNew" }
  | { kind: "insights" };

interface AppDialogs {
  openTask: (taskId: string) => void;
  openProjectSettings: (projectId: string) => void;
  openDuplicateProject: (project: { id: string; name: string }) => void;
  openMoveToFolder: (project: { id: string; name: string; folderId?: string | null }) => void;
  openLink: (projectId: string, link: ProjectLink | null) => void;
  openTeam: (teamId?: string) => void;
  openMember: (personId: string) => void;
  openLogout: () => void;
  openWhatsNew: () => void;
  openInsights: () => void;
}

const Ctx = createContext<AppDialogs | null>(null);

export function useAppDialogs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppDialogs must be used inside AppDialogsProvider");
  return ctx;
}

/** Hosts the app-wide dialogs and panels (task, project settings, teams, account …) so any page or menu can open them. */
export function AppDialogsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [session, setSession] = useState(0);
  const show = useCallback((o: Open) => {
    setSession((s) => s + 1);
    setOpen(o);
  }, []);
  const close = useCallback(() => setOpen(null), []);
  const api = useMemo<AppDialogs>(
    () => ({
      openTask: (taskId) => show({ kind: "task", taskId }),
      openProjectSettings: (projectId) => show({ kind: "projectSettings", projectId }),
      openDuplicateProject: (p) => show({ kind: "duplicate", projectId: p.id, name: p.name }),
      openMoveToFolder: (p) => show({ kind: "move", projectId: p.id, name: p.name, folderId: p.folderId ?? null }),
      openLink: (projectId, link) => show({ kind: "link", projectId, link }),
      openTeam: (teamId) => show({ kind: "team", teamId }),
      openMember: (personId) => show({ kind: "member", personId }),
      openLogout: () => show({ kind: "logout" }),
      openWhatsNew: () => show({ kind: "whatsNew" }),
      openInsights: () => show({ kind: "insights" }),
    }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {open?.kind === "task" && <TaskDialog key={session} taskId={open.taskId} onClose={close} />}
      {open?.kind === "projectSettings" && <ProjectSettingsDialog key={session} projectId={open.projectId} onClose={close} />}
      {open?.kind === "duplicate" && <DuplicateProjectDialog key={session} projectId={open.projectId} projectName={open.name} onClose={close} />}
      {open?.kind === "move" && <MoveToFolderDialog key={session} projectId={open.projectId} projectName={open.name} currentFolderId={open.folderId} onClose={close} />}
      {open?.kind === "link" && <LinkDialog key={session} projectId={open.projectId} link={open.link} onClose={close} />}
      {open?.kind === "team" && <TeamDialog key={session} teamId={open.teamId} onClose={close} />}
      {open?.kind === "member" && <MemberDialog key={session} personId={open.personId} onClose={close} />}
      {open?.kind === "logout" && <LogoutDialog key={session} onClose={close} />}
      {open?.kind === "whatsNew" && <WhatsNewSheet key={session} onClose={close} />}
      {open?.kind === "insights" && <InsightsSheet key={session} onClose={close} />}
    </Ctx.Provider>
  );
}
