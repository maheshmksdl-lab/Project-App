import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The EVOQ mark: an open hexagon "C" in two violets (solid fills — the mark renders twice, so no shared gradient ids). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9 shrink-0", className)} aria-hidden>
      <path d="M33 11.5 20 4 7 11.5v17L20 36l13-7.5-6.2-3.6L20 28.8l-6.6-3.8v-10l6.6-3.8 6.8 3.9Z" fill="#5B3FF3" />
      <path d="m26.8 15.1 6.2-3.6v8.2l-6.2 3.6Z" fill="#B9A8FF" />
    </svg>
  );
}

/** App logo in the sidebar and navigation drawer — links to Home. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <Link href="/home" className={cn("inline-flex shrink-0 items-center rounded-md", className)} aria-label="EVOQ Projects — go to Home">
      <Image src="/media/ai-app-projects.png" alt="Projects" width={184} height={55} priority className="h-10 w-auto" />
    </Link>
  );
}
