/** The dashboard: Log in lands here (the app itself opens on Log in). */
export const HOME_ROUTE = "/home";

/** A project opens on its own Project Details page. */
export const projectHref = (id: string) => `/projects/${encodeURIComponent(id)}`;

// The Projects list state (tab, search, filter…) last shown, so "back to Projects" returns to it.
let projectsListHref = "/projects";
export const getProjectsListHref = () => projectsListHref;
export const setProjectsListHref = (href: string) => {
  projectsListHref = href;
};

/** Sign-in pages: shown full-screen, outside the workspace sidebar and header. */
export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const AUTH_ROUTES: readonly string[] = [LOGIN_ROUTE, SIGNUP_ROUTE, FORGOT_PASSWORD_ROUTE];
