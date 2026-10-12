import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { Person } from "@/lib/types/project";

const SIZES = {
  xs: { box: "size-5", text: "text-[9px]" },
  sm: { box: "size-[26px]", text: "text-[10px]" },
  md: { box: "size-8", text: "text-xs" },
  lg: { box: "size-10", text: "text-sm" },
} as const;

type Size = keyof typeof SIZES;

/** Profile photo with an initials fallback (shown while loading or if the image fails). */
export function PersonAvatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: Size; className?: string }) {
  return (
    <Avatar className={cn("shrink-0 after:border-white/0", SIZES[size].box, className)} aria-hidden="true">
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn("bg-brand-10 font-bold text-ink", SIZES[size].text)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** Overlapping faces with a "+N" chip — team members on lists, cards and the project header. */
export function AvatarStack({
  people,
  extra = 0,
  size = "sm",
  className,
}: {
  people: Person[];
  extra?: number;
  size?: Size;
  className?: string;
}) {
  const label = [...people.map((p) => p.name), ...(extra ? [`${extra} more`] : [])].join(", ");
  return (
    <span className={cn("inline-flex items-center", className)} role="img" aria-label={label}>
      {people.map((p, i) => (
        <PersonAvatar key={p.id} name={p.name} src={p.avatar} size={size} className={cn("ring-2 ring-white", i > 0 && "-ml-1.5")} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "-ml-1.5 inline-flex items-center justify-center rounded-full bg-brand-tint font-semibold text-brand ring-2 ring-white",
            SIZES[size].box,
            size === "md" || size === "lg" ? "text-[12px]" : "text-[10px]",
          )}
          aria-hidden
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
