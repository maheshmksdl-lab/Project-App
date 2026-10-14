"use client";

/**
 * Sign-in building blocks — the two-panel card (form on the left, showcase on
 * the right) shared by Log in, Sign up and Forgot password, plus the fields,
 * buttons and tabs those forms compose, in the Projects palette.
 */
import { useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EyeIcon, EyeSlashIcon, FacebookLogoIcon, AppleLogoIcon, LightningIcon } from "@phosphor-icons/react/dist/ssr";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";

// ── Page shell ───────────────────────────────────────────────────────

/** The app canvas with the centred card: the form column, and the showcase panel from tablet width up. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-page)] px-4 py-8 sm:py-12">
      <div className="grid w-full max-w-[400px] rounded-[20px] border border-line bg-card p-3.5 shadow-pop md:max-w-[640px] md:grid-cols-[minmax(0,1fr)_306px] md:gap-3.5">
        <div className="flex min-w-0 flex-col p-3.5">
          <LightningIcon size={20} weight="fill" className="text-brand" aria-hidden />
          <h1 className="mt-5 text-[24px] leading-8 font-bold tracking-[-0.01em] text-ink">{title}</h1>
          <p className="mt-2.5 text-[13px] leading-[19px] text-ink-muted">{subtitle}</p>
          {children}
        </div>
        <AuthShowcase />
      </div>
    </div>
  );
}

/** Right-hand panel: a brand-violet gradient (light brand violet into the pressed brand shade) with the product pitch over it. Decorative, so hidden on phones. */
function AuthShowcase() {
  return (
    <aside
      aria-label="About EVOQ Projects"
      className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden rounded-2xl p-[18px] md:flex"
      style={{
        background: [
          "radial-gradient(50% 30% at 26% 16%, rgb(221 214 254 / 0.6), transparent 72%)",
          "linear-gradient(165deg, var(--brand-hover) 0%, var(--brand) 50%, var(--brand-press) 100%)",
        ].join(", "),
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {["Work execution OS", "Built for teams"].map((chip) => (
          <span key={chip} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] leading-3 font-semibold text-white backdrop-blur-sm">
            {chip}
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-white/20 bg-white/10 p-[18px] backdrop-blur-md">
        <p className="text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-white">Work, organized around how your teams operate.</p>
        <p className="mt-2.5 text-[11.5px] leading-[18px] font-medium text-white/85">
          Plan projects, coordinate workflows, manage approvals, and execute recurring operations in one flexible workspace built for every department.
        </p>
      </div>
    </aside>
  );
}

// ── Navigation ───────────────────────────────────────────────────────

/** Sign In / Create Account switch — each side is a link to its own page. */
export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const tabs = [
    { key: "login", label: "Sign In", href: LOGIN_ROUTE },
    { key: "signup", label: "Create Account", href: SIGNUP_ROUTE },
  ] as const;
  return (
    <nav aria-label="Account" className="mt-6 grid h-[38px] grid-cols-2 gap-1 rounded-[10px] border border-line bg-white p-[3px]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "flex items-center justify-center rounded-[7px] text-[12px] leading-4 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
            active === t.key ? "bg-brand text-white shadow-[0_1px_2px_rgb(91_63_243/0.25)]" : "text-ink-body hover:bg-brand-surface hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Brand-coloured inline link ("Sign up", "Forgot password?"). */
export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("rounded font-semibold text-brand transition-colors hover:text-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action", className)}
      {...props}
    />
  );
}

/** "Don't have an account? Sign up" line under the form. */
export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-center text-[12px] leading-4 text-ink-muted">{children}</p>;
}

// ── Fields ───────────────────────────────────────────────────────────

export const authInputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-muted hover:border-brand-soft focus:border-brand-soft focus:ring-3 focus:ring-brand-10 aria-invalid:border-[#DC2626]";

/** Label above the control (with an optional link on its right), error (or hint) below. The control gets `aria-describedby` from `describedBy(id, …)`. */
export function AuthField({ label, htmlFor, error, hint, action, children }: { label: string; htmlFor: string; error?: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[12px] leading-4 font-semibold text-ink">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="-mt-0.5 text-[12px] leading-4 font-medium text-[#DC2626]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="-mt-0.5 text-[12px] leading-4 text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** The id of whichever message AuthField shows under the control. */
export const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

/** Password input with a show / hide toggle. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={cn(authInputClass, "pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink-body focus-visible:outline-2 focus-visible:outline-brand-action"
      >
        {visible ? <EyeSlashIcon size={16} aria-hidden /> : <EyeIcon size={16} aria-hidden />}
      </button>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────

/** Full-width primary submit — the app's solid brand button. */
export function AuthSubmitButton({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[13.5px] leading-5 font-semibold text-white shadow-[0_1px_2px_rgb(91_63_243/0.25)] transition-colors hover:bg-brand-press disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** "OR" rule between the form and the single sign-on buttons. */
export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[10px] leading-3 font-semibold tracking-[0.06em] text-ink-faint uppercase" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const PROVIDERS = [
  { name: "Google", icon: <GoogleMark /> },
  { name: "Facebook", icon: <FacebookLogoIcon size={18} weight="fill" className="text-[#1877F2]" aria-hidden /> },
  { name: "Apple", icon: <AppleLogoIcon size={18} weight="fill" className="text-ink" aria-hidden /> },
] as const;

/** Google / Facebook / Apple buttons. No identity provider is connected in this preview — they say so. */
export function SocialButtons({ verb = "Continue" }: { verb?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {PROVIDERS.map((p) => (
        <button
          key={p.name}
          type="button"
          aria-label={`${verb} with ${p.name}`}
          onClick={() => toast(`${p.name} sign-in isn't connected in this preview`, { description: "Use your email and password to continue." })}
          className="flex h-9 items-center justify-center rounded-lg border border-line bg-white transition-colors hover:border-brand-soft hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
        >
          {p.icon}
        </button>
      ))}
    </div>
  );
}
