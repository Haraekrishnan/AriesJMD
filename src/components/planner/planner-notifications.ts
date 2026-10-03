import { format, parseISO } from 'date-fns';
import type { PlannerEvent, DailyPlannerComment } from '@/lib/types';
/** One badge per unread event occurrence, including later recurring dates. */
export function plannerNotificationTotal(userId: string, events: PlannerEvent[], days: DailyPlannerComment[]): number {
  const unread = new Set<string>();
  const eligible = (e: PlannerEvent, day: string) => !e.removedOccurrences?.[day] && e.instanceStatuses?.[day] !== 'Not Applicable';
  for (const event of events) {
    if (!event.date || event.userId !== userId || event.creatorId === userId || event.viewedBy?.[userId]) continue;
    const date = parseISO(event.date); if (Number.isNaN(date.getTime())) continue;
    const day = format(date, 'yyyy-MM-dd');
    const initial = days.find(b => b.day === day && b.plannerUserId === event.userId);
    const thread = Object.values(initial?.comments || {}).filter(c => c.eventId === event.id && c.userId !== userId);
    // Later replies also update legacy event flags; do not resurrect a read initial assignment.
    if (eligible(event, day) && (!thread.length || thread.some(c => !c.viewedBy?.[userId]))) unread.add(event.id + '_' + day);
  }
  for (const block of days) {
    if (!block.day || !block.comments) continue;
    for (const comment of Object.values(block.comments)) {
      const event = events.find(e => e.id === comment?.eventId);
      if (!event || block.plannerUserId !== event.userId || ![event.creatorId, event.userId].includes(userId) || !eligible(event, block.day)) continue;
      if (comment.userId !== userId && !comment.viewedBy?.[userId]) unread.add(event.id + '_' + block.day);
    }
  }
  return unread.size;
}
export function plannerDelegationEmail(event: Omit<PlannerEvent, 'id'>, creatorName: string, appUrl: string) {
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const day = format(parseISO(event.date), 'yyyy-MM-dd');
  const link = appUrl.replace(/\/$/, '') + '/planner?userId=' + encodeURIComponent(event.userId) + '&date=' + day;
  return '<h2>New planning delegated to you</h2><p><strong>' + escape(creatorName) + '</strong> assigned the following planning to you.</p>' +
    '<h3>' + escape(event.title) + '</h3><p style="white-space:pre-wrap">' + escape(event.description || 'No description provided.') + '</p>' +
    '<p><strong>Date:</strong> ' + day + '<br><strong>Time:</strong> ' + escape(event.time || 'Not specified') + '<br><strong>Frequency:</strong> ' + escape(event.frequency) + '<br><strong>Category:</strong> ' + escape(event.category || 'General') + '<br><strong>Location:</strong> ' + escape(event.location || 'Not specified') + '</p><p><a href="' + escape(link) + '">Open your Planner</a></p>';
}
