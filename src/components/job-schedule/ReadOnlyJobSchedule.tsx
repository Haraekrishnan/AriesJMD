'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { JobSchedule } from '@/lib/types';
import { Input } from '@/components/ui/input';
import styles from './schedule-worksheet.module.css';
import design from './schedule-page.module.css';
export default function ReadOnlyJobSchedule({ schedule }: { schedule?: JobSchedule }) {
 const { manpowerProfiles, vehicles, projects, users } = useAppContext();
 const [search,setSearch]=useState(''); const [project,setProject]=useState(''); const [type,setType]=useState(''); const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const personName=(id:string)=>manpowerProfiles.find(p=>p.id===id)?.name || users.find(u=>u.id===id)?.name || id || '—';
 const projectName=(id?:string)=>projects.find(p=>p.id===id)?.name || id || '—';
 const items=schedule?.items || [];
 const q=search.trim().toLowerCase();
 const visible=items.map((item,index)=>({item,index})).filter(({item})=>(!project || item.projectId===project)&&(!type || item.jobType===type)&&(!q || [...(item.manpowerIds || []).map(personName),item.jobNo,item.projectVesselName,projectName(item.projectId),item.location].join(' ').toLowerCase().includes(q)));
 const count=new Set(items.flatMap(i=>i.manpowerIds || [])).size;
 return <><div className={design.filters}><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find person, job number or project…" aria-label="Search schedule"/><select aria-label="Project filter" value={project} onChange={e=>setProject(e.target.value)}><option value="">All projects</option>{Array.from(new Set(items.map(i=>i.projectId))).filter(Boolean).map(id=><option key={id} value={id}>{projectName(id)}</option>)}</select><select aria-label="Job type filter" value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option>{Array.from(new Set(items.map(i=>i.jobType))).filter(Boolean).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
 <div className={styles.gridScroll} role="region" aria-label="Saved job schedule" tabIndex={0}><table className={design.table}><colgroup><col style={{width:'4%'}}/><col style={{width:'20%'}}/><col style={{width:'9%'}}/><col style={{width:'15%'}}/><col style={{width:'12%'}}/><col style={{width:'8%'}}/><col style={{width:'11%'}}/><col style={{width:'10%'}}/><col style={{width:'11%'}}/></colgroup><thead><tr>{['No.','Personnel / team','Job details','Project / vessel','Location','Reporting','Client / contact','Vehicle','Remarks'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(({item,index})=>{const ids=item.manpowerIds || [];const showAll=expanded[item.id] || !!q;return <tr key={item.id}><td>{index+1}</td><td><ol>{(showAll?ids:ids.slice(0,3)).map(id=><li key={id}>{personName(id)}</li>)}</ol>{ids.length>3 && <button aria-expanded={!!showAll} onClick={()=>setExpanded(v=>({...v,[item.id]:!showAll}))}>{showAll?'Show less':`View all ${ids.length}`}</button>}</td><td><span className={design.chip}>{item.jobType || '—'}</span><div>{item.jobNo || '—'}</div></td><td>{item.projectVesselName || '—'}<small>{projectName(item.projectId)}</small></td><td>{item.location || '—'}</td><td>{item.reportingTime || '—'}</td><td>{item.clientContact || '—'}</td><td>{vehicles.find(v=>v.id===item.vehicleId)?.vehicleNumber || (item.vehicleId && item.vehicleId!=='none'?item.vehicleId:'—')}</td><td style={{whiteSpace:'pre-wrap'}}>{item.remarks || '—'}</td></tr>})}{!visible.length && <tr><td colSpan={9}>No jobs match these filters.</td></tr>}</tbody></table></div><div className={styles.footer}><span>{items.length} jobs · {count} assigned people{(q || project || type) && ` · ${visible.length} matching jobs`}</span><span>Daily headcount counts each person once.</span></div></>;
}
