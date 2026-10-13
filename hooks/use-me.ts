"use client";

import { usePeople } from "@/hooks/use-projects";
import { CURRENT_USER_ID, personById } from "@/lib/mock-data/people";
import type { Person } from "@/lib/types/project";

/** The signed-in person, refreshed when their profile is saved. */
export function useMe(): Person {
  const { data } = usePeople();
  return data?.find((p) => p.id === CURRENT_USER_ID) ?? personById(CURRENT_USER_ID)!;
}
