"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignedOut } from "@/components/layout/session";
import { useStoredState } from "@/hooks/use-stored-state";
import { FORGOT_PASSWORD_ROUTE, HOME_ROUTE, SIGNUP_ROUTE } from "@/lib/routes";
import { AuthDivider, AuthField, AuthFooter, AuthLink, AuthShell, AuthSubmitButton, AuthTabs, PasswordInput, SocialButtons, authInputClass } from "./auth-ui";

/**
 * Log in. This preview has no accounts, so Log in opens the dashboard without
 * checking the email or password; "Keep me signed in" remembers the email on this device.
 */
export function LoginView() {
  const router = useRouter();
  const [, setSignedOut] = useSignedOut();
  const [savedEmail, setSavedEmail] = useStoredState<string>("evoq-projects:login-email", "");
  // null until typed in, so a remembered email shows once storage has been read.
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState<boolean | null>(null);
  const email = typedEmail ?? savedEmail;
  const keep = remember ?? savedEmail !== "";

  const submit = () => {
    setSavedEmail(keep ? email.trim() : "");
    setSignedOut(false);
    router.replace(HOME_ROUTE);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up your projects right where you left off.">
      <AuthTabs active="login" />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-5 grid gap-3.5"
      >
        <AuthField label="Email" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setTypedEmail(e.target.value)}
            className={authInputClass}
          />
        </AuthField>
        <AuthField
          label="Password"
          htmlFor="login-password"
          action={
            <AuthLink href={FORGOT_PASSWORD_ROUTE} className="text-[12px] leading-4">
              Forgot password?
            </AuthLink>
          }
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>
        <label className="flex items-center gap-2 text-[12px] leading-4 text-ink-muted">
          <Checkbox checked={keep} onCheckedChange={(v) => setRemember(v === true)} />
          Keep me signed in on this device
        </label>
        <AuthSubmitButton className="mt-1">Log in</AuthSubmitButton>
      </form>
      <AuthDivider />
      <SocialButtons verb="Log in" />
      <AuthFooter>
        Don&apos;t have an account? <AuthLink href={SIGNUP_ROUTE}>Sign up</AuthLink>
      </AuthFooter>
    </AuthShell>
  );
}
