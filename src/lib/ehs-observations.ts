import type { CapaStage, EhsObservation } from './types';

/**
 * Institutional lifecycle milestones for the CAPA process.
 */
export const CAPA_STAGES: CapaStage[] = [
  'Initiation',
  'Investigation',
  'Resolution',
  'Implementation',
  'Effectiveness Review',
  'Reference',
  'Closure'
];

export type ObservationFilters = {
  search: string;
  category: string;
  risk: string;
  status: string;
  site: string;
  date?: Date;
};

export const EMPTY_OBSERVATION_FILTERS: ObservationFilters = {
  search: '',
  category: 'all',
  risk: 'all',
  status: 'all',
  site: 'all'
};

/**
 * Sanitizes discovery narrative for plain text display.
 */
export function observationText(value: string = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines if a technical milestone has exceeded its governance deadline.
 */
export function isObservationOverdue(observation: EhsObservation, now = new Date()) {
  if (observation.status === 'Closed' || !observation.targetDate) return false;
  const target = new Date(observation.targetDate);
  target.setHours(23, 59, 59, 999);
  return Number.isFinite(target.getTime()) && target < now;
}

/**
 * Filters the institutional observation registry based on active governance parameters.
 */
export function filterObservations(
  observations: EhsObservation[],
  filters: ObservationFilters,
  tab: string,
  userId?: string,
  now = new Date()
) {
  const query = filters.search.trim().toLowerCase();
  
  return observations.filter(o => {
    if (o.parentId) return false;
    
    // Role-based visibility
    if (tab === 'mine' && (!userId || o.stages?.[o.currentStage]?.assigneeId !== userId)) return false;
    if (tab === 'closed' && o.status !== 'Closed') return false;
    
    const statusMatches = filters.status === 'all' ||
      (filters.status === 'active' ? ['Open', 'In Progress'].includes(o.status) :
       filters.status === 'Overdue' ? isObservationOverdue(o, now) : o.status === filters.status);
       
    const riskMatches = filters.risk === 'all' ||
      (filters.risk === 'high-priority' ? ['High', 'Critical'].includes(o.severity) : o.severity === filters.risk);
      
    const matchesSearch = !query || 
      `${o.id} CAPA-${o.id.slice(-6)} ${observationText(o.description)} ${o.location || ''}`
        .toLowerCase()
        .includes(query);
        
    return matchesSearch &&
      (filters.category === 'all' || o.category === filters.category) &&
      riskMatches &&
      statusMatches &&
      (filters.site === 'all' || o.projectId === filters.site) &&
      (!filters.date || new Date(o.createdAt).toDateString() === filters.date.toDateString());
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Generates a technical CSV export for the observation registry.
 */
export function observationCsv(rows: EhsObservation[], projectName: (id: string) => string) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  
  const headers = ['Case ID', 'Observation', 'Category', 'Risk', 'Status', 'Site', 'Created', 'Target date'];
  
  const data = rows.map(o => [
    `CAPA-${o.id.slice(-6).toUpperCase()}`,
    observationText(o.description),
    o.category,
    o.severity,
    o.status,
    projectName(o.projectId),
    o.createdAt,
    o.targetDate || ''
  ]);
  
  return [headers, ...data].map(row => row.map(cell).join(',')).join('\r\n');
}
