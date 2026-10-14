"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignedOut } from "@/components/layout/session";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/lib/routes";
import { signupFormSchema } from "@/lib/schemas/auth";
import { fieldErrors } from "@/lib/schemas/workspace";
import { AuthDivider, AuthField, AuthFooter, AuthLink, AuthShell, AuthSubmitButton, AuthTabs, PasswordInput, SocialButtons, authInputClass, describedBy } from "./auth-ui";

type Values = { name: string; email: string; password: string; terms: boolean };

const PASSWORD_HINT = "Use at least 8 characters.";

/** Create account. This preview has no accounts, so a valid form opens the workspace without storing anything. */
export function SignupView() {
  const router = useRouter();
  const [, setSignedOut] = useSignedOut();
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = () => {
    const parsed = signupFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      document.getElementById(`signup-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSignedOut(false);
    toast.success(`Welcome to EVOQ Projects, ${parsed.data.name.split(" ")[0]}`, { description: "This preview has no real accounts, so nothing was stored." });
    router.replace(HOME_ROUTE);
  };

  return (
    <AuthShell title="Create your account" subtitle="Set up your workspace and bring your projects, workflows and teams together.">
      <AuthTabs active="signup" />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-5 grid gap-3.5"
      >
        <AuthField label="Full name" htmlFor="signup-name" error={errors.name}>
          <input
            id="signup-name"
            autoComplete="name"
            placeholder="Jane Cooper"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("signup-name", errors.name)}
            className={authInputClass}
          />
        </AuthField>
        <AuthField label="Work email" htmlFor="signup-email" error={errors.email}>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy("signup-email", errors.email)}
            className={authInputClass}
          />
        </AuthField>
        <AuthField label="Password" htmlFor="signup-password" error={errors.password} hint={PASSWORD_HINT}>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={describedBy("signup-password", errors.password, PASSWORD_HINT)}
          />
        </AuthField>
        <div className="grid gap-1.5">
          <label className="flex items-start gap-2 text-[12px] leading-4 text-ink-muted">
            <Checkbox
              id="signup-terms"
              checked={values.terms}
              onCheckedChange={(v) => set("terms", v === true)}
              aria-invalid={!!errors.terms}
              aria-describedby={describedBy("signup-terms", errors.terms)}
            />
            I agree to the Terms of Service and Privacy Policy
          </label>
          {errors.terms && (
            <p id="signup-terms-error" role="alert" className="text-[12px] leading-4 font-medium text-[#DC2626]">
              {errors.terms}
            </p>
          )}
        </div>
        <AuthSubmitButton className="mt-1">Create account</AuthSubmitButton>
      </form>
      <AuthDivider />
      <SocialButtons verb="Sign up" />
      <AuthFooter>
        Already have an account? <AuthLink href={LOGIN_ROUTE}>Log in</AuthLink>
      </AuthFooter>
    </AuthShell>
  );
}
