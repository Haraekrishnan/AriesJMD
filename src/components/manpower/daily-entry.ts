export type DailyRow = { projectId: string; projectName: string; openingManpower: number; countIn: number; countOut: number; countOnLeave: number; reason: string };
export type DailyEvent = { action: 'save' | 'unlock'; actorId: string; actorName: string; at: number; reason: string; rows: DailyRow[] };
export type DailyEntry = { date: string; revision: number; locked: boolean; rows: DailyRow[]; savedBy: string; savedByName: string; savedAt: number; history: Record<string, DailyEvent> };
export function validateDailyRows(rows: DailyRow[]) {
  if (!rows.length) throw Error('No projects to save.');
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.projectId || ids.has(row.projectId)) throw Error('Each project must appear once.');
    ids.add(row.projectId);
    for (const value of [row.openingManpower, row.countIn, row.countOut, row.countOnLeave]) if (!Number.isSafeInteger(value) || value < 0) throw Error(row.projectName + ': enter whole numbers of zero or more.');
    const closing = row.openingManpower + row.countIn - row.countOut;
    if (closing < 0 || row.countOnLeave > closing) throw Error(row.projectName + ': Out or Leave exceeds the available manpower.');
  }
}
export function changeDailyEntry(current: DailyEntry | null, request: { date: string; revision: number; action: 'save' | 'unlock'; rows: DailyRow[]; reason: string; actorId: string; actorName: string; admin: boolean; canLog: boolean; at: number }): DailyEntry {
  if (!request.actorId) throw Error('Sign in to continue.');
  if ((current?.revision || 0) !== request.revision) throw Error('This day changed in another session. Reload the day before continuing.');
  if (request.action === 'unlock') {
    if (!request.admin) throw Error('Only an Admin can unlock a saved day.');
    if (!current?.locked) throw Error('This day is not locked.');
    if (!request.reason.trim()) throw Error('Enter a reason for unlocking.');
  } else {
    if (!request.canLog && !request.admin) throw Error('You do not have permission to log manpower.');
    if (current?.locked) throw Error('This day is locked. Ask an Admin to unlock it.');
    validateDailyRows(request.rows);
  }
  const revision = (current?.revision || 0) + 1;
  const rows = request.action === 'save' ? request.rows : current!.rows;
  return { date: request.date, revision, locked: request.action === 'save', rows,
    savedBy: request.action === 'save' ? request.actorId : current!.savedBy,
    savedByName: request.action === 'save' ? request.actorName : current!.savedByName,
    savedAt: request.action === 'save' ? request.at : current!.savedAt,
    history: { ...(current?.history || {}), [String(revision)]: { action: request.action, actorId: request.actorId, actorName: request.actorName, at: request.at, reason: request.reason.trim(), rows } },
  };
}
export function legacyDailyEntry(date: string, logs: { id: string; date: string; projectId: string; openingManpower: number; countIn: number; countOut: number; countOnLeave: number; reason: string; updatedBy: string; updatedAt: string }[], projects: {id:string;name:string}[], users: {id:string;name:string}[]): DailyEntry | null {
  const latest = new Map<string, typeof logs[number]>();
  logs.filter(l=>l.date===date).forEach(log=>{if(!latest.has(log.projectId)||latest.get(log.projectId)!.updatedAt<log.updatedAt)latest.set(log.projectId,log);});
  if (!latest.size) return null;
  const rows = Array.from(latest.values()).map(l=>({projectId:l.projectId,projectName:projects.find(p=>p.id===l.projectId)?.name||l.projectId,openingManpower:l.openingManpower||0,countIn:l.countIn||0,countOut:l.countOut||0,countOnLeave:l.countOnLeave||0,reason:l.reason||''}));
  const last = Array.from(latest.values()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
  const history: Record<string,DailyEvent> = {};
  Array.from(latest.values()).forEach((l,i)=>{history['legacy-'+i]={action:'save',actorId:l.updatedBy,actorName:users.find(u=>u.id===l.updatedBy)?.name||l.updatedBy,at:Date.parse(l.updatedAt)||0,reason:'Previous saved project log',rows:[rows.find(r=>r.projectId===l.projectId)!]};});
  return {date,revision:0,locked:true,rows,savedBy:last.updatedBy,savedByName:users.find(u=>u.id===last.updatedBy)?.name||last.updatedBy,savedAt:Date.parse(last.updatedAt)||0,history};
}

/** Expand an editable day without changing its saved values or historical snapshots. */
export function includeMissingDailyProjects(rows: DailyRow[], projects: { id: string; name: string }[]): DailyRow[] {
  const known = new Set(rows.map(row => row.projectId));
  return [...rows, ...projects.filter(project => !known.has(project.id)).map(project => ({
    projectId: project.id, projectName: project.name,
    openingManpower: 0, countIn: 0, countOut: 0, countOnLeave: 0, reason: '',
  }))];
}
