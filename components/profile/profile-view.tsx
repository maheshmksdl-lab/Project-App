"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CameraIcon, InfoIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Card, CardHeader, OutlineButton, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { ErrorState } from "@/components/shared/state-panels";
import { FormField, PageHeader, fieldClass } from "@/components/shared/workspace-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProfile, useSettings, useTeams, useUpdateProfile } from "@/hooks/use-workspace";
import { fieldErrors, profileFormSchema, type ProfileFormValues } from "@/lib/schemas/workspace";
import type { Profile } from "@/lib/types/workspace";
import { ROLE_META } from "@/lib/workspace-meta";

const MAX_PHOTO = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const initial: ProfileFormValues = { name: profile.name, email: profile.email, title: profile.title, department: profile.department, avatar: profile.avatar };
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = <K extends keyof ProfileFormValues>(k: K, v: ProfileFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  /** Reads the chosen photo into this browser session (no upload service is connected). */
  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setErrors((e) => ({ ...e, avatar: "Choose a PNG, JPG, WebP or GIF image" }));
    if (file.size > MAX_PHOTO) return setErrors((e) => ({ ...e, avatar: "Photos can be up to 2 MB" }));
    const reader = new FileReader();
    reader.onload = () => set("avatar", String(reader.result));
    reader.onerror = () => setErrors((e) => ({ ...e, avatar: "Couldn't read that image" }));
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    const parsed = profileFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      document.getElementById(`pf-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: () => toast.success("Profile saved", { description: "Your name, title and photo are updated across the workspace." }),
      onError: (err) => toast.error("Couldn't save your profile", { description: err.message }),
    });
  };

  return (
    <Card label="Your profile">
      <CardHeader title="Your profile" />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="px-5 pb-5"
      >
        <div className="flex flex-wrap items-center gap-4">
          <PersonAvatar name={values.name || profile.name} src={values.avatar} size="lg" className="size-20 text-xl" />
          <div className="flex flex-wrap gap-2">
            <OutlineButton icon={CameraIcon} onClick={() => fileRef.current?.click()}>
              Change photo
            </OutlineButton>
            {values.avatar && (
              <OutlineButton icon={TrashIcon} onClick={() => set("avatar", null)}>
                Remove
              </OutlineButton>
            )}
            <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} onChange={(e) => pickPhoto(e.target.files?.[0])} className="sr-only" tabIndex={-1} aria-hidden />
          </div>
          <p className="w-full text-[12px] leading-4 text-ink-muted">
            {errors.avatar ? <span className="font-medium text-[#DC2626]">{errors.avatar}</span> : "PNG, JPG, WebP or GIF up to 2 MB. Kept in this browser session only — there's no upload service in this preview."}
          </p>
        </div>

        <div className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="pf-name" error={errors.name}>
            <input id="pf-name" value={values.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={!!errors.name} className={fieldClass} />
          </FormField>
          <FormField label="Email" htmlFor="pf-email" error={errors.email}>
            <input id="pf-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={!!errors.email} className={fieldClass} />
          </FormField>
          <FormField label="Job title" htmlFor="pf-title" error={errors.title}>
            <input id="pf-title" value={values.title} onChange={(e) => set("title", e.target.value)} autoComplete="organization-title" aria-invalid={!!errors.title} className={fieldClass} />
          </FormField>
          <FormField label="Department" htmlFor="pf-department" error={errors.department}>
            <input id="pf-department" value={values.department} onChange={(e) => set("department", e.target.value)} aria-invalid={!!errors.department} className={fieldClass} />
          </FormField>
        </div>
        <div className="mt-5 flex gap-2">
          <PrimaryButton type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save profile"}
          </PrimaryButton>
          <OutlineButton
            disabled={!dirty}
            onClick={() => {
              setValues(initial);
              setErrors({});
            }}
          >
            Cancel
          </OutlineButton>
        </div>
      </form>
    </Card>
  );
}

export function ProfileView() {
  const hydrated = useHydrated();
  const { data: profile, isError, refetch } = useProfile();
  const { data: teams } = useTeams();
  const { data: settings } = useSettings();
  const myTeams = (teams ?? []).filter((t) => profile && t.memberIds.includes(profile.personId));
  const role = settings?.members.find((m) => m.personId === profile?.personId)?.role;

  return (
    <PageShell>
      <PageHeader title="Profile" subtitle="How you appear to your teams across EVOQ Projects." />
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {isError ? (
            <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
          ) : !hydrated || !profile ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <ProfileForm key={JSON.stringify(profile)} profile={profile} />
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <Card label="Workspace access" className="p-5">
            <h2 className="text-[15px] leading-6 font-semibold text-ink">Workspace access</h2>
            <p className="mt-2 text-[13px] text-ink-body">
              Role: <span className="font-medium text-ink">{role ? ROLE_META[role].label : "—"}</span>
            </p>
            {role && <p className="text-[12.5px] text-ink-muted">{ROLE_META[role].hint}</p>}
            <h3 className="mt-4 text-[13px] font-semibold text-ink">Teams</h3>
            {myTeams.length ? (
              <ul className="mt-2 space-y-1.5">
                {myTeams.map((t) => (
                  <li key={t.id}>
                    <Link href={`/teams/${t.id}`} className="inline-flex items-center gap-2 rounded text-[13px] text-ink-body hover:text-brand">
                      <span className="inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold" style={{ color: t.fg, backgroundColor: t.bg }} aria-hidden>
                        {t.short}
                      </span>
                      {t.name}
                      {t.leadId === profile?.personId && <span className="text-[11.5px] text-ink-muted">· Lead</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12.5px] text-ink-muted">Not in any team yet.</p>
            )}
          </Card>
          <Card label="Preferences" className="p-5">
            <h2 className="text-[15px] leading-6 font-semibold text-ink">Preferences</h2>
            <p className="mt-2 text-[13px] text-ink-body">
              Week starts on <span className="font-medium text-ink">{settings ? (settings.weekStartsOn === 0 ? "Sunday" : "Monday") : "—"}</span>
            </p>
            <p className="text-[13px] text-ink-body">
              Notifications on: <span className="font-medium text-ink">{settings ? Object.values(settings.notifications).filter(Boolean).length : "—"} of 6</span>
            </p>
            <Link href="/settings" className="mt-3 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-brand hover:text-brand-press">
              Change in Settings
              <ArrowRightIcon size={12} weight="bold" aria-hidden />
            </Link>
          </Card>
          <p className="flex items-start gap-2 text-[12px] leading-4 text-ink-muted">
            <InfoIcon size={14} aria-hidden className="mt-px shrink-0" />
            Profile changes apply for this session of the preview and reset when the page reloads. Email isn&apos;t verified because there are no real accounts.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
