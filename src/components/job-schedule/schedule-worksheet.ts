import type { JobSchedule, JobScheduleItem } from '@/lib/types';

export const scheduleColumns = ['Personnel assignments', 'Job type', 'Job No.', 'Project / Vessel', 'Project', 'Location details', 'Reporting time', 'Client / Contact', 'Vehicle', 'Remarks'];

export function scheduleAssignmentConflict(items: Pick<JobScheduleItem, 'manpowerIds'>[], otherAssignedIds: Set<string>): string | null {
  const seen = new Set<string>();
  for (const item of items) for (const id of item.manpowerIds || []) {
    if (seen.has(id) || otherAssignedIds.has(id)) return id;
    seen.add(id);
  }
  return null;
}

export function otherScheduleAssignments(schedules: JobSchedule[], date: string, currentId?: string): Set<string> {
  return new Set(schedules.filter(s => s.date === date && s.id !== currentId).flatMap(s => (s.items || []).flatMap(item => item.manpowerIds || [])));
}

export function copyScheduleJobDetails(item: JobScheduleItem, newId: string): JobScheduleItem {
  return { ...item, id: newId, manpowerIds: [] };
}
