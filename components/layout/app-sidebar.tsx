"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CaretDownIcon, PlusIcon, SignOutIcon, UserCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { comingSoon } from "@/components/shared/project-ui";
import { useFavorites } from "@/hooks/use-projects";
import { useHydrated } from "@/hooks/use-hydrated";
import { CURRENT_USER_ID, personById } from "@/lib/mock-data/people";
import { ACCENT } from "@/lib/project-meta";
import { projectHref } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";
import { FOOTER_ITEMS, MAIN_ITEMS, TEAMS, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

const me = personById(CURRENT_USER_ID)!;

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
  if (item.soon) {
    return (
      <button type="button" className={cls} onClick={() => comingSoon(item.label)}>
        {body}
      </button>
    );
  }
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

/** The project open in the Projects panel (?project=…) — read in its own Suspense boundary. */
function OpenProject({ children }: { children: (id: string | null) => ReactNode }) {
  return children(useSearchParams().get("project"));
}

function Favorites({ openProject, onNavigate }: { openProject: string | null; onNavigate?: () => void }) {
  const { data } = useFavorites();
  const hydrated = useHydrated();
  const items = hydrated ? (data ?? []) : [];
  return (
    <div>
      <GroupLabel label="Favorites" onAdd={() => comingSoon("Adding favorites from here")} />
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

function Teams() {
  return (
    <div>
      <GroupLabel label="Teams" onAdd={() => comingSoon("Creating teams")} />
      <ul className="space-y-0.5" aria-label="Teams">
        {TEAMS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => comingSoon(t.name)}
              className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-[13px] leading-5 text-ink-body transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action"
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={{ color: t.fg, backgroundColor: t.bg }} aria-hidden>
                {t.short}
              </span>
              <span className="truncate">{t.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserCard() {
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
        <DropdownMenuItem onSelect={() => comingSoon("Your profile")}>
          <UserCircleIcon aria-hidden /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => comingSoon("Signing out")}>
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
  return (
    <>
      {header}
      <nav aria-label="Main navigation" className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3 scrollbar-thin">
        <div className="space-y-0.5">
          {MAIN_ITEMS.map((item) => (
            <NavRow key={item.href} item={item} active={!item.soon && under(item.href)} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <Suspense fallback={<Favorites openProject={null} onNavigate={onNavigate} />}>
            <OpenProject>{(id) => <Favorites openProject={pathname === "/projects" ? id : null} onNavigate={onNavigate} />}</OpenProject>
          </Suspense>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <Teams />
        </div>
      </nav>
      <div className="shrink-0 px-3 pb-3">
        <div className="space-y-0.5 pb-3">
          {FOOTER_ITEMS.map((item) => (
            <NavRow key={item.href} item={item} active={false} />
          ))}
        </div>
        <div className="border-t border-line pt-3">
          <UserCard />
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
