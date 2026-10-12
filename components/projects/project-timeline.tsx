"use client";

import { useState } from "react";
import { ArrowsOutSimpleIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate, formatMonth, parseDate } from "@/lib/format";
import type { TimelineRow } from "@/lib/types/project";
import { cn } from "@/lib/utils";

type Zoom = "months" | "quarters";

const BAR: Record<TimelineRow["color"], string> = {
  green: "#22C55E",
  purple: "#7C5CFA",
  lavender: "#C4B5FD",
  orange: "#FB923C",
  red: "#F43F5E",
};

/** 12 month columns, or 8 quarter columns (two years). */
const COLUMNS: Record<Zoom, { count: number; months: number; step: number }> = {
  months: { count: 12, months: 1, step: 1 },
  quarters: { count: 8, months: 3, step: 3 },
};

const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Months as "Jan" (the year sits in the corner cell); quarters as "Q1 ’26". */
function columnLabel(d: Date, zoom: Zoom) {
  if (zoom === "quarters") return `Q${Math.floor(d.getMonth() / 3) + 1} ’${String(d.getFullYear()).slice(2)}`;
  return formatMonth(d).split(" ")[0];
}

/** "2026", or "2026–27" when the window crosses a year. */
function yearLabel(start: Date, endExclusive: Date) {
  const last = addMonths(endExclusive, -1).getFullYear();
  return last === start.getFullYear() ? String(last) : `${start.getFullYear()}–${String(last).slice(2)}`;
}

const toolBtn =
  "inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] leading-4 text-ink-body transition-colors hover:border-brand-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:border-brand-soft";

/**
 * Gantt-style plan: one bar per phase (a diamond for a single-day milestone)
 * across month or quarter columns. Prev / next pan by one column; Today
 * brings the current date into view.
 */
export function ProjectTimeline({
  title,
  rows,
  projectStart,
  onExpand,
  tall = false,
}: {
  title: string;
  rows: TimelineRow[];
  projectStart: string;
  onExpand?: () => void;
  tall?: boolean;
}) {
  const initial = new Date(parseDate(projectStart).getFullYear(), 0, 1);
  const [start, setStart] = useState(initial);
  const [zoom, setZoom] = useState<Zoom>("months");
  const cols = COLUMNS[zoom];
  const end = addMonths(start, cols.count * cols.months);
  const span = end.getTime() - start.getTime();
  const pos = (d: Date) => ((d.getTime() - start.getTime()) / span) * 100;

  const goToday = () => {
    const today = new Date();
    const initialEnd = addMonths(initial, cols.count * cols.months);
    if (today >= initial && today < initialEnd) setStart(initial);
    else setStart(addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -cols.months * 2));
  };
  const columns = Array.from({ length: cols.count }, (_, i) => addMonths(start, i * cols.months));
  const rowH = tall ? 34 : 20;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-[15px] leading-6 font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Timeline controls">
          <button type="button" onClick={goToday} className={toolBtn}>
            Today
          </button>
          <span className="inline-flex">
            <button type="button" onClick={() => setStart((s) => addMonths(s, -cols.step))} aria-label="Earlier" className={cn(toolBtn, "rounded-r-none px-1.5")}>
              <CaretLeftIcon size={13} weight="bold" aria-hidden />
            </button>
            <button type="button" onClick={() => setStart((s) => addMonths(s, cols.step))} aria-label="Later" className={cn(toolBtn, "-ml-px rounded-l-none px-1.5")}>
              <CaretRightIcon size={13} weight="bold" aria-hidden />
            </button>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(toolBtn, "min-w-[88px] justify-between")} aria-label={`Zoom: ${zoom}`}>
              {zoom === "months" ? "Months" : "Quarters"}
              <CaretDownIcon size={12} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 rounded-xl">
              <DropdownMenuRadioGroup value={zoom} onValueChange={(v) => setZoom(v as Zoom)}>
                <DropdownMenuRadioItem value="months">Months</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="quarters">Quarters</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {onExpand && (
            <button type="button" onClick={onExpand} aria-label="Open the full timeline" className={cn(toolBtn, "px-1.5")}>
              <ArrowsOutSimpleIcon size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto scrollbar-thin">
        <div className="min-w-[340px]">
          {/* Column headings */}
          <div className="flex">
            <div className="w-[78px] shrink-0 pb-2 text-[9.5px] leading-3 font-medium text-ink-body">{zoom === "months" ? yearLabel(start, end) : ""}</div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${cols.count}, minmax(0, 1fr))` }}>
              {columns.map((c) => (
                <span key={c.toISOString()} className="px-0.5 pb-2 text-center text-[9.5px] leading-3 whitespace-nowrap text-ink-muted" title={formatMonth(c)}>
                  {columnLabel(c, zoom)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex">
            <ul className="w-[78px] shrink-0" aria-hidden>
              {rows.map((r) => (
                <li key={r.id} className="flex items-center truncate pr-2 text-[11px] leading-4 text-ink-body" style={{ height: rowH }}>
                  {r.label}
                </li>
              ))}
            </ul>
            <div className="relative flex-1 border-t border-l border-line-soft">
              {/* Grid lines */}
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols.count}, minmax(0, 1fr))` }} aria-hidden>
                {columns.map((c) => (
                  <span key={c.toISOString()} className="border-r border-line-soft" />
                ))}
              </div>
              <ul className="relative" aria-label="Project phases">
                {rows.map((r) => {
                  const s = parseDate(r.startDate);
                  const e = parseDate(r.endDate);
                  e.setDate(e.getDate() + 1);
                  const left = pos(s);
                  const right = pos(e);
                  const visible = right > 0 && left < 100;
                  const label = r.milestone ? `${r.label}: ${formatDate(r.startDate)}` : `${r.label}: ${formatDate(r.startDate)} to ${formatDate(r.endDate)}`;
                  return (
                    <li key={r.id} className="relative border-b border-line-soft" style={{ height: rowH }}>
                      <span className="sr-only">{label}</span>
                      {visible &&
                        (r.milestone ? (
                          <span
                            className="absolute top-1/2 size-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
                            style={{ left: `${Math.min(98.5, Math.max(1.5, left))}%`, backgroundColor: BAR[r.color] }}
                            title={label}
                          />
                        ) : (
                          <span
                            className={cn("absolute top-1/2 -translate-y-1/2 rounded-full", tall ? "h-3" : "h-[9px]")}
                            style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100, right) - Math.max(0, left)}%`, backgroundColor: BAR[r.color] }}
                            title={label}
                          />
                        ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
