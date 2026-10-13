import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectsView, ProjectsViewFallback } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    // The list reads its state from the URL, so it renders on the client inside Suspense.
    <Suspense fallback={<ProjectsViewFallback />}>
      <ProjectsView />
    </Suspense>
  );
}
