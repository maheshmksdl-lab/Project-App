import type { Metadata } from "next";
import { SignedOutView } from "@/components/layout/signed-out-view";

export const metadata: Metadata = { title: "Signed out" };

export default function SignedOutPage() {
  return <SignedOutView />;
}
