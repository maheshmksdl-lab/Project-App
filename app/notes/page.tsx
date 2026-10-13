import { Suspense } from "react";
import type { Metadata } from "next";
import { NotesView } from "@/components/notes/notes-view";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    // The open note and project filter live in the URL, so the page renders on the client inside Suspense.
    <Suspense>
      <NotesView />
    </Suspense>
  );
}
