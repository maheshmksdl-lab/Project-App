"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquareIcon,
  CompassIcon,
  DotsThreeIcon,
  FolderOpenIcon,
  PencilSimpleIcon,
  SealCheckIcon,
  TrashIcon,
  TreeStructureIcon,
  UserPlusIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { BarList } from "@/components/shared/chart-ui";
import { useCreate } from "@/components/shared/create-dialogs";
import { AvatarStack } from "@/components/shared/person-avatar";
import { Card, CardHeader, IconButton, OutlineButton, PageShell, PrimaryButton, ProgressBar, StatusPill, ViewAll } from "@/components/shared/project-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { BackLink, ConfirmDialog, PersonChip, StatTile, ToneBadge } from "@/components/shared/workspace-ui";
import { ProjectThumb } from "@/components/projects/project-thumb";
import { ApprovalCard } from "@/components/workflows/approval-card";
import { useHydrated } from "@/hooks/use-hydrated";
import { useDeleteTeam, useSetPersonTeams, useTeam, useTeams } from "@/hooks/use-workspace";
import { todayIso } from "@/lib/api/mock";
import { formatDate, pluralize } from "@/lib/format";
import { personById } from "@/lib/mock-data/people";
import { ACCENT, PRIORITY_META } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import type { Person } from "@/lib/types/project";
import { RECURRENCE_LABEL, WORKFLOW_STATUS_META } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/project-ui";

const people = (ids: string[]) => ids.map(personById).filter((p): p is Person => !!p);

