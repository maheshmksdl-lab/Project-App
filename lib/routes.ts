/** Where the app opens: Home is the dashboard. */
export const HOME_ROUTE = "/home";

/** A project opens on its own Project Details page. */
export const projectHref = (id: string) => `/projects/${encodeURIComponent(id)}`;

// The Projects list state (tab, search, filter…) last shown, so "back to Projects" returns to it.
let projectsListHref = "/projects";
export const getProjectsListHref = () => projectsListHref;
export const setProjectsListHref = (href: string) => {
  projectsListHref = href;
};
