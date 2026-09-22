import type { CapaStage, CapaStageRecord, EhsObservation } from './types';

export const REQUIRED_STAGE_FIELDS: Partial<
  Record<CapaStage, Record<string, string>>
> = {
  Investigation: {
    who: 'Summary: who was involved',
    where: 'Summary: exact site position',
    whenDate: 'Summary: discovery date',
    whenTime: 'Summary: discovery time',
    sequence: 'Summary: sequence of events',
    immediateCause: 'Summary: immediate cause',
    why1: '5-Why: why 1',
    why2: '5-Why: why 2',
    why3: '5-Why: why 3',
    why4: '5-Why: why 4',
    why5: '5-Why: why 5',
    rootCauseCategory: 'Root cause: primary domain',
    finalRootCauseStatement: 'Root cause: official statement',
    investigationConclusion: 'Conclusion: technical summary',
    safetyRecommendations: 'Conclusion: mitigation and recurrence prevention',
  },
  Resolution: { action: 'Remediation plan' },
  Implementation: {
    corrective: 'Corrective action details',
    preventive: 'Preventive controls',
  },
  'Effectiveness Review': {
    verdict: 'Effectiveness verdict',
    findings: 'Validation narrative',
  },
  Closure: { finalSummary: 'Organizational summary' },
};
export function stageValidationErrors(
  stage: CapaStage,
  data: unknown,
): string[] {
  const values = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const errors = Object.entries(REQUIRED_STAGE_FIELDS[stage] || {})
    .filter(
      ([key]) =>
        typeof values[key] !== 'string' ||
        !String(values[key])
          .replace(/<[^>]*>|&nbsp;/g, '')
          .trim(),
    )
    .map(([, label]) => label);
  if (
    values.whenDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(String(values.whenDate)) ||
      !Number.isFinite(Date.parse(String(values.whenDate))) ||
      new Date(String(values.whenDate)).toISOString().slice(0, 10) !==
        values.whenDate)
  )
    errors.push('Summary: valid discovery date');
  if (
    values.whenTime &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(values.whenTime))
  )
    errors.push('Summary: valid discovery time');
  if (
    stage === 'Effectiveness Review' &&
    values.verdict &&
    !['Effective', 'Partially', 'Ineffective'].includes(String(values.verdict))
  )
    errors.push('Select a valid effectiveness verdict');
  return errors;
}
export function validateStageData(stage: CapaStage, data: unknown) {
  const errors = stageValidationErrors(stage, data);
  if (errors.length)
    throw new Error(
      'Complete required fields before submitting or approving: ' +
        errors.join('; '),
    );
}
export function workflowStatus(obs: EhsObservation) {
  if (obs.status === 'Closed') return 'Closed';
  const status = obs.stages?.[obs.currentStage]?.status;
  return status === 'Returned'
    ? 'Rework required'
    : status === 'In Progress'
      ? 'Awaiting review'
      : 'In progress';
}
export function responsibleUserId(obs: EhsObservation) {
  if (obs.status === 'Closed') return undefined;
  const stage = obs.stages?.[obs.currentStage];
  return stage?.status === 'In Progress'
    ? stage.reviewAssigneeId
    : stage?.assigneeId;
}
export function needsAction(obs: EhsObservation, userId?: string) {
  return (
    !!userId && obs.status !== 'Closed' && responsibleUserId(obs) === userId
  );
}
export function reworkNote(record?: CapaStageRecord) {
  if (record?.reworkReason) return record.reworkReason;
  if (record?.status !== 'Returned') return '';
  return (
    Object.values(record.comments || {})
      .filter((c) => c.userId === record.reviewedById)
      .sort((a, b) => b.date.localeCompare(a.date))[0]?.text || ''
  );
}
