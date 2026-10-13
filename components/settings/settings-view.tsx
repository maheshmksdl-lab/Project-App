"use client";

import { useState } from "react";
import { EnvelopeSimpleIcon, InfoIcon, TrashIcon, UserPlusIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, OutlineButton, PageShell, PrimaryButton, UnderlineTabs } from "@/components/shared/project-ui";
import { ErrorState } from "@/components/shared/state-panels";
import { FormField, PageHeader, PersonChip, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useInviteMember, useRevokeInvite, useSetMemberRole, useSettings, useUpdateSettings } from "@/hooks/use-workspace";
import { formatDate } from "@/lib/format";
import { PEOPLE } from "@/lib/mock-data/people";
import { PRIORITY_META } from "@/lib/project-meta";
import { fieldErrors, generalSettingsSchema, inviteFormSchema, type InviteFormValues } from "@/lib/schemas/workspace";
import type { MemberRole, NotificationPrefs, WorkspaceSettings } from "@/lib/types/workspace";
import { ROLE_META } from "@/lib/workspace-meta";

type Tab = "general" | "notifications" | "members" | "defaults";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Gulf Standard Time" },
  { value: "Europe/London", label: "(GMT+00:00) London" },
  { value: "Europe/Berlin", label: "(GMT+01:00) Central European Time" },
  { value: "America/New_York", label: "(GMT−05:00) Eastern Time" },
  { value: "America/Los_Angeles", label: "(GMT−08:00) Pacific Time" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney" },
];

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "taskAssigned", label: "A task is assigned to me", hint: "When someone assigns you a task in any project." },
  { key: "approvalRequested", label: "My approval is requested", hint: "Requests from people and from workflow approval stages." },
  { key: "projectStatusChanged", label: "A project I follow changes status", hint: "For example when a project becomes at risk or blocked." },
  { key: "workflowRunStarted", label: "A workflow I own starts a run", hint: "Scheduled and on-demand runs." },
  { key: "mentions", label: "Someone mentions me", hint: "In project discussions and comments." },
  { key: "weeklyDigest", label: "Weekly digest", hint: "A Monday summary of your projects, tasks and approvals." },
];

const roleOptions = (Object.keys(ROLE_META) as MemberRole[]).map((r) => ({ value: r, label: ROLE_META[r].label }));

function SessionNote() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#F7F7FA] px-3 py-2.5 text-[12.5px] leading-5 text-ink-muted">
      <InfoIcon size={15} aria-hidden className="mt-0.5 shrink-0" />
      This preview runs on sample data: changes apply across the app for this session and reset when the page reloads.
    </p>
  );
}

function General({ settings }: { settings: WorkspaceSettings }) {
  const update = useUpdateSettings();
  const initial = { workspaceName: settings.workspaceName, timezone: settings.timezone, weekStartsOn: settings.weekStartsOn };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const save = () => {
    const parsed = generalSettingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      document.getElementById("gs-workspaceName")?.focus();
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: () => toast.success("Workspace settings saved", { description: parsed.data.weekStartsOn !== settings.weekStartsOn ? "The Calendar now starts weeks on the new day." : undefined }),
      onError: (err) => toast.error("Couldn't save", { description: err.message }),
    });
  };
  return (
    <Card label="General">
      <CardHeader title="Workspace" />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid max-w-2xl gap-4 px-5 pb-5 sm:grid-cols-2"
      >
        <FormField label="Workspace name" htmlFor="gs-workspaceName" error={errors.workspaceName} className="sm:col-span-2">
          <input
            id="gs-workspaceName"
            value={values.workspaceName}
            onChange={(e) => {
              setValues((v) => ({ ...v, workspaceName: e.target.value }));
              setErrors({});
            }}
            aria-invalid={!!errors.workspaceName}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Time zone" htmlFor="gs-timezone">
          <SelectField id="gs-timezone" value={values.timezone} onChange={(v) => setValues((s) => ({ ...s, timezone: v }))} options={TIMEZONES} />
        </FormField>
        <FormField label="Week starts on" htmlFor="gs-week" hint="Used by the Calendar">
          <SelectField
            id="gs-week"
            value={String(values.weekStartsOn)}
            onChange={(v) => setValues((s) => ({ ...s, weekStartsOn: v === "0" ? 0 : 1 }))}
            options={[
              { value: "1", label: "Monday" },
              { value: "0", label: "Sunday" },
            ]}
          />
        </FormField>
        <div className="flex gap-2 sm:col-span-2">
          <PrimaryButton type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </PrimaryButton>
          <OutlineButton disabled={!dirty} onClick={() => setValues(initial)}>
            Discard
          </OutlineButton>
        </div>
      </form>
    </Card>
  );
}

