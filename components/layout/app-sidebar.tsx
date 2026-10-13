"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDownIcon, PlusIcon, SignOutIcon, UserCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAppDialogs } from "@/components/shared/app-dialogs";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { OutlineButton } from "@/components/shared/project-ui";
import { useFavorites, useProjects, useSetFavorite } from "@/hooks/use-projects";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMe } from "@/hooks/use-me";
import { useTeams } from "@/hooks/use-workspace";
import { ACCENT } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import { DEFAULT_PROJECT_QUERY } from "@/lib/schemas/project";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";
import { FOOTER_ITEMS, MAIN_ITEMS, TEAMS, teamHref, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

const rowClass = "group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-nav-item transition-colors focus-visible:outline-2 focus-visible:outline-brand-action";

function NavRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const IconCmp = item.icon;
  const cls = cn(rowClass, active ? "bg-brand-10 text-brand" : "font-normal text-ink-body hover:bg-brand-depth-10 hover:text-ink");
  const body = (
    <>
      <IconCmp size={19} aria-hidden className={cn("shrink-0", active ? "text-brand" : "text-ink-muted group-hover:text-ink")} />
      <span className="truncate">{item.label}</span>
    </>
  );
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cls}>
      {body}
    </Link>
  );
}

function GroupLabel({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex h-8 items-center justify-between pr-1 pl-3">
      <h2 className="text-nav-group-label text-ink-muted uppercase">{label}</h2>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add to ${label.toLowerCase()}`}
        className="inline-flex size-6 items-center justify-center rounded-md text-brand transition-colors hover:bg-brand-10 focus-visible:outline-2 focus-visible:outline-brand-action"
      >
        <PlusIcon size={14} weight="bold" aria-hidden />
      </button>
    </div>
  );
}

/** "+" on Favorites: star or unstar any project from one list. */
function FavoritesDialog({ onClose }: { onClose: () => void }) {
  const { data } = useProjects(DEFAULT_PROJECT_QUERY);
  const setFavorite = useSetFavorite();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(88dvh,640px)] flex-col gap-3 rounded-2xl sm:max-w-md">
        <DialogTitle className="pr-8 text-[17px] font-semibold text-ink">Favorite projects</DialogTitle>
        <DialogDescription className="text-[13px] text-ink-muted">Starred projects are pinned in the sidebar.</DialogDescription>
        <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {(data?.items ?? []).map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand-surface">
                <Checkbox
                  checked={p.favorite}
                  onCheckedChange={(v) =>
                    setFavorite.mutate(
                      { id: p.id, favorite: v === true },
                      { onSuccess: () => toast.success(v === true ? "Added to favorites" : "Removed from favorites", { description: p.name }) },
                    )
                  }
                  className="data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                />
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ACCENT[p.accent].dot }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <OutlineButton onClick={onClose}>Done</OutlineButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Favorites({ openProject, onNavigate }: { openProject: string | null; onNavigate?: () => void }) {
  const { data } = useFavorites();
  const hydrated = useHydrated();
  const [picking, setPicking] = useState(false);
  const items = hydrated ? (data ?? []) : [];
  return (
    <div>
      <GroupLabel label="Favorites" onAdd={() => setPicking(true)} />
      {picking && <FavoritesDialog onClose={() => setPicking(false)} />}
      <ul className="space-y-0.5" aria-label="Favorite projects">
        {items.map((p) => {
          const href = projectHref(p.id);
          const active = openProject === p.id;
          return (
            <li key={p.id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-3 rounded-lg px-3 text-[13px] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                  active ? "bg-brand-10 font-medium text-brand" : "text-ink-body hover:bg-brand-depth-10 hover:text-ink",
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ACCENT[p.accent].dot }} aria-hidden />
                <span className="truncate">{p.name}</span>
              </Link>
            </li>
          );
        })}
        {hydrated && data?.length === 0 && <li className="px-3 py-1 text-[12px] text-ink-muted">Star a project to pin it here.</li>}
      </ul>
    </div>
  );
}

function Teams({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { data: teams } = useTeams();
  const { openTeam } = useAppDialogs();
  return (
    <div>
      <GroupLabel label="Teams" onAdd={() => openTeam()} />
      <ul className="space-y-0.5" aria-label="Teams">
        {(teams ?? TEAMS).map((t) => {
          const href = teamHref(t.id);
          const active = pathname === href;
          return (
            <li key={t.id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 w-full items-center gap-3 rounded-lg px-2 text-[13px] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                  active ? "bg-brand-10 font-medium text-brand" : "text-ink-body hover:bg-brand-depth-10 hover:text-ink",
                )}
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={{ color: t.fg, backgroundColor: t.bg }} aria-hidden>
                  {t.short}
                </span>
                <span className="truncate">{t.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UserCard({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe();
  const { openLogout } = useAppDialogs();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-brand-depth-10 focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:bg-brand-depth-10">
        <PersonAvatar name={me.name} src={me.avatar} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] leading-5 font-semibold text-ink">{me.name}</span>
          <span className="block truncate text-[12px] leading-4 text-ink-muted">{me.role}</span>
        </span>
        <CaretDownIcon size={14} aria-hidden className="shrink-0 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-xl">
        <DropdownMenuItem asChild>
          <Link href="/profile" onClick={onNavigate}>
            <UserCircleIcon aria-hidden /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            onNavigate?.();
            openLogout();
          }}
        >
          <SignOutIcon aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Logo · modules · Favorites · Teams, with Settings, Help and the account at the foot. */
function SidebarBody({ onNavigate, header }: { onNavigate?: () => void; header: ReactNode }) {
  const pathname = usePathname();
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  // The project whose Details page is open (/projects/<id>).
  const openProject = pathname.startsWith("/projects/") ? decodeURIComponent(pathname.slice("/projects/".length)) : null;
  return (
    <>
      {header}
      <nav aria-label="Main navigation" className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3 scrollbar-thin">
        <div className="space-y-0.5">
          {MAIN_ITEMS.map((item) => (
            <NavRow key={item.href} item={item} active={under(item.href)} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <Favorites openProject={openProject} onNavigate={onNavigate} />
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <Teams pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
      <div className="shrink-0 px-3 pb-3">
        <div className="space-y-0.5 pb-3">
          {FOOTER_ITEMS.map((item) => (
            <NavRow key={item.href} item={item} active={under(item.href)} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="border-t border-line pt-3">
          <UserCard onNavigate={onNavigate} />
        </div>
      </div>
    </>
  );
}

/** Desktop: fixed full-height rail. Phones / tablets: overlay drawer opened from the header. */
export function AppSidebar() {
  const { drawerOpen, setDrawerOpen } = useShell();
  const close = () => setDrawerOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-sidebar select-none lg:flex">
        <SidebarBody header={<div className="flex h-[78px] shrink-0 items-center px-6"><AppLogo /></div>} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(280px,85vw)] gap-0 border-none bg-sidebar p-0 shadow-[4px_0_24px_rgba(16,24,40,0.08)] lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Projects modules</SheetDescription>
          <SidebarBody
            onNavigate={close}
            header={
              <div className="flex h-[70px] shrink-0 items-center justify-between px-5">
                <AppLogo />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink transition-all hover:bg-brand-depth-10 hover:text-brand"
                >
                  <XIcon size={18} weight="bold" aria-hidden />
                </button>
              </div>
            }
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
