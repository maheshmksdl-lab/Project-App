"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  ChartBarIcon,
  CheckSquareIcon,
  GearSixIcon,
  KeyboardIcon,
  PaperPlaneTiltIcon,
  RocketLaunchIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, PageShell, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { FormField, PageHeader, SearchInput, SelectField, fieldClass } from "@/components/shared/workspace-ui";
import { FAQS, HELP_ARTICLES, SHORTCUTS } from "@/lib/mock-data/help";
import { contactFormSchema, fieldErrors, type ContactFormValues } from "@/lib/schemas/workspace";
import type { HelpArticle, HelpTopic } from "@/lib/types/workspace";
import { HELP_TOPIC_LABEL } from "@/lib/workspace-meta";
import { cn } from "@/lib/utils";

const TOPIC_ICON: Record<HelpTopic, { icon: Icon; fg: string; bg: string }> = {
  getting_started: { icon: RocketLaunchIcon, fg: "#5B3FF3", bg: "#F1EEFE" },
  projects: { icon: CheckSquareIcon, fg: "#2563EB", bg: "#EFF6FF" },
  workflows: { icon: TreeStructureIcon, fg: "#EA580C", bg: "#FFF4EB" },
  calendar: { icon: CalendarBlankIcon, fg: "#15803D", bg: "#ECFDF3" },
  reports: { icon: ChartBarIcon, fg: "#5B3FF3", bg: "#F1EEFE" },
  admin: { icon: GearSixIcon, fg: "#475467", bg: "#F2F4F7" },
};

