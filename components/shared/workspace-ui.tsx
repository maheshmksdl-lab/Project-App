"use client";

/**
 * Building blocks shared by the modules around projects (Workflows, Calendar,
 * Templates, Reports, Settings, Help, Teams): page header, back link, search,
 * form fields, dialogs, pagination and stat tiles — all on the Projects palette
 * so every module reads as the same product as Home and Projects.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowLeftIcon, CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personById } from "@/lib/mock-data/people";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./person-avatar";
import { Badge, OutlineButton, PrimaryButton } from "./project-ui";

// ── Page chrome ──────────────────────────────────────────────────────

/** Page title row — the same title, subtitle and action placement as the Projects page. */
export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div>
      {back && <BackLink href={back.href} label={back.label} />}
      <div className={cn("flex flex-wrap items-start justify-between gap-4", back && "mt-3")}>
        <div className="min-w-0">
          <h1 className="text-[26px] leading-9 font-bold tracking-[-0.01em] text-ink sm:text-[28px]">{title}</h1>
          <p className="mt-1 text-[14px] leading-5 text-ink-muted">{subtitle}</p>
        </div>
        {actions && <div className="mt-1 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** "← Projects" — the back link used on detail pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded text-[12px] leading-4 text-ink-muted transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
    >
      <ArrowLeftIcon size={13} aria-hidden />
      {label}
    </Link>
  );
}

// ── Search & filters ─────────────────────────────────────────────────

/** Search box that types locally and reports the value after a short pause (same look as the Projects search). */
export function SearchInput({ value, onChange, placeholder, label, className }: { value: string; onChange: (q: string) => void; placeholder: string; label: string; className?: string }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative min-w-0 flex-1 sm:w-[220px] sm:flex-none", className)}>
      <MagnifyingGlassIcon size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 w-full rounded-lg border border-line bg-white pr-3 pl-8.5 text-[13px] text-ink outline-none placeholder:text-ink-muted transition-colors focus:border-brand-soft focus:ring-3 focus:ring-brand-10"
      />
    </div>
  );
}

/** Compact select used in filter rows. */
export function FilterSelect<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label={label} className={cn(fieldClass, "w-auto min-w-[140px] gap-2 text-ink-body", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Forms ────────────────────────────────────────────────────────────

/** Outlined input / select / textarea styling shared by every form. */
export const fieldClass =
  "h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none shadow-none transition-colors placeholder:text-ink-muted hover:border-brand-soft focus:border-brand-soft focus:ring-3 focus:ring-brand-10 focus-visible:border-brand-soft focus-visible:ring-3 focus-visible:ring-brand-10 aria-invalid:border-[#DC2626] data-[state=open]:border-brand-soft disabled:opacity-60";

/** Label above the control, error below. */
export function FormField({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-field-label text-ink-body">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[12px] leading-4 font-medium text-[#DC2626]">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12px] leading-4 text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/** A select bound to a form field. */
export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className={cn(fieldClass, "justify-between")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Dialog with a title, optional description, a scrolling body and Cancel / submit actions. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel,
  onSubmit,
  pending,
  wide,
  extraAction,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  pending?: boolean;
  wide?: boolean;
  extraAction?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[min(92dvh,760px)] flex-col gap-0 rounded-2xl p-0", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b border-line-soft px-5 pt-5 pb-4 pr-12">
            <DialogTitle className="text-[17px] leading-6 font-semibold text-ink">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="mt-1 text-[13px] leading-5 text-ink-muted">{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
          <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-line-soft px-5 py-3.5">
            {extraAction && <div className="mr-auto">{extraAction}</div>}
            <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Are you sure?" for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="text-[17px] font-semibold text-ink">{title}</DialogTitle>
        <DialogDescription className="text-[14px] leading-[22px] text-ink-muted">{description}</DialogDescription>
        <DialogFooter className="mt-2 gap-2">
          <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
          <PrimaryButton className="bg-[#DC2626] shadow-none hover:bg-[#B91C1C]" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lists ────────────────────────────────────────────────────────────

/** "1–8 of 23" with previous / next and page numbers. */
export function Pagination({ page, pageCount, total, pageSize, noun, onPage }: { page: number; pageCount: number; total: number; pageSize: number; noun: string; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-body transition-colors hover:border-brand-soft hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-body focus-visible:outline-2 focus-visible:outline-brand-action";
  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p className="text-[13px] text-ink-muted" aria-live="polite">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} {noun}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)} className={btn}>
            <CaretLeftIcon size={14} weight="bold" aria-hidden />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "size-8 rounded-lg border text-button-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                p === page ? "border-brand-soft bg-brand-tint text-brand" : "border-line text-ink-body hover:border-brand-soft",
              )}
            >
              {p}
            </button>
          ))}
          <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => onPage(page + 1)} className={btn}>
            <CaretRightIcon size={14} weight="bold" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

/** A coloured label from a meta table ({ label, fg, bg, dot }). */
export function ToneBadge({ tone, className }: { tone: { label: string; fg: string; bg: string; dot: boolean }; className?: string }) {
  return (
    <Badge fg={tone.fg} bg={tone.bg} dot={tone.dot} className={cn("rounded-full px-2.5", className)}>
      {tone.label}
    </Badge>
  );
}

/** Summary number tile (icon, value, label, note). Optionally a toggle that filters the page. */
export function StatTile({
  icon: IconCmp,
  fg,
  bg,
  value,
  label,
  note,
  active,
  onClick,
}: {
  icon: Icon;
  fg: string;
  bg: string;
  value: ReactNode;
  label: string;
  note?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ color: fg, backgroundColor: bg }}>
        <IconCmp size={21} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] leading-7 font-semibold text-ink">{value}</span>
        <span className="block truncate text-[13px] leading-5 text-ink-body">{label}</span>
        {note && <span className="block truncate text-[12px] leading-4 text-ink-muted">{note}</span>}
      </span>
    </>
  );
  const cls = cn(
    "flex min-w-0 items-center gap-3.5 rounded-xl border bg-card px-4 py-3.5 text-left shadow-card transition-colors",
    active ? "border-brand-soft ring-1 ring-brand-soft" : "border-line",
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={!!active} className={cn(cls, "hover:border-brand-soft focus-visible:outline-2 focus-visible:outline-brand-action")}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Avatar and name, with the role underneath when asked. */
export function PersonChip({ personId, withRole, size = "sm", className }: { personId: string; withRole?: boolean; size?: "xs" | "sm" | "md"; className?: string }) {
  const person = personById(personId);
  if (!person) return <span className="text-[12.5px] text-ink-muted">Unassigned</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <PersonAvatar name={person.name} src={person.avatar} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] leading-[18px] text-ink">{person.name}</span>
        {withRole && <span className="block truncate text-[11.5px] leading-4 text-ink-muted">{person.role}</span>}
      </span>
    </span>
  );
}
