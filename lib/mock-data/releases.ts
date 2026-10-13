import type { ReleaseNote } from "@/lib/types/workspace";

/** Sample release notes describing this preview's modules — not published product announcements. */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "rel-my-day",
    date: "2026-10-12",
    category: "new",
    title: "My Day",
    body: "Your tasks due today, overdue work, approvals waiting on you and today's meetings in one place. Complete tasks or change their status without leaving the page.",
    href: "/my-day",
  },
  {
    id: "rel-files-notes",
    date: "2026-10-12",
    category: "new",
    title: "Notes and Files",
    body: "Keep notes and files beside your projects. Both are searchable, can be linked to a project, and show up on that project's page.",
    href: "/files",
  },
  {
    id: "rel-discussion",
    date: "2026-10-10",
    category: "new",
    title: "Project discussion and activity",
    body: "Each project now has a Discussion thread with replies, and an Activity timeline that records status changes, task updates, files, comments and approvals as they happen.",
  },
  {
    id: "rel-bookmarks",
    date: "2026-10-09",
    category: "new",
    title: "Bookmarks",
    body: "Bookmark projects, tasks, workflows, templates, notes, files and reports, then find them all on the Bookmarks page.",
    href: "/bookmarks",
  },
  {
    id: "rel-project-settings",
    date: "2026-10-08",
    category: "improved",
    title: "Project settings, duplicate and folders",
    body: "Edit a project's details, owner, team and dates from Project Settings, duplicate a project with a choice of what to copy, and file projects into folders.",
    href: "/projects",
  },
  {
    id: "rel-teams",
    date: "2026-10-06",
    category: "improved",
    title: "Team management",
    body: "Create teams, choose a lead, add or remove members and change a person's team memberships from the team page.",
  },
  {
    id: "rel-calendar-week",
    date: "2026-10-02",
    category: "fixed",
    title: "Calendar respects your first day of the week",
    body: "The Calendar now starts weeks on the day chosen in Settings → General.",
    href: "/calendar",
  },
];
