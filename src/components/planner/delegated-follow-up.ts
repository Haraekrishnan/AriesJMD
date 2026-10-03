import type { Comment, PlannerEvent } from '@/lib/types';

/** Follow-up state comes from saved conversation history, not temporary UI state. */
export function delegatedFollowUp(event: PlannerEvent, day: string, comments: Comment[]) {
  const thread = comments.filter(c => c.eventId === event.id);
  const requests = thread.filter(c => c.userId === event.creatorId &&
    !c.text.startsWith(`Event "${event.title}" delegated by `));
  const latestRequest = requests.sort((a,b) => a.date.localeCompare(b.date)).at(-1);
  const responses = thread.filter(c => c.userId === event.userId);
  if (event.removedOccurrences?.[day] || ['Completed', 'Not Applicable'].includes(event.instanceStatuses?.[day] || '')) {
    return { state: 'up-to-date' as const, latestRequest };
  }
  if (latestRequest && !responses.some(c => c.date >= latestRequest.date)) {
    return { state: 'awaiting-reply' as const, latestRequest };
  }
  if (responses.length || event.instanceStatuses?.[day] === 'Completed') {
    return { state: 'up-to-date' as const, latestRequest };
  }
  return { state: 'needs-update' as const, latestRequest };
}
