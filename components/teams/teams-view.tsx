"use client";

import Link from "next/link";
import { PlusIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { AvatarStack } from "@/components/shared/person-avatar";
import { Card, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { PageHeader } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePeople } from "@/hooks/use-projects";
import { useTeams } from "@/hooks/use-workspace";
import { pluralize } from "@/lib/format";
import type { Person } from "@/lib/types/project";

export function TeamsView() {
  const hydrated = useHydrated();
  const { data: teams } = useTeams();
  const { data: people } = usePeople();
  const { openTeam } = useAppDialogs();
  const byId = (ids: string[]) => ids.map((id) => people?.find((p) => p.id === id)).filter((p): p is Person => !!p);

  return (
    <PageShell>
      <PageHeader
        title="Teams"
        subtitle="The people behind your projects, grouped the way they work."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => openTeam()}>
            Create team
          </PrimaryButton>
        }
      />
      <div className="mt-5">
        {!hydrated || !teams ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <EmptyState icon={UsersThreeIcon} title="No teams yet" hint="Create a team to group people and projects." />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => {
              const lead = people?.find((p) => p.id === t.leadId);
              const members = byId(t.memberIds);
              return (
                <li key={t.id}>
                  <Link href={`/teams/${t.id}`} className="flex h-full flex-col rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-soft focus-visible:outline-2 focus-visible:outline-brand-action">
                    <span className="flex items-center gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold" style={{ color: t.fg, backgroundColor: t.bg }} aria-hidden>
                        {t.short}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] leading-5 font-semibold text-ink">{t.name}</span>
                        <span className="block truncate text-[12px] leading-4 text-ink-muted">{lead ? `Led by ${lead.name}` : "No lead"}</span>
                      </span>
                    </span>
                    <span className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-5 text-ink-body">{t.description || "No description."}</span>
                    <span className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[12px] text-ink-muted">
                      <span>
                        {pluralize(t.memberIds.length, "member")} · {pluralize(t.projectIds.length, "project")}
                      </span>
                      <AvatarStack people={members.slice(0, 4)} extra={Math.max(0, members.length - 4)} size="xs" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
