import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectsView, ProjectsViewFallback } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    // The list and the open project read their state from the URL, so they render on the client inside Suspense.
    <Suspense fallback={<ProjectsViewFallback />}>
      <ProjectsView />
    </Suspense>
  );
}
