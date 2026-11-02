import type { JobSchedule, ManpowerProfile } from '@/lib/types';
export function manpowerCoverage(schedules:JobSchedule[], profiles:ManpowerProfile[], date:string, comparison:string) {
 const assigned=new Set(schedules.filter(s=>s.date===date).flatMap(s=>(s.items || []).flatMap(i=>i.manpowerIds || [])));
 const previous=new Map<string,{jobs:Set<string>;projects:Set<string>}>();
 for(const schedule of schedules.filter(s=>s.date===comparison)) for(const item of schedule.items || []) for(const id of item.manpowerIds || []) {
  const entry=previous.get(id) || {jobs:new Set<string>(),projects:new Set<string>()};
  if(item.jobNo) entry.jobs.add(item.jobNo); if(item.projectId) entry.projects.add(item.projectId); previous.set(id,entry);
 }
 const byId=new Map(profiles.map(p=>[p.id,p]));
 const missing=Array.from(previous).filter(([id])=>!assigned.has(id)).map(([id,prior])=>({id,name:byId.get(id)?.name || id,epNumber:byId.get(id)?.epNumber || '',trade:byId.get(id)?.trade || '—',status:byId.get(id)?.status || 'Unknown',jobs:[...prior.jobs].join(', '),projects:[...prior.projects],lastScheduled:comparison}));
 const working=profiles.filter(p=>p.status==='Working'&&!assigned.has(p.id)).map(p=>({id:p.id,name:p.name,epNumber:p.epNumber || '',trade:p.trade,status:p.status,jobs:[...(previous.get(p.id)?.jobs || [])].join(', '),projects:[...(previous.get(p.id)?.projects || [])],lastScheduled:previous.has(p.id)?comparison:''}));
 return {missing,working};
}
