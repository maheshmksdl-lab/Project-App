import type { Metadata } from "next";
import { SignupView } from "@/components/auth/signup-view";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return <SignupView />;
}
