/** Where the app opens: Home is the dashboard. */
export const HOME_ROUTE = "/home";

/** A project opens in the panel beside the Projects list (`?project=…`), not on a page of its own. */
export const projectHref = (id: string) => `/projects?project=${encodeURIComponent(id)}`;
