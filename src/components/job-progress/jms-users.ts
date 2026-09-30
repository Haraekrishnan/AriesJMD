import type { User } from '@/lib/types';
/** Missing status is a legacy active account. Never apply reporting hierarchy here. */
export function isJmsAssignee(user: User | undefined): user is User {
 return !!user && user.role.trim().toLowerCase() !== 'manager' && user.status !== 'locked' && user.status !== 'deactivated';
}
export function jmsAssignees(users: readonly User[]): User[] {
 return users.filter(isJmsAssignee).sort((a,b) => a.name.localeCompare(b.name));
}
export function canReassignJms(user: User | null | undefined, canManage = false): boolean {
 return !!user && user.status !== 'locked' && user.status !== 'deactivated' && (canManage || ['Admin','Project Coordinator','Document Controller'].includes(user.role));
}
