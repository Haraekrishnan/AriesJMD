import type { CapaStage, EhsObservation } from './types';
import { needsAction, workflowStatus, responsibleUserId } from './capa-workflow';
export const CAPA_STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];
export type ObservationFilters = { search: string; category: string; risk: string; status: string; site: string; date?: Date };
export const EMPTY_OBSERVATION_FILTERS: ObservationFilters = { search: '', category: 'all', risk: 'all', status: 'all', site: 'all' };
export function observationText(value: string = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
export function isObservationOverdue(observation: EhsObservation, now = new Date()) {
  if (observation.status === 'Closed') return false;
  const stage = observation.stages?.[observation.currentStage];
  const phaseDeadline = stage?.status === 'In Progress' ? stage.reviewTargetDate : stage?.targetDate;
  if (phaseDeadline) return Number.isFinite(Date.parse(phaseDeadline)) && new Date(phaseDeadline) < now;
  if (!observation.targetDate) return false;
  const target = new Date(observation.targetDate);
  target.setHours(23, 59, 59, 999);
  return Number.isFinite(target.getTime()) && target < now;
}
export function filterObservations(observations: EhsObservation[], filters: ObservationFilters, tab: string, userId?: string, now = new Date()) {
  const query = filters.search.trim().toLowerCase();
  return observations.filter(o => {
    if (o.parentId) return false;
    if (tab === 'mine' && !needsAction(o, userId)) return false;
    if (tab === 'review' && (!needsAction(o, userId) || workflowStatus(o) !== 'Awaiting review')) return false;
    if (tab === 'rework' && (!needsAction(o, userId) || workflowStatus(o) !== 'Rework required')) return false;
    if (tab === 'closed' && o.status !== 'Closed') return false;
    const statusMatches = filters.status === 'all' || filters.status === workflowStatus(o) || (filters.status === 'Returned' && workflowStatus(o) === 'Rework required') ||
      (filters.status === 'active' ? ['Open', 'In Progress'].includes(o.status) :
       filters.status === 'Overdue' ? isObservationOverdue(o, now) : o.status === filters.status);
    const riskMatches = filters.risk === 'all' ||
      (filters.risk === 'high-priority' ? ['High', 'Critical'].includes(o.severity) : o.severity === filters.risk);
    return (!query || `${o.id} CAPA-${o.id.slice(-6)} ${observationText(o.description)} ${o.location || ''}`.toLowerCase().includes(query)) &&
      (filters.category === 'all' || o.category === filters.category) && riskMatches && statusMatches &&
      (filters.site === 'all' || o.projectId === filters.site) &&
      (!filters.date || new Date(o.createdAt).toDateString() === filters.date.toDateString());
  }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function observationCsv(rows: EhsObservation[], projectName: (id: string) => string, userName: (id: string) => string = id => id) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    // Treat user-entered descriptions as text rather than spreadsheet formulas.
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [['Case ID', 'Observation', 'Category', 'Risk', 'Status', 'Site', 'Created', 'Target date', 'Current stage', 'Workflow status', 'Currently assigned to', 'Reported / created by'],
    ...rows.map(o => [`CAPA-${o.id.slice(-6).toUpperCase()}`, observationText(o.description), o.category, o.severity, o.status, projectName(o.projectId), o.createdAt, o.targetDate || '', o.currentStage, workflowStatus(o), userName(responsibleUserId(o) || ''), userName(o.reporterId)])
  ].map(row => row.map(cell).join(',')).join('\r\n');
}
