"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { LOGIN_ROUTE } from "@/lib/routes";
import { forgotPasswordFormSchema } from "@/lib/schemas/auth";
import { fieldErrors } from "@/lib/schemas/workspace";
import { AuthField, AuthFooter, AuthLink, AuthShell, AuthSubmitButton, authInputClass, describedBy } from "./auth-ui";

/** Forgot password: ask for the email, then confirm. No email service is connected in this preview — the confirmation says so. */
export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = () => {
    const parsed = forgotPasswordFormSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error.issues).email ?? "");
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setSentTo(parsed.data.email);
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle={<>If an account exists for <span className="font-semibold text-ink-body">{sentTo}</span>, you&apos;ll get a link to reset your password.</>}>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-soft bg-brand-surface p-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand" aria-hidden>
            <EnvelopeSimpleIcon size={18} weight="bold" />
          </span>
          <p className="text-[12px] leading-[18px] text-ink-muted">
            This preview has no email service connected, so no message was actually sent. The link would expire after 30 minutes.
          </p>
        </div>
        <AuthLinkButton href={LOGIN_ROUTE} />
        <AuthFooter>
          Didn&apos;t get the email?{" "}
          <button
            type="button"
            onClick={() => toast("Reset link requested again", { description: `No email service is connected in this preview, so nothing was sent to ${sentTo}.` })}
            className="rounded font-semibold text-brand transition-colors hover:text-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
          >
            Resend
          </button>{" "}
          or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="rounded font-semibold text-brand transition-colors hover:text-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
          >
            use another email
          </button>
        </AuthFooter>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter the email you sign in with and we'll send you a link to reset your password.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-5 grid gap-3.5"
      >
        <AuthField label="Email" htmlFor="forgot-email" error={error}>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            aria-invalid={!!error}
            aria-describedby={describedBy("forgot-email", error)}
            className={authInputClass}
            autoFocus
          />
        </AuthField>
        <AuthSubmitButton className="mt-1">Send reset link</AuthSubmitButton>
      </form>
      <AuthLinkButton href={LOGIN_ROUTE} />
      <AuthFooter>
        Remembered it? <AuthLink href={LOGIN_ROUTE}>Log in</AuthLink>
      </AuthFooter>
    </AuthShell>
  );
}

/** "← Back to log in" as a full-width outline button. */
function AuthLinkButton({ href }: { href: string }) {
  return (
    <AuthLink
      href={href}
      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13.5px] leading-5 font-medium text-ink-body hover:border-brand-soft hover:bg-brand-surface hover:text-ink"
    >
      <ArrowLeftIcon size={14} weight="bold" aria-hidden />
      Back to log in
    </AuthLink>
  );
}
