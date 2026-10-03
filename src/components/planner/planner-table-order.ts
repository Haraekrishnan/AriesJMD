import { format } from 'date-fns';
import type { PlannerEvent, Comment } from '@/lib/types';
type Row = { event: PlannerEvent; eventDate: Date };
export function plannerTaskOrder(a: Row, b: Row, today: string): number {
  const day = (r: Row) => format(r.eventDate, 'yyyy-MM-dd');
  const active = (r: Row) => !['Completed','Not Applicable'].includes(r.event.instanceStatuses?.[day(r)] || 'Not Started');
  const rank = (r: Row) => day(r) === today ? 0 : day(r) < today && active(r) ? 1 : day(r) > today && active(r) ? 2 : 3;
  const group = rank(a) - rank(b); if (group) return group;
  const dateOrder = day(a).localeCompare(day(b));
  return (rank(a) === 3 ? -dateOrder : dateOrder) || (a.event.time || '').localeCompare(b.event.time || '') || a.event.title.localeCompare(b.event.title) || a.event.id.localeCompare(b.event.id);
}
export function latestPlannerUpdate(_event: PlannerEvent, comments: Comment[]): string {
  return [...comments].filter(c => c.text?.trim()).sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0]?.text || 'No comments yet';
}
