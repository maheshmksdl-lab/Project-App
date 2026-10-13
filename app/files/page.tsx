import type { Metadata } from "next";
import { FilesView } from "@/components/files/files-view";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({ searchParams }: PageProps<"/files">) {
  const { file } = await searchParams;
  return <FilesView openFileId={typeof file === "string" ? file : null} />;
}
