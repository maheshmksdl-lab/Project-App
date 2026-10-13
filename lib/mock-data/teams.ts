import type { Team } from "@/lib/types/workspace";

/** Teams in the sidebar, each with its initials chip colours, people and projects. */
export const TEAMS: Team[] = [
  {
    id: "product",
    name: "Product Team",
    short: "PT",
    fg: "#5B3FF3",
    bg: "#F1EEFE",
    description: "Builds and ships the customer-facing products and the systems behind them.",
    leadId: "usr-john",
    memberIds: ["usr-john", "usr-aaron", "usr-daniel", "usr-emma", "usr-anna", "usr-james"],
    projectIds: ["erp-implementation", "customer-portal", "mobile-app-v2", "it-infrastructure-upgrade"],
  },
  {
    id: "operations",
    name: "Operations Team",
    short: "OT",
    fg: "#EA580C",
    bg: "#FFF4EB",
    description: "Runs facilities, finance operations and the people programmes across regions.",
    leadId: "usr-marcus",
    memberIds: ["usr-marcus", "usr-mike", "usr-grace", "usr-nikhil"],
    projectIds: ["warehouse-expansion", "hrms-rollout", "finance-system-migration", "office-relocation", "training-enablement"],
  },
  {
    id: "design",
    name: "Design Team",
    short: "DT",
    fg: "#15803D",
    bg: "#ECFDF3",
    description: "Owns research, product design and the shared design system.",
    leadId: "usr-sarah",
    memberIds: ["usr-sarah", "usr-anna", "usr-emma"],
    projectIds: ["customer-portal", "customer-feedback-program"],
  },
  {
    id: "marketing",
    name: "Marketing Team",
    short: "MT",
    fg: "#2563EB",
    bg: "#EFF6FF",
    description: "Plans campaigns, launches and the programmes that listen to customers.",
    leadId: "usr-olivia",
    memberIds: ["usr-olivia", "usr-mike", "usr-john", "usr-anna"],
    projectIds: ["marketing-campaign-q3", "customer-feedback-program", "sustainability-initiative"],
  },
];

export const teamById = (id: string) => TEAMS.find((t) => t.id === id);
