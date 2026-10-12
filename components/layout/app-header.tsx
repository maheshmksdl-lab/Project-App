"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  CaretDownIcon,
  CheckSquareIcon,
  DotsThreeIcon,
  FolderSimplePlusIcon,
  ListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SealCheckIcon,
  SparkleIcon,
  TreeStructureIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { comingSoon } from "@/components/shared/project-ui";
import { CURRENT_USER_ID, personById } from "@/lib/mock-data/people";
import { cn } from "@/lib/utils";
import { LogoMark } from "./app-logo";
import { useShell } from "./shell-context";

const me = personById(CURRENT_USER_ID)!;

const SEARCH_PLACEHOLDER = "Search projects, tasks, approvals, files, or ask AI...";

const toolClass =
  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-body transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:bg-brand-depth-10";

/** Header search: Enter searches the Projects list. `Ctrl/⌘ K` or `/` focuses it. */
function SearchField({ autoFocus, onDone, className }: { autoFocus?: boolean; onDone?: () => void; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        if (!ref.current || ref.current.offsetParent === null) return;
        e.preventDefault();
        ref.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
    ref.current?.blur();
    onDone?.();
  };

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <MagnifyingGlassIcon size={17} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && (ref.current?.blur(), onDone?.())}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        className="h-10 w-full rounded-lg border border-transparent bg-[#F4F4F7] pr-16 pl-10 text-[13px] text-ink outline-none placeholder:text-ink-muted transition-colors focus:border-brand-soft focus:bg-white focus:ring-3 focus:ring-brand-10 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 border-l border-line pl-3 font-sans text-[11px] text-ink-muted sm:inline-flex" aria-hidden>
        ⌘ K
      </kbd>
    </form>
  );
}

/** Violet split button: "Create" plus a menu of what can be created. */
function CreateMenu() {
  const items = [
    { label: "New project", icon: FolderSimplePlusIcon },
    { label: "New task", icon: CheckSquareIcon },
    { label: "New workflow", icon: TreeStructureIcon },
    { label: "New approval", icon: SealCheckIcon },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 shrink-0 items-center rounded-lg bg-brand text-white shadow-[0_1px_2px_rgb(91_63_243/0.3)] transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
        <span className="flex items-center gap-2 px-3 text-button sm:px-4">
          <PlusIcon size={16} weight="bold" aria-hidden />
          <span className="hidden sm:inline">Create</span>
        </span>
        <span className="hidden h-5 w-px bg-white/30 sm:block" aria-hidden />
        <span className="hidden px-3 sm:block">
          <CaretDownIcon size={14} weight="bold" aria-hidden />
        </span>
        <span className="sr-only sm:hidden">Create</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        {items.map(({ label, icon: IconCmp }) => (
          <DropdownMenuItem key={label} onSelect={() => comingSoon(label)}>
            <IconCmp aria-hidden /> {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NOTIFICATIONS = [
  { id: "n1", text: "Mike Johnson approved Budget Review", at: "10m ago" },
  { id: "n2", text: "Warehouse Expansion is blocked by a vendor delay", at: "1h ago" },
  { id: "n3", text: "Anna Singh commented on ERP Deployment", at: "3h ago" },
];

function NotificationsMenu() {
  const [unread, setUnread] = useState(true);
  return (
    <DropdownMenu onOpenChange={(open) => open && setUnread(false)}>
      <DropdownMenuTrigger aria-label={unread ? "Notifications (unread)" : "Notifications"} className={toolClass}>
        <BellIcon size={20} aria-hidden />
        {unread && <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#EF4444] ring-2 ring-white" aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-0">
        <DropdownMenuLabel className="px-4 pt-3 pb-2 text-[14px] font-semibold text-ink">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        {NOTIFICATIONS.map((n) => (
          <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 rounded-none px-4 py-2.5" onSelect={() => comingSoon("Notifications")}>
            <span className="text-[13px] leading-5 text-ink">{n.text}</span>
            <span className="text-[12px] leading-4 text-ink-muted">{n.at}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderTip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppHeader() {
  const { setDrawerOpen } = useShell();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex h-[60px] items-center gap-2 border-b border-line bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-5 lg:left-[var(--sidebar-w)] lg:h-[var(--header-h)] lg:border-line-soft lg:px-9">
      {/* Phones / tablets: menu button opens the navigation drawer */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand-depth-10 lg:hidden"
      >
        <ListIcon size={20} weight="bold" aria-hidden />
      </button>
      <LogoMark className="size-8 md:hidden" />

      <SearchField className="hidden max-w-[568px] flex-1 md:block" />
      <div className="flex-1 md:hidden" />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <button type="button" onClick={() => setMobileSearch(true)} aria-label="Search" className={cn(toolClass, "md:hidden")}>
          <MagnifyingGlassIcon size={20} aria-hidden />
        </button>
        <CreateMenu />
        <div className="ml-1 flex items-center gap-1 sm:ml-3 sm:gap-2 lg:gap-3">
          <NotificationsMenu />
          <HeaderTip label="Ask AI">
            <button type="button" onClick={() => comingSoon("Ask AI")} aria-label="Ask AI" className={cn(toolClass, "bg-brand-tint text-brand hover:bg-brand-10 hover:text-brand")}>
              <SparkleIcon size={20} weight="duotone" aria-hidden />
            </button>
          </HeaderTip>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More" className={cn(toolClass, "hidden sm:inline-flex")}>
              <DotsThreeIcon size={22} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onSelect={() => comingSoon("Keyboard shortcuts")}>Keyboard shortcuts</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => comingSoon("What's new")}>What&apos;s new</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => comingSoon("Help center")}>Help center</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Account menu for ${me.name}`}
              className="ml-1 inline-flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-brand-depth-10 focus-visible:outline-2 focus-visible:outline-brand-action sm:pr-2"
            >
              <PersonAvatar name={me.name} src={me.avatar} size="lg" className="size-9" />
              <CaretDownIcon size={14} aria-hidden className="hidden text-ink-muted sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="px-2 py-1.5">
                <span className="block text-[14px] font-semibold text-ink">{me.name}</span>
                <span className="block text-[12px] font-normal text-ink-muted">{me.role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => comingSoon("Your profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => comingSoon("Settings")}>Settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => comingSoon("Signing out")}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Phones: search opens as a bar over the header */}
      {mobileSearch && (
        <div className="absolute inset-0 flex items-center gap-2 bg-white px-3 md:hidden">
          <SearchField autoFocus onDone={() => setMobileSearch(false)} className="flex-1" />
          <button type="button" onClick={() => setMobileSearch(false)} aria-label="Close search" className={toolClass}>
            <XIcon size={18} aria-hidden />
          </button>
        </div>
      )}
    </header>
  );
}
