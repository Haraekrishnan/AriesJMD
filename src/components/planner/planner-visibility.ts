import type { User, PlannerEvent } from '@/lib/types';
export const ALL_PLANNERS = 'all';
export function plannerVisibleUsers(viewer: User | null | undefined, users: User[]): User[] {
  if (!viewer) return [];
  const all = ['Admin', 'Manager', 'Project Coordinator'].includes(viewer.role);
  const allowed = new Set([viewer.id]);
  const queue = [viewer.id];
  while (queue.length) {
    const parent = queue.shift();
    for (const person of users) if (person.supervisorId === parent && !allowed.has(person.id)) {
      allowed.add(person.id); queue.push(person.id);
    }
  }
  return users.filter(person => (all || allowed.has(person.id)) && person.role !== 'Manager' && person.status !== 'locked' && person.status !== 'deactivated');
}
export function plannerEventVisible(event: PlannerEvent, selected: string, allowedIds: readonly string[]): boolean {
  // Scope by assignee first: a visible creator must never expose a hidden person's planner.
  return allowedIds.includes(event.userId) && (selected === ALL_PLANNERS || (allowedIds.includes(selected) && (event.userId === selected || event.creatorId === selected)));
}
