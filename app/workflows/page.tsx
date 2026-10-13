import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkflowsFallback, WorkflowsView } from "@/components/workflows/workflows-view";

export const metadata: Metadata = { title: "Workflows" };

export default function WorkflowsPage() {
  return (
    // Tabs, search and filters live in the URL, so the page renders on the client inside Suspense.
    <Suspense fallback={<WorkflowsFallback />}>
      <WorkflowsView />
    </Suspense>
  );
}
