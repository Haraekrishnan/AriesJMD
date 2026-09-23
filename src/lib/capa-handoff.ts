import type { CapaStage, EhsObservation } from './types';
import { validateStageData } from './capa-workflow';
import { CAPA_STAGES } from './ehs-observations';

export type CapaHandoff = { assigneeId: string; targetDate: string };
export type HandoffUser = {
  id: string;
  name: string;
  role: string;
  status?: string;
};
export const REVIEW_ROLES = [
  'Admin',
  'Senior Safety Supervisor',
  'Project Coordinator',
];

export function validateHandoff(
  value: CapaHandoff | undefined,
  users: HandoffUser[],
  review = false,
  now = new Date(),
) {
  const owner = users.find(
    (u) => u.id === value?.assigneeId && u.status !== 'deactivated',
  );
  if (!owner || (review && !REVIEW_ROLES.includes(owner.role)))
    throw new Error(
      review
        ? 'Select an active supervisor to review this phase.'
        : 'Select an active owner for the next step.',
    );
  const deadline = review ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : new Date(value?.targetDate || '');
  if (!Number.isFinite(deadline.getTime()) || deadline <= now)
    throw new Error('Choose a deadline in the future.');
  return { assigneeId: owner.id, targetDate: deadline.toISOString() };
}

export function transitionCase(
  obs: EhsObservation,
  stage: CapaStage,
  actor: HandoffUser,
  users: HandoffUser[],
  action: 'draft' | 'submit' | 'approve' | 'return',
  handoff: CapaHandoff | undefined,
  data: unknown,
  comment: string,
  now: Date,
  eventId: string,
): EhsObservation {
  const record = obs.stages?.[stage];
  if (!record || obs.status === 'Closed' || obs.currentStage !== stage)
    throw new Error('This phase has changed. Refresh the case and try again.');
  const reviewing = action === 'approve' || action === 'return';
  if (
    reviewing
      ? !REVIEW_ROLES.includes(actor.role) || record.status !== 'In Progress'
      : actor.id !== record.assigneeId ||
        !['Pending', 'Returned'].includes(record.status)
  )
    throw new Error('You cannot perform this action on the current phase.');
  if (action === 'submit' || action === 'approve') validateStageData(stage, action === 'submit' ? data : record.data);
  const iso = now.toISOString();
  const next: EhsObservation = {
    ...obs,
    stages: { ...obs.stages, [stage]: { ...record } },
    lastUpdated: iso,
  };
  const current = next.stages[stage];
  let message = '';
  if (action === 'draft') {
    current.data = data;
    return next;
  }
  if (action === 'submit') {
    current.data = data;
    current.actionedById = actor.id;
    current.actionedAt = iso;
    if (stage === 'Closure') {
      current.status = 'Completed';
      current.reviewedById = actor.id;
      current.reviewedAt = iso;
      next.status = 'Closed';
      next.closedAt = iso;
      message = 'Final safety case closure confirmed.';
    } else {
      const target = validateHandoff(handoff, users, true, now);
      current.status = 'In Progress';
      current.reviewAssigneeId = target.assigneeId;
      current.reviewTargetDate = target.targetDate;
      message = `Submitted ${stage} for review by ${users.find((u) => u.id === target.assigneeId)!.name}. Review deadline: ${target.targetDate}.`;
    }
  } else {
    if (action === 'return' && !comment.trim())
      throw new Error('Explain what needs to be reworked.');
    const targetStage =
      action === 'return' ? stage : CAPA_STAGES[CAPA_STAGES.indexOf(stage) + 1];
    const target = targetStage
      ? validateHandoff(handoff, users, false, now)
      : undefined;
    current.status = action === 'return' ? 'Returned' : 'Completed';
    current.reviewedById = actor.id;
    current.reviewedAt = iso;
    if (targetStage && target) {
      next.stages[targetStage] = {
        ...next.stages[targetStage],
        status: action === 'return' ? 'Returned' : 'Pending',
        assigneeId: target.assigneeId,
        targetDate: target.targetDate,
        assignedById: actor.id,
        assignedAt: iso,
      };
      delete next.stages[targetStage].actionedAt;
      delete next.stages[targetStage].actionedById;
      if (action !== 'return') {
        delete next.stages[targetStage].reviewedAt;
        delete next.stages[targetStage].reviewedById;
      }
      delete next.stages[targetStage].reviewAssigneeId;
      delete next.stages[targetStage].reviewTargetDate;
      next.currentStage = targetStage;
      if (targetStage === 'Closure') next.targetDate = target.targetDate;
      message = `${action === 'return' ? 'Returned' : 'Approved'} ${stage}. Assigned ${targetStage}${action === 'return' ? ' rework' : ''} to ${users.find((u) => u.id === target.assigneeId)!.name}. Deadline: ${target.targetDate}.`;
    } else {
      next.status = 'Closed';
      next.closedAt = iso;
      message = 'Final safety case closure approved.';
    }
    if (action === 'return') {
      next.reworkCount = (next.reworkCount || 0) + 1;
      next.stages[stage].reworkReason = comment.trim();
      message += ' Rework reason: ' + comment.trim();
    }
    if (comment.trim())
      next.stages[stage].comments = {
        ...record.comments,
        [eventId]: {
          id: eventId,
          eventId: obs.id,
          userId: actor.id,
          text: comment.trim(),
          date: iso,
        },
      };
  }
  next.activities = {
    ...obs.activities,
    [eventId]: { id: eventId, userId: actor.id, action: message, date: iso },
  };
  return next;
}
