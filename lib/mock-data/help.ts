import type { HelpArticle } from "@/lib/types/workspace";

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "getting-started",
    topic: "getting_started",
    title: "Getting started with EVOQ Projects",
    summary: "A tour of Home, Projects, Workflows and the rest of the workspace.",
    body: [
      "Home is your daily starting point: Today's Brief highlights deadlines, approvals and blocked work, and Continue working takes you straight back into the projects you opened last.",
      "Projects lists every project with its status, progress, dates and team. Open one to see its overview, tasks, timeline and milestones on its own page.",
      "Workflows, Calendar, Portfolio, Templates and Reports sit beside Projects in the sidebar and all read from the same project data.",
    ],
    href: "/home",
  },
  {
    id: "create-project",
    topic: "projects",
    title: "Create a project",
    summary: "Start from scratch or from a template, then invite the team.",
    body: [
      "Choose New Project on the Projects page, or Create → New project in the header. Give the project a name, owner, dates and status.",
      "To reuse a proven plan, open Templates and choose Use template. The template's phases become milestones and its tasks are scheduled across the project dates.",
    ],
    href: "/projects",
  },
  {
    id: "add-tasks",
    topic: "projects",
    title: "Add and complete tasks",
    summary: "Create tasks for any project and track them to done.",
    body: [
      "Choose Create → New task in the header, pick the project, assignee, due date and priority. The task appears on the project's Tasks tab and on the Calendar.",
      "Tick the checkbox beside a task on the project page to mark it done.",
    ],
    href: "/projects",
  },
  {
    id: "portfolio",
    topic: "projects",
    title: "Track the portfolio",
    summary: "See every project's health, roadmap and status board in one place.",
    body: [
      "Portfolio shows on-track, at-risk and overdue counts, a roadmap of every project, and a status board.",
      "Move a project between columns on the board to change its status; the change shows everywhere the project appears.",
    ],
    href: "/portfolio",
  },
  {
    id: "workflows",
    topic: "workflows",
    title: "Build a workflow",
    summary: "Define stages, owners and approval steps for repeatable processes.",
    body: [
      "Open Workflows and choose New workflow. Add a stage for each step, choose who owns it, and mark the steps that need an approval.",
      "Recurring workflows start on their schedule; any workflow can also be started with Run now. Each run moves through the stages in order.",
    ],
    href: "/workflows",
  },
  {
    id: "approvals",
    topic: "workflows",
    title: "Review approvals",
    summary: "Approve or reject requests and keep a record of each decision.",
    body: [
      "The Approvals tab on Workflows lists every request with its project, requester, due date and amount.",
      "Approve or reject with an optional note. When an approval belongs to a workflow run, approving it moves the run on to its next stage.",
    ],
    href: "/workflows?tab=approvals",
  },
  {
    id: "calendar",
    topic: "calendar",
    title: "Use the calendar",
    summary: "Tasks, milestones, workflow runs, approvals and meetings by day.",
    body: [
      "Calendar brings together task due dates, milestones, project deadlines, scheduled workflow runs, approval due dates and meetings.",
      "Switch between month, week and agenda views, filter by project or type, and choose any item to open it. The first day of the week follows Settings.",
    ],
    href: "/calendar",
  },
  {
    id: "reports",
    topic: "reports",
    title: "Read and export reports",
    summary: "Project health, task progress, workload and budget at a glance.",
    body: [
      "Reports summarise project health, task completion, workload by person and budget use. Filter by team or owner to focus the numbers.",
      "Use Export CSV to download the rows behind the current report.",
    ],
    href: "/reports",
  },
  {
    id: "settings",
    topic: "admin",
    title: "Manage workspace settings",
    summary: "Workspace details, notifications, members and project defaults.",
    body: [
      "Settings holds the workspace name, time zone and first day of the week, your notification preferences, members and their roles, and defaults for new tasks and approvals.",
      "Invite people by email and choose their role. Changes in this preview are kept for the current session only.",
    ],
    href: "/settings",
  },
  {
    id: "teams",
    topic: "admin",
    title: "Work with teams",
    summary: "See each team's people, projects, workload and workflows.",
    body: ["Choose a team in the sidebar to see its members, the projects it works on, how busy each person is, and the workflows it owns.", "Create a team with the + next to Teams. On a team page, use the ⋯ menu to edit it, change its lead, add or remove members, or delete it."],
    href: "/teams",
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Why do my changes disappear when I reload?",
    a: "This preview runs on sample data held in your browser session. Changes are kept while you use the app and reset when the page reloads.",
  },
  {
    q: "How is project progress calculated?",
    a: "Progress is set on the project and drives its milestones: each phase completes as overall progress passes it.",
  },
  {
    q: "What happens when I approve a request that belongs to a workflow?",
    a: "The waiting workflow run moves to its next stage, or completes if the approval was the last stage.",
  },
  {
    q: "Can I change the first day of the week on the calendar?",
    a: "Yes — Settings → General → Week starts on.",
  },
  {
    q: "Who can see a project?",
    a: "Everyone in the workspace can open a project. Roles in Settings → Members decide who can change it.",
  },
];

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Focus the search bar" },
  { keys: ["/"], label: "Focus the search bar" },
  { keys: ["Esc"], label: "Close a dialog or menu" },
  { keys: ["Enter"], label: "Search projects from the header" },
];
