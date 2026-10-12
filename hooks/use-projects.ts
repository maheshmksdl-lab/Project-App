"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveProject, getHome, getPeople, getProject, listFavorites, listProjects, setFavorite, setTaskDone, updateProjectAbout } from "@/lib/api/projects";
import type { ProjectQuery } from "@/lib/schemas/project";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (query: ProjectQuery) => [...projectKeys.lists(), query] as const,
  favorites: () => [...projectKeys.all, "favorites"] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
  home: ["home"] as const,
  people: ["people"] as const,
};

export function useProjects(query: ProjectQuery) {
  return useQuery({ queryKey: projectKeys.list(query), queryFn: () => listProjects(query), placeholderData: keepPreviousData });
}

export function useFavorites() {
  return useQuery({ queryKey: projectKeys.favorites(), queryFn: listFavorites });
}

export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) });
}

export function useHome() {
  return useQuery({ queryKey: projectKeys.home, queryFn: getHome });
}

export function usePeople() {
  return useQuery({ queryKey: projectKeys.people, queryFn: getPeople, staleTime: Infinity });
}

/** Stars / unstars a project; every list, the sidebar favourites and the detail refresh. */
export function useSetFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => setFavorite(id, favorite),
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      qc.invalidateQueries({ queryKey: projectKeys.home });
    },
  });
}

export function useSetTaskDone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) => setTaskDone(taskId, done),
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateAbout(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (about: string) => updateProjectAbout(projectId, about),
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}
