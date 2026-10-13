"use client";

import Link from "next/link";
import {
  ArchiveIcon,
  ArrowRightIcon,
  BookmarkSimpleIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  FolderSimpleIcon,
  GearSixIcon,
  LinkSimpleIcon,
  StarIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { useBookmark } from "@/components/shared/bookmark-button";
import { IconButton } from "@/components/shared/project-ui";
import { useArchiveProject, useSetFavorite } from "@/hooks/use-projects";
import { projectHref } from "@/lib/routes";
import type { ProjectSummary } from "@/lib/types/project";

export function copyProjectLink(id: string) {
  void navigator.clipboard?.writeText(`${window.location.origin}${projectHref(id)}`);
  toast.success("Project link copied");
}

/** Row "⋮" menu on the Projects list. */
export function ProjectRowMenu({ project }: { project: ProjectSummary }) {
  const setFavorite = useSetFavorite();
  const archive = useArchiveProject();
  const dialogs = useAppDialogs();
  const bookmark = useBookmark("project", project.id, project.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Actions for ${project.name}`} onClick={(e) => e.stopPropagation()}>
          <DotsThreeVerticalIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={projectHref(project.id)}>
            <ArrowRightIcon aria-hidden /> Open project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setFavorite.mutate({ id: project.id, favorite: !project.favorite })}>
          <StarIcon aria-hidden /> {project.favorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={bookmark.toggle}>
          <BookmarkSimpleIcon aria-hidden /> {bookmark.saved ? "Remove bookmark" : "Bookmark"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copyProjectLink(project.id)}>
          <LinkSimpleIcon aria-hidden /> Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dialogs.openProjectSettings(project.id)}>
          <GearSixIcon aria-hidden /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => dialogs.openDuplicateProject(project)}>
          <CopyIcon aria-hidden /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => dialogs.openMoveToFolder(project)}>
          <FolderSimpleIcon aria-hidden /> Move to folder
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => archive.mutate(project.id, { onSuccess: () => toast.success(`${project.name} archived`) })}
        >
          <ArchiveIcon aria-hidden /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
