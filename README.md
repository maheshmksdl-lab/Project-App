# Projects

EVOQ project management workspace — frontend only. This phase covers two screens:

- `/home` — dashboard (greeting, Today's Brief, Continue working, Today's Focus, My Workspace, Recent Activity)
- `/projects` — project list (status tabs, search, owner filter, sort, list / grid). Selecting a project opens it in a panel on the right (`/projects?project=…`): overview, milestones, timeline, recent tasks, owner / team / budget / links

There is no backend: data comes from an in-memory mock API and resets on page reload.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```

## Structure

Same layout and conventions as the Desk app.

```
app/                     routes (App Router) — / redirects to /home
components/
  layout/                sidebar (favorites, teams, account), header (search, create, notifications)
  home/                  Home dashboard
  projects/              list, project panel, timeline, thumbnails, row actions
  shared/project-ui.tsx  building blocks (page shell, cards, section headers, pills, progress, buttons, tabs)
  shared/                avatars, empty / error states
  ui/                    shadcn/ui primitives (copied from Desk)
hooks/                   TanStack Query hooks
lib/
  api/projects.ts        mock API — the only file to replace when a backend exists
  mock-data/             people, projects, home dashboard seeds
  schemas/project.ts     Zod: list query (URL)
  types/project.ts       domain types
  project-meta.ts        labels and colours for status / priority / accents
  format.ts              date, currency and relative-time formatting
public/media/            photos (Unsplash, free licence) for the hero, project cards and ERP header
```

## Notes

- Palette tokens live in `app/globals.css` (`--brand*`, ink, line); the type scale matches Desk's.
- Projects open in a side panel, never on a page of their own. From 1280px the list and panel sit side by side (the table tightens to fit); below that the panel slides over the list. `← Projects` or Escape closes it. Old `/projects/<id>` links redirect to the panel.
- List state (tab, search, owner, sort, layout, open project) lives in the URL, so views are shareable and survive refresh. The header search opens the list with `?q=`.
- Tab counts are computed from the data, so they differ slightly from the mockup (Planning 3, Completed 0) — the mockup's twelve rows contain three Planning projects and no Completed one.
- Starring a project, ticking a task, editing the description and archiving / deleting update local state only.
- Modules not built yet (Workflows, Portfolio, Calendar, Templates, Reports, Settings, Help, teams, create actions, other project tabs' content) answer with a "coming soon" toast or an empty state — no placeholder pages.
- Keyboard: `Ctrl/⌘ K` or `/` focuses search.
