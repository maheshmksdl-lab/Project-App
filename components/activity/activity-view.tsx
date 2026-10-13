"use client";

import { Card, PageShell } from "@/components/shared/project-ui";
import { PageHeader } from "@/components/shared/workspace-ui";
import { ActivityFeed } from "./activity-feed";

export function ActivityView() {
  return (
    <PageShell>
      <PageHeader title="Activity" subtitle="Everything that's changed across your projects, newest first." />
      <Card label="Activity" className="mt-5 p-5">
        <ActivityFeed />
      </Card>
    </PageShell>
  );
}
