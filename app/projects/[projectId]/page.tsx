import { redirect } from "next/navigation";
import { projectHref } from "@/lib/routes";

/** Old project links: projects open in the panel beside the list. */
export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  redirect(projectHref(decodeURIComponent(projectId)));
}
