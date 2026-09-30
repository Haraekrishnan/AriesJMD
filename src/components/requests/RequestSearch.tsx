'use client';
import { useId } from 'react';
import { Search } from 'lucide-react';
export default function RequestSearch({value, onChange, active, completed}: {value: string; onChange: (value: string) => void; active: number; completed: number}) {
 const id = useId();
 return <div className="rounded-lg border bg-white p-3 space-y-2">
  <label htmlFor={id} className="text-sm font-medium">Search people in active & completed requests</label>
  <div className="flex items-center gap-2"><Search size={17} aria-hidden="true" className="text-muted-foreground"/><input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder="Search by name, employee code, EP number or request ID…" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"/>{value && <button type="button" onClick={() => onChange('')} className="text-sm text-blue-600">Clear search</button>}</div>
  {value.trim() && <p role="status" className="text-xs text-muted-foreground">{active} active and {completed} completed matches. Searching all pages.</p>}
 </div>;
}
