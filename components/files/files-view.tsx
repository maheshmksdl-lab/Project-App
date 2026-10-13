"use client";

import { PageShell } from "@/components/shared/project-ui";
import { PageHeader } from "@/components/shared/workspace-ui";
import { FilesPanel } from "./files-panel";

export function FilesView({ openFileId }: { openFileId: string | null }) {
  return (
    <PageShell>
      <PageHeader title="Files" subtitle="Documents, designs and other files across your projects." />
      <div className="mt-5">
        <FilesPanel openFileId={openFileId} />
      </div>
    </PageShell>
  );
}
