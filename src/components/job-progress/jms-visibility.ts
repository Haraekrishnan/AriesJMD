import type { JobProgress, User } from '@/lib/types';

type Viewer = Pick<User, 'id' | 'role' | 'projectIds'>;
export function isJmsCreator(job: Pick<JobProgress, 'creatorId'>, user: Pick<User, 'id'> | null | undefined): boolean {
  return !!user?.id && job.creatorId === user.id;
}
export function canSeeJms(job: Pick<JobProgress, 'creatorId' | 'projectId' | 'steps'>, user: Viewer | null | undefined, hasTrackerPermission: boolean): boolean {
  if (!user?.id) return false;
  // Authorship survives project transfers, permission changes and stage reassignment.
  if (isJmsCreator(job, user)) return true;
  if (!hasTrackerPermission) return false;
  if (['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role)) return true;
  return (job.steps || []).some(step => step.assigneeId === user.id) || !!user.projectIds?.includes(job.projectId);
}
