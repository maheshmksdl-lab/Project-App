"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProjectsListHref } from "@/lib/routes";
import { ProjectPanel } from "./project-panel";

/** The Project Details page: one project, full width. Closing it returns to the Projects list as it was left. */
export function ProjectDetailsView({ projectId, initialTab, openTaskId }: { projectId: string; initialTab?: string; openTaskId?: string }) {
  const router = useRouter();
  const backToList = useCallback(() => router.push(getProjectsListHref()), [router]);
  return (
    <div className="flex-1 bg-[#F7F7FA]">
      <ProjectPanel key={`${projectId}:${initialTab ?? ""}`} projectId={projectId} onClose={backToList} initialTab={initialTab} openTaskId={openTaskId} />
    </div>
  );
}