function ArticleDialog({ article, onClose }: { article: HelpArticle; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl gap-3 rounded-2xl">
        <span className="text-[12px] font-medium text-brand">{HELP_TOPIC_LABEL[article.topic]}</span>
        <DialogTitle className="-mt-1 pr-8 text-[18px] leading-7 font-semibold text-ink">{article.title}</DialogTitle>
        <DialogDescription className="text-[13.5px] leading-[22px] text-ink-muted">{article.summary}</DialogDescription>
        <div className="space-y-3 text-[14px] leading-[22px] text-ink-body">
          {article.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {article.href && (
          <div className="mt-1 flex justify-end">
            <Link
              href={article.href}
              onClick={onClose}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-button text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
            >
              Take me there
              <ArrowRightIcon size={14} weight="bold" aria-hidden />
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>({ subject: "", topic: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ContactFormValues>(k: K, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = () => {
    const parsed = contactFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      document.getElementById(`cs-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    // No support backend is connected in this preview — say so rather than pretend it was sent.
    toast("Support isn't connected in this preview", { description: `Your message “${parsed.data.subject}” was checked but not sent. Contact your EVOQ administrator for help.` });
    setValues({ subject: "", topic: "", message: "" });
  };
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-4 px-5 pb-5"
    >
      <FormField label="Subject" htmlFor="cs-subject" error={errors.subject}>
        <input id="cs-subject" value={values.subject} onChange={(e) => set("subject", e.target.value)} aria-invalid={!!errors.subject} className={fieldClass} />
      </FormField>
      <FormField label="Topic" htmlFor="cs-topic" error={errors.topic}>
        <SelectField
          id="cs-topic"
          value={values.topic}
          onChange={(v) => set("topic", v)}
          placeholder="Choose a topic"
          invalid={!!errors.topic}
          options={(Object.keys(HELP_TOPIC_LABEL) as HelpTopic[]).map((t) => ({ value: t, label: HELP_TOPIC_LABEL[t] }))}
        />
      </FormField>
      <FormField label="How can we help?" htmlFor="cs-message" error={errors.message}>
        <textarea
          id="cs-message"
          rows={5}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          aria-invalid={!!errors.message}
          className={cn(fieldClass, "h-auto resize-y py-2 leading-5")}
        />
      </FormField>
      <div>
        <PrimaryButton type="submit" icon={PaperPlaneTiltIcon}>
          Send message
        </PrimaryButton>
      </div>
    </form>
  );
}

export function HelpView() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<HelpTopic | "all">("all");
  const [open, setOpen] = useState<HelpArticle | null>(null);
  const onSearch = useCallback((v: string) => setQ(v), []);

  const articles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return HELP_ARTICLES.filter(
      (a) => (topic === "all" || a.topic === topic) && (!needle || [a.title, a.summary, ...a.body].some((t) => t.toLowerCase().includes(needle))),
    );
  }, [q, topic]);

  return (
    <PageShell>
      <PageHeader title="Help" subtitle="Guides, answers and shortcuts for getting work done in EVOQ Projects." />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={onSearch} placeholder="Search help articles..." label="Search help articles" className="sm:w-[320px]" />
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Help topics">
        {(Object.keys(HELP_TOPIC_LABEL) as HelpTopic[]).map((t) => {
          const s = TOPIC_ICON[t];
          const IconCmp = s.icon;
          const active = topic === t;
          return (
            <li key={t}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setTopic(active ? "all" : t)}
                className={cn(
                  "flex h-full w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                  active ? "border-brand-soft ring-1 ring-brand-soft" : "border-line hover:border-brand-soft",
                )}
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color: s.fg, backgroundColor: s.bg }}>
                  <IconCmp size={19} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-5 font-medium text-ink">{HELP_TOPIC_LABEL[t]}</span>
                  <span className="block text-[12px] leading-4 text-ink-muted">{HELP_ARTICLES.filter((a) => a.topic === t).length} articles</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card label="Articles">
            <CardHeader
              title={topic === "all" ? "Articles" : HELP_TOPIC_LABEL[topic]}
              action={
                topic !== "all" && (
                  <button type="button" onClick={() => setTopic("all")} className="rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
                    All topics
                  </button>
                )
              }
            />
            {articles.length ? (
              <ul className="px-2 pb-2">
                {articles.map((a) => {
                  const s = TOPIC_ICON[a.topic];
                  const IconCmp = s.icon;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(a)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand-action"
                      >
                        <IconCmp size={18} aria-hidden className="shrink-0" style={{ color: s.fg }} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] leading-5 font-medium text-ink">{a.title}</span>
                          <span className="block truncate text-[12.5px] leading-5 text-ink-muted">{a.summary}</span>
                        </span>
                        <ArrowRightIcon size={14} aria-hidden className="shrink-0 text-ink-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={BookOpenTextIcon} title="No articles match" hint="Try other words, or ask us below." className="py-10" />
            )}
          </Card>

          <Card label="Frequently asked questions">
            <CardHeader title="Frequently asked questions" />
            <ul className="divide-y divide-line-soft px-5 pb-2">
              {FAQS.map((f) => (
                <li key={f.q}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded text-[13.5px] leading-5 font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand-action [&::-webkit-details-marker]:hidden">
                      <span className="flex-1">{f.q}</span>
                      <CaretDownIcon size={14} aria-hidden className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-2 text-[13px] leading-[21px] text-ink-body">{f.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card label="Keyboard shortcuts">
            <div id="shortcuts" className="scroll-mt-[calc(var(--header-h)+16px)]">
              <CardHeader title="Keyboard shortcuts" action={<KeyboardIcon size={18} aria-hidden className="text-ink-muted" />} />
              <ul className="px-5 pb-4">
                {SHORTCUTS.map((s) => (
                  <li key={s.keys.join("+") + s.label} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-[13px] text-ink-body">{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-[#F7F7FA] px-1.5 font-sans text-[11.5px] font-medium text-ink-body">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card label="Contact support">
            <CardHeader title="Contact support" />
            <p className="-mt-1 px-5 pb-3 text-[12.5px] leading-5 text-ink-muted">Can&apos;t find an answer? Tell us what you&apos;re trying to do.</p>
            <ContactForm />
          </Card>
        </div>
      </div>

      {open && <ArticleDialog article={open} onClose={() => setOpen(null)} />}
    </PageShell>
  );
}
