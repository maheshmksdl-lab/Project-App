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
  /** Module not built yet — the row answers with a "coming soon" toast instead of navigating. */
  soon?: boolean;
}

export const MAIN_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: HouseIcon },
  { label: "Projects", href: "/projects", icon: CheckSquareIcon },
  { label: "Workflows", href: "/workflows", icon: TreeStructureIcon, soon: true },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseIcon, soon: true },
  { label: "Calendar", href: "/calendar", icon: CalendarBlankIcon, soon: true },
  { label: "Templates", href: "/templates", icon: SquaresFourIcon, soon: true },
  { label: "Reports", href: "/reports", icon: ChartBarIcon, soon: true },
];

export const FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: GearSixIcon, soon: true },
  { label: "Help", href: "/help", icon: QuestionIcon, soon: true },
];

/** Teams in the sidebar, each with its initials chip colours. */
export const TEAMS = [
  { id: "product", name: "Product Team", short: "PT", fg: "#5B3FF3", bg: "#F1EEFE" },
  { id: "operations", name: "Operations Team", short: "OT", fg: "#EA580C", bg: "#FFF4EB" },
  { id: "design", name: "Design Team", short: "DT", fg: "#15803D", bg: "#ECFDF3" },
  { id: "marketing", name: "Marketing Team", short: "MT", fg: "#2563EB", bg: "#EFF6FF" },
];
