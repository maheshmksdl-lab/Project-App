import type { Icon } from "@phosphor-icons/react";
import {
  CalendarBlankIcon,
  ChartBarIcon,
  CheckSquareIcon,
  GearSixIcon,
  HouseIcon,
  QuestionIcon,
  SquaresFourIcon,
  TreeStructureIcon,
  BriefcaseIcon,
} from "@phosphor-icons/react/dist/ssr";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
}

export const MAIN_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: HouseIcon },
  { label: "Projects", href: "/projects", icon: CheckSquareIcon },
  { label: "Workflows", href: "/workflows", icon: TreeStructureIcon },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseIcon },
  { label: "Calendar", href: "/calendar", icon: CalendarBlankIcon },
  { label: "Templates", href: "/templates", icon: SquaresFourIcon },
  { label: "Reports", href: "/reports", icon: ChartBarIcon },
];

export const FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: GearSixIcon },
  { label: "Help", href: "/help", icon: QuestionIcon },
];

export { TEAMS } from "@/lib/mock-data/teams";

export const teamHref = (id: string) => `/teams/${encodeURIComponent(id)}`;
