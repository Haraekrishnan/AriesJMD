import { addMonths, startOfMonth, startOfYear, endOfMonth, format, isValid, parseISO } from 'date-fns';

export type DashboardPeriod = 'six-months' | 'twelve-months' | 'this-year';
type Incident = { date: string; projectId: string; type: string };
type Audit = { date: string; projectId: string; status: string; score: number };
type Training = { date: string };

export function dashboardSummary(incidents: Incident[], audits: Audit[], trainings: Training[], site: string, period: DashboardPeriod, now = new Date()) {
  const start = period === 'this-year' ? startOfYear(now) : startOfMonth(addMonths(now, period === 'six-months' ? -5 : -11));
  const end = endOfMonth(now);
  const inPeriod = (value: string) => { const date = parseISO(value); return isValid(date) && date >= start && date <= now; };
  const selectedIncidents = incidents.filter(i => inPeriod(i.date) && (site === 'all' || i.projectId === site));
  const selectedAudits = audits.filter(a => inPeriod(a.date) && (site === 'all' || a.projectId === site) && a.status === 'Approved' && Number.isFinite(a.score) && a.score >= 0 && a.score <= 100);
  const months: { key: string; month: string; label: string; incidents: number; auditScore: number | null; auditCount: number }[] = [];
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    const key = format(cursor, 'yyyy-MM');
    const matches = selectedAudits.filter(a => format(parseISO(a.date), 'yyyy-MM') === key);
    months.push({ key, month: format(cursor, 'MMM'), label: format(cursor, 'MMM yyyy'), incidents: selectedIncidents.filter(i => format(parseISO(i.date), 'yyyy-MM') === key).length, auditScore: matches.length ? Math.round(matches.reduce((total,a) => total+a.score,0)/matches.length*10)/10 : null, auditCount: matches.length });
  }
  return { start, end, months, incidents: selectedIncidents.length, ltis: selectedIncidents.filter(i => i.type === 'LTI').length,
    auditCount: selectedAudits.length, auditScore: selectedAudits.length ? selectedAudits.reduce((sum,a) => sum+a.score,0)/selectedAudits.length : null,
    // Existing training records have neither site nor duration. Do not invent training hours.
    trainingSessions: site === 'all' ? trainings.filter(t => inPeriod(t.date)).length : null,
    periodLabel: format(start, start.getFullYear() === now.getFullYear() ? 'MMM' : 'MMM yyyy') + ' – ' + format(now,'MMM yyyy'),
  };
}

export function dashboardCsv(summary: ReturnType<typeof dashboardSummary>) {
  return ['Month,Incidents,Average approved audit score,Approved audits', ...summary.months.map(m => [m.key,m.incidents,m.auditScore ?? '',m.auditCount].join(','))].join('\r\n');
}
