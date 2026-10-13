import type { Metadata } from "next";
import { WorkflowDetailView } from "@/components/workflows/workflow-detail-view";

export const metadata: Metadata = { title: "Workflow" };

export default async function WorkflowPage({ params }: PageProps<"/workflows/[workflowId]">) {
  const { workflowId } = await params;
  return <WorkflowDetailView workflowId={decodeURIComponent(workflowId)} />;
}
