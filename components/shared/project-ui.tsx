"use client";

/**
 * Projects building blocks — page shell, cards, section headers, pills,
 * progress bars, buttons and underline tabs on shadcn/ui + Tailwind, in the
 * Projects palette. Every screen composes these so modules look like one
 * product (the Projects counterpart of Desk's shared/desk-ui.tsx).
 */
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { STATUS_META } from "@/lib/project-meta";
import type { ProjectStatus } from "@/lib/types/project";
import { cn } from "@/lib/utils";

/** Areas that aren't built yet answer with a toast instead of a placeholder page. */
export function comingSoon(what: string) {
  toast(`${what} is coming soon`, { description: "This area isn't available in this release." });
}

// ── Page chrome ──────────────────────────────────────────────────────

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-9 lg:py-7", className)}>{children}</div>;
}

// ── Cards ────────────────────────────────────────────────────────────

export function Card({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("min-w-0 rounded-xl border border-line bg-card shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-center gap-3 px-5 pt-5 pb-3", className)}>
      <h2 className="min-w-0 truncate text-[15px] leading-6 font-semibold text-ink">{title}</h2>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}

/** Section title above a group of cards ("Continue working", "Recent Activity"). */
export function SectionHeader({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center gap-3", className)}>
      <h2 className="text-[18px] leading-7 font-semibold text-ink">{title}</h2>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

const viewAllClass =
  "inline-flex items-center gap-2 rounded text-[13px] leading-5 font-medium whitespace-nowrap text-brand transition-colors hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action";

/** "View all →" — a link when the destination exists, otherwise a button that says it's coming. */
export function ViewAll({ href, label = "View all", onClick }: { href?: string; label?: string; onClick?: () => void }) {
  const body = (
    <>
      {label}
      <ArrowRightIcon size={14} weight="bold" aria-hidden />
    </>
  );
  if (href) {
    return (
      <Link href={href} className={viewAllClass}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick ?? (() => comingSoon(label.replace(/^View /, "")))} className={viewAllClass}>
      {body}
    </button>
  );
}

// ── Pills, bars ──────────────────────────────────────────────────────

/** Soft rounded label with an optional leading dot. */
export function Badge({ fg, bg, dot, children, className }: { fg: string; bg: string; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] leading-[18px] font-medium whitespace-nowrap", className)}
      style={{ color: fg, backgroundColor: bg }}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: fg }} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <Badge fg={m.fg} bg={m.bg} dot={m.dot} className={cn("rounded-full px-2.5", className)}>
      {m.label}
    </Badge>
  );
}

export function ProgressBar({ value, color, className, label }: { value: number; color: string; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${v}% complete`}
      className={cn("block h-1 overflow-hidden rounded-full bg-[#EEF0F4]", className)}
    >
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${v}%`, backgroundColor: color }} />
    </span>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────

type ButtonProps = ComponentProps<"button"> & { icon?: Icon };

export function PrimaryButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-button whitespace-nowrap text-white shadow-[0_1px_2px_rgb(91_63_243/0.25)] transition-colors hover:bg-brand-press disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
        className,
      )}
      {...props}
    >
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

export function OutlineButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm whitespace-nowrap text-ink-body transition-colors hover:border-brand-soft hover:bg-brand-surface hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action aria-pressed:border-brand-soft aria-pressed:bg-brand-tint aria-pressed:text-brand",
        className,
      )}
      {...props}
    >
      {IconCmp && <IconCmp size={16} aria-hidden />}
      {children}
    </button>
  );
}

/** Borderless square icon button ("⋯" menus, header tools). */
export function IconButton({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:bg-brand-depth-10 data-[state=open]:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────

/**
 * Underlined tab strip; the active tab is violet with a small dot under it.
 * The strip scrolls sideways on narrow screens.
 */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-6 overflow-x-auto border-b border-line scrollbar-none sm:gap-7", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 pt-1 pb-3 text-[13px] leading-5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-action",
              active ? "font-medium text-brand" : "text-ink-body hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("text-[11px] tabular-nums", active ? "text-brand" : "text-ink-muted")}>{t.count}</span>}
            {active && (
              <>
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden />
                <span className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" aria-hidden />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
