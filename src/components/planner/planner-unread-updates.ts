import type { Comment, DailyPlannerComment, PlannerEvent } from '@/lib/types';
export function unreadTaskComments(comments: Comment[], viewerId?: string) {
 return viewerId ? comments.filter(c=>c.userId!==viewerId && !c.viewedBy?.[viewerId] && !!c.text?.trim()) : [];
}
export function latestTaskComment(comments: Comment[]) {
 return [...comments].filter(c=>c.text?.trim()).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))[0];
}
// Use saved conversations rather than this month's task expansion: completed and older updates must be discoverable.
export function unreadTaskRows(events: PlannerEvent[], days: DailyPlannerComment[], viewerId: string | undefined) {
 const byId=new Map(events.map(e=>[e.id,e]));
 const found=new Map<string,{event:PlannerEvent;eventDate:Date}>();
 for(const day of days) for(const comment of unreadTaskComments(Object.values(day.comments||{}),viewerId)) {
  const event=comment.eventId ? byId.get(comment.eventId) : undefined;
  if(!event || event.userId!==day.plannerUserId || !/^\d{4}-\d{2}-\d{2}$/.test(day.day))continue;
  const date=new Date(day.day+'T00:00:00');if(Number.isNaN(date.getTime()))continue;
  found.set(event.id+':'+day.day,{event,eventDate:date});
 }
 return [...found.values()];
}
