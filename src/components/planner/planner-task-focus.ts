import { format } from 'date-fns';
import type { PlannerEvent } from '@/lib/types';
type Row = { event: PlannerEvent; eventDate: Date };
export function taskTiming(row: Row, today: string) {
 const day=format(row.eventDate,'yyyy-MM-dd');
 const status=row.event.instanceStatuses?.[day] || 'Not Started';
 if (['Completed','Not Applicable'].includes(status)) return 'closed';
 return day<today?'overdue':day===today?'today':'upcoming';
}
export function includeInTaskView(row: Row, today:string, tab:string, from:string, to:string, status:string, futureMonth:boolean) {
 const timing=taskTiming(row,today);
 const explicitDate=!!from || !!to || futureMonth;
 if(tab==='Pending Tasks')return timing!=='closed' && (timing!=='upcoming'||explicitDate);
 if(tab==='Current Tasks')return timing==='today';
 if(tab==='Upcoming')return timing==='upcoming';
 if(tab==='Overdue')return timing==='overdue';
 if(explicitDate)return true;
 if(timing==='upcoming')return false;
 return tab==='Completed' || !!status || timing!=='closed';
}
