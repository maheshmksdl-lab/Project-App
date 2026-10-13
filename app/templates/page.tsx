import type { Metadata } from "next";
import { TemplatesView } from "@/components/templates/templates-view";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  const { preview } = await searchParams;
  return <TemplatesView previewId={typeof preview === "string" ? preview : null} />;
}
