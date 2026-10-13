import { toIsoDate } from "@/lib/format";

/** Simulated network latency for the mock APIs. */
export const delay = (ms = 80 + Math.random() * 120) => new Promise((r) => setTimeout(r, ms));

/** Today as an ISO calendar date, on the viewer's clock. */
export const todayIso = () => toIsoDate(new Date());

/** Session-unique ids for records created in the mock store. */
let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;
