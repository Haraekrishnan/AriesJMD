import type { Comment, PlannerEvent } from '@/lib/types';
import { delegatedFollowUp } from './delegated-follow-up';
export type ReviewState = 'needs-update' | 'awaiting-reply' | 'new-reply';
export type ReviewItem = { key: string; day: string; event: PlannerEvent; comments: Comment[]; unread: Comment[]; state: ReviewState; version: string };
// Reading a message is not new activity. Content, task edits, status changes and new messages are.
export function reviewVersion(event: PlannerEvent, day: string, comments: Comment[]): string {
  const value = JSON.stringify([day, event.title, event.description || '', event.date, event.frequency, event.userId, event.creatorId, event.time || '', event.category || '', event.location || '', event.equipmentRef || '', event.instanceStatuses?.[day] || 'Not Started', comments.map(c=>[c.id,c.userId,c.date,c.text]).sort((a,b)=>a[0].localeCompare(b[0]))]);
  // Two independent hashes keep stored preferences compact without saving private message text twice.
  let a=2166136261, b=5381;
  for(let i=0;i<value.length;i++){ a=Math.imul(a^value.charCodeAt(i),16777619); b=Math.imul(b,33)^value.charCodeAt(i); }
  return (a>>>0).toString(36)+'-'+(b>>>0).toString(36);
}
export function reviewItem(event: PlannerEvent, day: string, comments: Comment[], viewerId: string, past: boolean, dismissedVersion?: string, legacyDismissed=false): ReviewItem | null {
  if(event.creatorId===event.userId || ![event.creatorId,event.userId].includes(viewerId)) return null;
  const thread=comments.filter(c=>c.eventId===event.id).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const version=reviewVersion(event,day,thread);
  if(dismissedVersion===version) return null;
  const unread=thread.filter(c=>c.userId!==viewerId&&!c.viewedBy?.[viewerId]);
  const followUp=delegatedFollowUp(event,day,thread);
  const changed=!!dismissedVersion && dismissedVersion!==version;
  const status=event.instanceStatuses?.[day] || 'Not Started';
  const overdueIncomplete=past && (status==='Not Started' || status==='In Progress');
  let state: ReviewState | undefined;
  // Conversations remain accessible independently of automatic overdue reminders.
  if(unread.length) state='new-reply';
  else if(viewerId===event.creatorId) {
    // Missing comments, an old unanswered request, or a changed version must not
    // resurrect reminders for completed, pending, current-day or future tasks.
    if(overdueIncomplete && (!legacyDismissed || changed)) {
      state=followUp.state==='awaiting-reply' ? 'awaiting-reply' : 'needs-update';
    }
  } else if(changed || (!event.viewedBy?.[viewerId] && !thread.length)) state='new-reply';
  return state ? {key:event.id+'_'+day,day,event,comments:thread,unread,state,version} : null;
}

