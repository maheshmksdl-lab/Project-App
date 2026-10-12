import Image from "next/image";
import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ChatTeardropDotsIcon,
  DeviceMobileIcon,
  HardDrivesIcon,
  LeafIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ProjectIconKey, ProjectThumb as Thumb } from "@/lib/types/project";
import { cn } from "@/lib/utils";

export const PROJECT_ICONS: Record<ProjectIconKey, Icon> = {
  phone: DeviceMobileIcon,
  server: HardDrivesIcon,
  users: UsersThreeIcon,
  chart: ChartBarIcon,
  building: BuildingOfficeIcon,
  leaf: LeafIcon,
  chat: ChatTeardropDotsIcon,
  book: BookOpenTextIcon,
};

const TONE: Record<Extract<Thumb, { kind: "icon" }>["tone"], { fg: string; bg: string }> = {
  purple: { fg: "#5B3FF3", bg: "#F1EEFE" },
  blue: { fg: "#2563EB", bg: "#EAF2FF" },
  green: { fg: "#16A34A", bg: "#E9F8EE" },
  gray: { fg: "#475467", bg: "#F2F4F7" },
};

/** Square project thumbnail: its photo, or a tinted glyph tile. */
export function ProjectThumb({ thumb, size = 42, className }: { thumb: Thumb; size?: number; className?: string }) {
  if (thumb.kind === "photo") {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-muted", className)} style={{ width: size, height: size }}>
        <Image src={thumb.src} alt="" fill sizes={`${size * 2}px`} className="object-cover" />
      </span>
    );
  }
  const IconCmp = PROJECT_ICONS[thumb.icon];
  const t = TONE[thumb.tone];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", className)} style={{ width: size, height: size, color: t.fg, backgroundColor: t.bg }}>
      <IconCmp size={Math.round(size * 0.55)} weight="duotone" aria-hidden />
    </span>
  );
}
