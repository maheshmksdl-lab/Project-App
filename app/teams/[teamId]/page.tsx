import type { Metadata } from "next";
import { TeamView } from "@/components/teams/team-view";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/teams/[teamId]">) {
  const { teamId } = await params;
  return <TeamView teamId={decodeURIComponent(teamId)} />;
}
