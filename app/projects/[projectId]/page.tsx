import type { Metadata } from "next";
import { ProjectDetailsView } from "@/components/projects/project-details-view";

export const metadata: Metadata = { title: "Project details" };

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  // ?tab=discussion opens a tab; ?task=<id> opens a task (links from notifications and bookmarks).
  const { tab, task } = await searchParams;
  return <ProjectDetailsView projectId={decodeURIComponent(projectId)} initialTab={typeof tab === "string" ? tab : undefined} openTaskId={typeof task === "string" ? task : undefined} />;
}