function Notifications({ settings }: { settings: WorkspaceSettings }) {
  const update = useUpdateSettings();
  const toggle = (key: keyof NotificationPrefs, on: boolean) =>
    update.mutate(
      { notifications: { ...settings.notifications, [key]: on } },
      { onSuccess: () => toast.success(on ? "Notification turned on" : "Notification turned off", { description: NOTIFICATION_ROWS.find((r) => r.key === key)?.label }) },
    );
  return (
    <Card label="Notifications">
      <CardHeader title="Notify me when" />
      <ul className="divide-y divide-line-soft px-5 pb-2">
        {NOTIFICATION_ROWS.map((r) => (
          <li key={r.key} className="flex items-center gap-4 py-3.5">
            <label htmlFor={`nt-${r.key}`} className="min-w-0 flex-1 cursor-pointer">
              <span className="block text-[13.5px] leading-5 font-medium text-ink">{r.label}</span>
              <span className="block text-[12.5px] leading-5 text-ink-muted">{r.hint}</span>
            </label>
            <Switch id={`nt-${r.key}`} checked={settings.notifications[r.key]} onCheckedChange={(on) => toggle(r.key, on)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Members({ settings }: { settings: WorkspaceSettings }) {
  const setRole = useSetMemberRole();
  const invite = useInviteMember();
  const revoke = useRevokeInvite();
  const [values, setValues] = useState<InviteFormValues>({ email: "", role: "member" });
  const [error, setError] = useState("");

  const submit = () => {
    const parsed = inviteFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(fieldErrors(parsed.error.issues).email ?? "Check the details");
      document.getElementById("inv-email")?.focus();
      return;
    }
    invite.mutate(parsed.data, {
      onSuccess: (inv) => {
        toast.success("Invite created", { description: `${inv.email} · ${ROLE_META[inv.role].label}. No email is sent in this preview.` });
        setValues({ email: "", role: values.role });
      },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <Card label="Invite people">
        <CardHeader title="Invite people" />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-start"
        >
          <FormField label="Email address" htmlFor="inv-email" error={error} className="flex-1">
            <input
              id="inv-email"
              type="email"
              value={values.email}
              onChange={(e) => {
                setValues((v) => ({ ...v, email: e.target.value }));
                setError("");
              }}
              placeholder="name@company.com"
              aria-invalid={!!error}
              className={fieldClass}
            />
          </FormField>
          <FormField label="Role" htmlFor="inv-role" className="sm:w-44">
            <SelectField id="inv-role" value={values.role} onChange={(v) => setValues((s) => ({ ...s, role: v as MemberRole }))} options={roleOptions} />
          </FormField>
          <PrimaryButton type="submit" icon={UserPlusIcon} className="sm:mt-[23px]" disabled={invite.isPending}>
            Invite
          </PrimaryButton>
        </form>
        {settings.invites.length > 0 && (
          <div className="border-t border-line-soft px-5 py-3">
            <h3 className="text-[12.5px] font-semibold text-ink">Pending invites</h3>
            <ul className="mt-1">
              {settings.invites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-2">
                  <EnvelopeSimpleIcon size={16} aria-hidden className="shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{inv.email}</span>
                    <span className="block text-[12px] text-ink-muted">
                      {ROLE_META[inv.role].label} · invited {formatDate(inv.invitedOn)}
                    </span>
                  </span>
                  <OutlineButton
                    icon={TrashIcon}
                    className="h-8"
                    onClick={() => revoke.mutate(inv.id, { onSuccess: () => toast.success("Invite revoked", { description: inv.email }) })}
                  >
                    Revoke
                  </OutlineButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card label="Members">
        <CardHeader title={`Members (${settings.members.length})`} />
        <ul className="divide-y divide-line-soft px-5 pb-3">
          {settings.members.map((m) => (
            <li key={m.personId} className="flex flex-wrap items-center gap-3 py-3">
              <PersonChip personId={m.personId} withRole size="md" className="min-w-[180px] flex-1" />
              <span className="hidden flex-1 text-[12.5px] text-ink-muted md:block">{ROLE_META[m.role].hint}</span>
              <div className="w-40">
                <label htmlFor={`role-${m.personId}`} className="sr-only">
                  Role for {PEOPLE.find((p) => p.id === m.personId)?.name}
                </label>
                <SelectField
                  id={`role-${m.personId}`}
                  value={m.role}
                  onChange={(v) =>
                    setRole.mutate(
                      { personId: m.personId, role: v as MemberRole },
                      {
                        onSuccess: () => toast.success("Role updated", { description: `${PEOPLE.find((p) => p.id === m.personId)?.name} is now ${ROLE_META[v as MemberRole].label}` }),
                        onError: (err) => toast.error("Couldn't change the role", { description: err.message }),
                      },
                    )
                  }
                  options={roleOptions}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Defaults({ settings }: { settings: WorkspaceSettings }) {
  const update = useUpdateSettings();
  const [priority, setPriority] = useState(settings.defaultTaskPriority);
  const [approver, setApprover] = useState(settings.defaultApproverId);
  const dirty = priority !== settings.defaultTaskPriority || approver !== settings.defaultApproverId;
  return (
    <Card label="Project defaults">
      <CardHeader title="Defaults for new work" />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ defaultTaskPriority: priority, defaultApproverId: approver }, { onSuccess: () => toast.success("Defaults saved", { description: "New tasks and approval requests start with these values." }) });
        }}
        className="grid max-w-2xl gap-4 px-5 pb-5 sm:grid-cols-2"
      >
        <FormField label="Task priority" htmlFor="df-priority" hint="Pre-selected in New task">
          <SelectField id="df-priority" value={priority} onChange={(v) => setPriority(v as typeof priority)} options={(["high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
        </FormField>
        <FormField label="Approver" htmlFor="df-approver" hint="Pre-selected in Request approval">
          <SelectField id="df-approver" value={approver} onChange={setApprover} options={PEOPLE.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` }))} />
        </FormField>
        <div className="flex gap-2 sm:col-span-2">
          <PrimaryButton type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save defaults"}
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );
}

export function SettingsView() {
  const hydrated = useHydrated();
  const { data, isError, refetch } = useSettings();
  const [tab, setTab] = useState<Tab>("general");

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Workspace details, notifications, members and defaults for new work." />
      <UnderlineTabs
        label="Settings sections"
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "general", label: "General" },
          { value: "notifications", label: "Notifications" },
          { value: "members", label: "Members", count: data?.members.length },
          { value: "defaults", label: "Project defaults" },
        ]}
      />
      <div className="mt-5 max-w-4xl">
        {isError ? (
          <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !hydrated || !data ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : tab === "general" ? (
          <General key={JSON.stringify([data.workspaceName, data.timezone, data.weekStartsOn])} settings={data} />
        ) : tab === "notifications" ? (
          <Notifications settings={data} />
        ) : tab === "members" ? (
          <Members settings={data} />
        ) : (
          <Defaults key={`${data.defaultTaskPriority}-${data.defaultApproverId}`} settings={data} />
        )}
        <SessionNote />
      </div>
    </PageShell>
  );
}