export function TeamView({ teamId }: { teamId: string }) {
  const hydrated = useHydrated();
  const { data, isPending, isError, refetch } = useTeam(teamId);
  const { openCreateTask, openRequestApproval } = useCreate();
  const { openTeam, openMember } = useAppDialogs();
  const { data: allTeams } = useTeams();
  const router = useRouter();
  const removeTeam = useDeleteTeam();
  const setPersonTeams = useSetPersonTeams();
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<Person | null>(null);

  if (isError) {
    return (
      <PageShell>
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      </PageShell>
    );
  }
  if (isPending || !hydrated) {
    return (
      <PageShell>
        <div aria-busy="true" aria-label="Loading team">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[78px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-80 rounded-xl" />
        </div>
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell>
        <EmptyState
          icon={CompassIcon}
          title="This team isn't available"
          hint="It may have been removed, or the link is wrong."
          action={
            <Link href="/home" className="text-[13px] font-medium text-brand hover:text-brand-press">
              Go to Home
            </Link>
          }
        />
      </PageShell>
    );
  }

  const { team, projects, members, workflows, approvals, upcoming } = data;
  const today = todayIso();
  const openTasks = members.reduce((n, m) => n + m.openTasks, 0);
  const lead = personById(team.leadId);

  return (
    <PageShell>
      <BackLink href="/teams" label="Teams" />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-[16px] font-semibold" style={{ color: team.fg, backgroundColor: team.bg }} aria-hidden>
            {team.short}
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] leading-9 font-bold tracking-[-0.01em] text-ink sm:text-[28px]">{team.name}</h1>
            <p className="mt-0.5 max-w-2xl text-[14px] leading-5 text-ink-muted">{team.description}</p>
            {lead && <p className="mt-2 text-[12.5px] text-ink-body">Led by {lead.name}</p>}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <OutlineButton icon={SealCheckIcon} onClick={() => openRequestApproval({ projectId: team.projectIds[0] })}>
            Request approval
          </OutlineButton>
          <PrimaryButton icon={CheckSquareIcon} onClick={() => openCreateTask({ projectId: team.projectIds[0] })}>
            New task
          </PrimaryButton>
          <BookmarkButton type="team" refId={team.id} label={team.name} className="size-9 border border-line bg-white" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="Team actions" className="size-9 border border-line bg-white">
                <DotsThreeIcon size={20} weight="bold" aria-hidden />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onSelect={() => openTeam(team.id)}>
                <PencilSimpleIcon aria-hidden /> Edit team
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openTeam(team.id)}>
                <UserPlusIcon aria-hidden /> Add or remove members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                <TrashIcon aria-hidden /> Delete team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${team.name}?`}
        description="The team is removed from the sidebar. Its people and projects aren't deleted."
        confirmLabel="Delete team"
        pending={removeTeam.isPending}
        onConfirm={() =>
          removeTeam.mutate(team.id, {
            onSuccess: () => {
              toast.success("Team deleted", { description: team.name });
              setDeleting(false);
              router.push("/teams");
            },
            onError: (err) => {
              setDeleting(false);
              toast.error("Couldn't delete the team", { description: err.message });
            },
          })
        }
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this person"} from ${team.name}?`}
        description="They stay in the workspace and keep their tasks; they just leave this team."
        confirmLabel="Remove from team"
        pending={setPersonTeams.isPending}
        onConfirm={() => {
          if (!removing) return;
          const teamIds = (allTeams ?? []).filter((t) => t.memberIds.includes(removing.id) && t.id !== team.id).map((t) => t.id);
          setPersonTeams.mutate(
            { personId: removing.id, teamIds },
            {
              onSuccess: () => {
                toast.success("Removed from team", { description: `${removing.name} · ${team.name}` });
                setRemoving(null);
              },
              onError: (err) => {
                setRemoving(null);
                toast.error("Couldn't remove them", { description: err.message });
              },
            },
          );
        }}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UsersThreeIcon} fg={team.fg} bg={team.bg} value={members.length} label="Members" />
        <StatTile icon={FolderOpenIcon} fg="#5B3FF3" bg="#F1EEFE" value={projects.length} label="Projects" note={`${projects.filter((p) => ["on_track", "at_risk", "blocked"].includes(p.status)).length} active`} />
        <StatTile icon={CheckSquareIcon} fg="#2563EB" bg="#EFF6FF" value={openTasks} label="Members' open tasks" note={`${members.reduce((n, m) => n + m.overdue, 0)} overdue`} />
        <StatTile icon={SealCheckIcon} fg="#EA580C" bg="#FFF4EB" value={approvals.length} label="Pending approvals" note="On this team's projects" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card label="Projects">
            <CardHeader title={`Projects (${projects.length})`} action={<ViewAll href="/portfolio" label="Open portfolio" />} />
            {projects.length ? (
              <ul className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                {projects.map((p) => (
                  <li key={p.id} className="rounded-xl border border-line p-3.5 transition-colors hover:border-brand-soft">
                    <div className="flex items-center gap-3">
                      <ProjectThumb thumb={p.thumb} size={36} />
                      <div className="min-w-0 flex-1">
                        <Link href={projectHref(p.id)} className="block truncate rounded text-[13.5px] leading-5 font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                          {p.name}
                        </Link>
                        <span className="block truncate text-[12px] leading-4 text-ink-muted">{p.phase}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <StatusPill status={p.status} />
                      <ProgressBar value={p.progress} color={ACCENT[p.accent].bar} className="flex-1" label={`${p.name}: ${p.progress}% complete`} />
                      <span className="text-[12px] text-ink-body tabular-nums">{p.progress}%</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[12px] text-ink-muted">
                      <span>Due {formatDate(p.endDate)}</span>
                      <AvatarStack people={people(p.memberIds)} extra={p.extraMembers} size="xs" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FolderOpenIcon} title="No projects yet" className="py-10" />
            )}
          </Card>

          <Card label="Upcoming tasks">
            <CardHeader title="Upcoming tasks" action={<ViewAll href="/calendar" label="Open calendar" />} />
            {upcoming.length ? (
              <ul className="px-5 pb-4">
                {upcoming.map(({ task, project }) => {
                  const late = task.dueDate < today;
                  return (
                    <li key={`${project.id}-${task.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft py-2.5 first:border-t-0">
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="block truncate text-[13px] leading-5 text-ink">{task.title}</span>
                        <Link href={projectHref(project.id)} className="block truncate text-[12px] leading-4 text-ink-muted hover:text-brand">
                          {project.name}
                        </Link>
                      </span>
                      <Badge fg={PRIORITY_META[task.priority].fg} bg={PRIORITY_META[task.priority].bg} dot>
                        {PRIORITY_META[task.priority].label}
                      </Badge>
                      <PersonChip personId={task.assigneeId} size="xs" className="w-32" />
                      <span className={cn("w-24 text-right text-[12.5px] tabular-nums", late ? "font-medium text-[#DC2626]" : "text-ink-body")}>{formatDate(task.dueDate)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CheckSquareIcon} title="No open tasks" className="py-10" />
            )}
          </Card>

          <section aria-label="Pending approvals">
            <h2 className="mb-3 text-[15px] leading-6 font-semibold text-ink">Pending approvals ({approvals.length})</h2>
            {approvals.length ? (
              <ul className="grid gap-3">
                {approvals.map((a) => (
                  <ApprovalCard key={a.id} approval={a} today={today} />
                ))}
              </ul>
            ) : (
              <Card>
                <EmptyState icon={SealCheckIcon} title="Nothing waiting for a decision" className="py-10" />
              </Card>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <Card label="Workload">
            <CardHeader title="Workload" />
            <p className="-mt-2 px-5 pb-2 text-[12.5px] text-ink-muted">Open tasks per member, across all projects</p>
            <div className="px-3 pb-4">
              <BarList
                label="Open tasks per member"
                data={members.map((m) => ({
                  key: m.person.id,
                  label: m.person.name,
                  value: m.openTasks,
                  display: m.overdue ? `${m.openTasks} · ${m.overdue} late` : String(m.openTasks),
                  detail: `${m.person.role} · ${pluralize(m.openTasks, "open task")}${m.overdue ? `, ${m.overdue} overdue` : ""}`,
                }))}
              />
            </div>
          </Card>

          <Card label="Members">
            <CardHeader
              title={`Members (${members.length})`}
              action={
                <button type="button" onClick={() => openTeam(team.id)} className="inline-flex items-center gap-1 rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
                  <UserPlusIcon size={14} aria-hidden /> Manage
                </button>
              }
            />
            <ul className="px-3 pb-3">
              {members.map((m) => (
                <li key={m.person.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openMember(m.person.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action"
                    aria-label={`${m.person.name}: details and teams`}
                  >
                    <PersonChip personId={m.person.id} withRole size="md" className="flex-1" />
                    {m.person.id === team.leadId && <Badge fg="#5B3FF3" bg="#F1EEFE">Lead</Badge>}
                  </button>
                  {m.person.id !== team.leadId && (
                    <IconButton aria-label={`Remove ${m.person.name} from ${team.name}`} onClick={() => setRemoving(m.person)} className="size-7 hover:text-[#DC2626]">
                      <XIcon size={14} aria-hidden />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card label="Workflows">
            <CardHeader title={`Workflows (${workflows.length})`} action={<ViewAll href="/workflows" label="All workflows" />} />
            {workflows.length ? (
              <ul className="px-2 pb-3">
                {workflows.map((w) => (
                  <li key={w.id}>
                    <Link href={`/workflows/${w.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action">
                      <TreeStructureIcon size={17} aria-hidden className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] leading-5 font-medium text-ink">{w.name}</span>
                        <span className="block truncate text-[12px] leading-4 text-ink-muted">{RECURRENCE_LABEL[w.recurrence]}</span>
                      </span>
                      <ToneBadge tone={WORKFLOW_STATUS_META[w.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={TreeStructureIcon} title="No workflows" className="py-8" />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
