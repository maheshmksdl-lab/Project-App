"use client";

/**
 * Small chart kit for Reports and Portfolio: labelled horizontal bar lists
 * (every bar carries its label and value as text, so colour is never the only
 * cue) inside a card that can switch to a plain table view.
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChartBarHorizontalIcon, TableIcon } from "@phosphor-icons/react/dist/ssr";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Card } from "./project-ui";

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Text shown at the bar's end (defaults to the value). */
  display?: string;
  /** Second line in the tooltip. */
  detail?: string;
  /** Mark colour; single-series charts keep the default violet. */
  color?: string;
  href?: string;
}

/** Bars grow from one baseline; the longest fills the track. */
export function BarList({ data, max, label }: { data: BarDatum[]; max?: number; label: string }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-1" aria-label={label}>
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, (d.value / top) * 100));
        const row = (
          <span className="grid grid-cols-[minmax(84px,38%)_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 transition-colors group-hover:bg-brand-surface group-focus-visible:bg-brand-surface">
            <span className="truncate text-[12.5px] leading-5 text-ink-body">{d.label}</span>
            <span className="relative block h-2.5 rounded-r-[4px] bg-[#F2F4F7]">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-500 group-hover:brightness-110"
                style={{ width: `${pct}%`, minWidth: d.value > 0 ? 3 : 0, backgroundColor: d.color ?? "#6A4FF6" }}
              />
            </span>
            <span className="min-w-8 text-right text-[12.5px] leading-5 font-medium text-ink tabular-nums">{d.display ?? d.value}</span>
          </span>
        );
        const tip = (
          <TooltipContent side="top" className="text-[12px]">
            <span className="block font-semibold">{d.display ?? d.value}</span>
            <span className="block opacity-80">{d.detail ?? d.label}</span>
          </TooltipContent>
        );
        return (
          <li key={d.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                {d.href ? (
                  <Link href={d.href} className="group block rounded-md outline-none">
                    {row}
                  </Link>
                ) : (
                  <span tabIndex={0} className="group block rounded-md outline-none">
                    {row}
                  </span>
                )}
              </TooltipTrigger>
              {tip}
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

export interface TableColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export function DataTable({ columns, rows, caption }: { columns: TableColumn[]; rows: Record<string, ReactNode>[]; caption: string }) {
  return (
    <div className="relative overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-2 py-2 text-table-header font-medium whitespace-nowrap text-ink-body", c.numeric ? "text-right" : "text-left")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line-soft last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-2 text-ink-body", c.numeric && "text-right tabular-nums")}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A report card with a chart / table switch; the table always holds every value. */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
  legend,
  className,
}: {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  table: { columns: TableColumn[]; rows: Record<string, ReactNode>[] };
  legend?: { label: string; color: string }[];
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card label={title} className={cn("flex flex-col", className)}>
      <header className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] leading-6 font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-[12.5px] leading-5 text-ink-muted">{subtitle}</p>}
        </div>
        <div className="ml-auto flex shrink-0 gap-0.5 rounded-lg bg-[#F2F4F7] p-0.5" role="group" aria-label={`${title} view`}>
          {[
            { on: false, icon: ChartBarHorizontalIcon, label: "Chart" },
            { on: true, icon: TableIcon, label: "Table" },
          ].map(({ on, icon: IconCmp, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={asTable === on}
              aria-label={`Show as ${label.toLowerCase()}`}
              onClick={() => setAsTable(on)}
              className={cn("inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand-action", asTable === on ? "bg-white text-brand shadow-card" : "text-ink-muted hover:text-ink")}
            >
              <IconCmp size={15} aria-hidden />
            </button>
          ))}
        </div>
      </header>
      {legend && !asTable && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-2" aria-label="Legend">
          {legend.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5 text-[12px] text-ink-body">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: l.color }} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1 px-3 pb-4">{asTable ? <div className="px-2"><DataTable caption={title} {...table} /></div> : chart}</div>
    </Card>
  );
}
