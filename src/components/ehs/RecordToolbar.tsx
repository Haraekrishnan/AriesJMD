'use client';
import { Button } from '@/components/ui/button';
import { Download, Search, RotateCcw } from 'lucide-react';

export type RecordFilter = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};
export function RecordSelect({
  label,
  value,
  onChange,
  options,
}: RecordFilter) {
  return (
    <label className="flex max-w-full min-w-0 flex-col gap-1 text-xs text-slate-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-blue-600"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function RecordToolbar({
  search,
  onSearch,
  filters = [],
  count,
  onReset,
  onExport,
}: {
  search: string;
  onSearch: (value: string) => void;
  filters?: RecordFilter[];
  count: number;
  onReset: () => void;
  onExport?: () => void;
}) {
  return (
    <section
      aria-label="Record filters"
      className="space-y-3 rounded-xl border bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[180px] flex-1 text-xs text-slate-500">
          Search records
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3 h-4 w-4" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search records…"
              className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-slate-900 focus:outline-blue-600"
            />
          </div>
        </label>
        {filters.map((filter) => (
          <RecordSelect key={filter.label} {...filter} />
        ))}
        <Button variant="ghost" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            disabled={!count}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>
      <p role="status" className="text-xs text-slate-500">
        {count} matching {count === 1 ? 'record' : 'records'}
      </p>
    </section>
  );
}

export function RecordMetrics({
  items,
}: {
  items: { label: string; value: number | string; note?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {item.value}
          </p>
          {item.note && (
            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}
