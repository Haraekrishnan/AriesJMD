import type { EhsObservation, User, CapaStage } from './types';
import { observationText } from './ehs-observations';
import { responsibleUserId, workflowStatus, reworkNote } from './capa-workflow';
export type CapaMailEvent = 'created' | 'submitted' | 'approved' | 'returned';
export function capaEmail(
  obs: EhsObservation,
  users: User[],
  event: CapaMailEvent,
  site: string,
  origin: string,
  changedStage: CapaStage = obs.currentStage,
) {
  const record = obs.stages[obs.currentStage];
  const ownerId = responsibleUserId(obs);
  const recipientIds = new Set([
    ownerId,
    record?.assigneeId,
    obs.reporterId,
    obs.stages[changedStage]?.actionedById,
  ]);
  const recipients = users.filter(
    (u) =>
      u.status !== 'deactivated' &&
      (recipientIds.has(u.id) ||
        ['Senior Safety Supervisor', 'Project Coordinator'].includes(u.role)),
  );
  const to = [
    ...new Set(
      recipients
        .map((u) => u.email?.trim().toLowerCase())
        .filter((email): email is string => !!email),
    ),
  ];
  const name = (id?: string) =>
    users.find((u) => u.id === id)?.name || 'Not assigned';
  const escape = (value: unknown) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!,
    );
  const title = {
    created: 'New safety observation',
    submitted: 'Review required',
    approved: 'Stage approved',
    returned: 'Rework required',
  }[event];
  const deadline =
    record?.status === 'In Progress'
      ? record.reviewTargetDate
      : record?.targetDate;
  const rows = [
    ['Case', 'CAPA-' + obs.id.slice(-6).toUpperCase()],
    ['Event', title + ' · ' + changedStage],
    ['Current stage', obs.currentStage],
    ['Status', workflowStatus(obs)],
    ['Site', site],
    ['Location', obs.location],
    ['Category / risk', obs.category + ' / ' + obs.severity],
    ['Reported / created by', name(obs.reporterId)],
    ['Stage assignee', name(record?.assigneeId)],
    ['Action required from', name(ownerId)],
    ['Deadline (UTC)', deadline || 'Not applicable'],
    ['Observation', observationText(obs.description)],
    ...(event === 'returned'
      ? [['Rework instructions', reworkNote(record)]]
      : []),
  ];
  const details = Object.entries(obs.stages[changedStage]?.data || {})
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(
      ([key, value]) =>
        `<p><strong>${escape(key)}</strong>: ${escape(value)}</p>`,
    )
    .join('');
  return {
    to,
    missingEmails: recipients
      .filter((u) => !u.email?.trim())
      .map((u) => u.name),
    subject: `${title}: CAPA-${obs.id.slice(-6).toUpperCase()} · ${obs.currentStage}`,
    htmlBody: `<h2>${escape(title)}</h2><table>${rows.map(([label, value]) => `<tr><th style="text-align:left;vertical-align:top;padding:8px">${escape(label)}</th><td style="padding:8px;white-space:pre-wrap">${escape(value)}</td></tr>`).join('')}</table>${details ? `<h3>Stage findings</h3>${details}` : ''}<p><a href="${escape(origin + '/ehs/observations?case=' + encodeURIComponent(obs.id))}">Open safety observation</a></p>`,
  };
}
