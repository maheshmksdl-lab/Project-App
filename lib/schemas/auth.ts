import { z } from "zod";

const email = z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email address"));

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Keep it under 80 characters"),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128, "Keep it under 128 characters"),
  terms: z.literal(true, "Accept the terms to continue"),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const forgotPasswordFormSchema = z.object({ email });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
