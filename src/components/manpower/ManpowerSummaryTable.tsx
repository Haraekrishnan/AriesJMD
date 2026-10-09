'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, History } from 'lucide-react';
import { type DailyRow, validateDailyRows, legacyDailyEntry, includeMissingDailyProjects } from './daily-entry';
import styles from './daily-entry.module.css';

export default function ManpowerSummaryTable({ selectedDate, onDirtyChange }: { selectedDate?: Date; onDirtyChange?: (dirty: boolean) => void }) {
  const { projects } = useGeneral();
  const { manpowerLogs, dailyEntries, dailyLoaded, saveDailyEntry, unlockDailyEntry } = useManpower();
  const { jobSchedules } = usePlanner();
  const { user, users, can } = useAuth();
  const { toast } = useToast();
  const date = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const entry = useMemo(() => dailyEntries[date] || legacyDailyEntry(date, manpowerLogs, projects, users), [date, dailyEntries, manpowerLogs, projects, users]);
  const [draft, setDraft] = useState<DailyRow[] | null>(null);
  const [baseRevision, setBaseRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [openingUnlocked, setOpeningUnlocked] = useState(false);
  const [search, setSearch] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [history, setHistory] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const savedRows = useMemo(() => {
    if (entry) return entry.locked ? (entry.rows || []) : includeMissingDailyProjects(entry.rows || [], projects);
    const saved = new Map((entry?.rows || []).map(row => [row.projectId, row]));
    const locations = [...projects.map(p => ({ id: p.id, name: p.name })), ...(entry?.rows || []).filter(r => !projects.some(p => p.id === r.projectId)).map(r => ({ id: r.projectId, name: r.projectName }))];
    return locations.map(project => {
      if (saved.has(project.id)) return saved.get(project.id)!;
      const log = manpowerLogs.filter(l => l.date === date && l.projectId === project.id).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const scheduled = new Set(jobSchedules.filter(s => s.date === date).flatMap(s => (s.items || []).filter(i => i.projectId === project.id).flatMap(i => i.manpowerIds || []))).size;
      return { projectId: project.id, projectName: project.name, openingManpower: log?.openingManpower ?? scheduled, countIn: log?.countIn || 0, countOut: log?.countOut || 0, countOnLeave: log?.countOnLeave || 0, reason: log?.reason || '' };
    });
  }, [entry, projects, manpowerLogs, date, jobSchedules]);
  const rows = draft ? (entry?.locked ? draft : includeMissingDailyProjects(draft, projects)) : savedRows;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(savedRows);
  const locked = !!entry?.locked;
  const canEdit = (can.log_manpower || user?.role === 'Admin') && !locked && dailyLoaded && !busy;
  const stale = !!draft && baseRevision !== (entry?.revision || 0);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) {event.preventDefault();event.returnValue='';} }; window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler); }, [dirty]);
  // Reveal omitted zero-count projects immediately after an Admin unlock.
  useEffect(() => {
    if (entry && !entry.locked) { setHideZero(false); setSearch(''); }
  }, [entry?.revision, entry?.locked]);
  const change = (id: string, field: keyof DailyRow, value: string) => {
    if (!canEdit) return;
    if (!draft) setBaseRevision(entry?.revision || 0);
    setDraft(rows.map(row => row.projectId === id ? { ...row, [field]: field === 'reason' ? value : (value === '' ? NaN : Number(value)) } : row));
  };
  const totals = rows.reduce((a,r) => ({opening:a.opening+r.openingManpower,in:a.in+r.countIn,out:a.out+r.countOut,closing:a.closing+r.openingManpower+r.countIn-r.countOut,leave:a.leave+r.countOnLeave,active:a.active+r.openingManpower+r.countIn-r.countOut-r.countOnLeave}),{opening:0,in:0,out:0,closing:0,leave:0,active:0});
  const count = (n: number) => Number.isFinite(n) ? n : '—';
  const stamp = (at: number) => new Date(at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}) + ' IST';
  const save = async () => {
    if (!canEdit || stale) return;
    try { validateDailyRows(rows);setBusy(true);await saveDailyEntry(date, rows, draft ? baseRevision : entry?.revision || 0);setDraft(null);setOpeningUnlocked(false);toast({title:'Daily entry saved and locked'}); }
    catch(error){toast({variant:'destructive',title:'Not saved',description:(error as Error).message});}finally{setBusy(false);}
  };
  const unlock = async () => {
    try {setBusy(true);await unlockDailyEntry(date,unlockReason,entry?.revision || 0);setUnlocking(false);setUnlockReason('');toast({title:'Day unlocked',description:'Saving corrections will lock it again.'});}
    catch(error){toast({variant:'destructive',title:'Unable to unlock',description:(error as Error).message});}finally{setBusy(false);}
  };
  const numberInput = (row: DailyRow, field: 'openingManpower'|'countIn'|'countOut'|'countOnLeave') => <Input aria-label={row.projectName+' '+field} type="number" min={0} step={1} value={Number.isFinite(row[field]) ? row[field] : ''} disabled={!canEdit || (field==='openingManpower'&&!openingUnlocked)} onChange={e=>change(row.projectId,field,e.target.value)} />;
  if (!date) return <p>Select a date.</p>;
  return <div className={styles.daily}>
    <div className={styles.stats}>{[['Total manpower',totals.closing],['On leave',totals.leave],['Active today',totals.active]].map(([label,value])=><div key={label}><span>{label}</span><strong>{count(Number(value))}</strong></div>)}</div>
    <div className={styles.toolbar}>
      <div><strong>Daily entry</strong><p>Closing = Opening + In − Out · Active = Closing − Leave</p></div>
      <Input aria-label="Search project" placeholder="Search project or location…" value={search} onChange={e=>setSearch(e.target.value)} />
      <label><input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)} /> Hide zero rows</label>
      {!locked && <Button variant="outline" disabled={!canEdit} onClick={()=>setOpeningUnlocked(v=>!v)}>{openingUnlocked ? <Unlock size={14}/> : <Lock size={14}/>} {openingUnlocked?'Lock Opening':'Unlock Opening'}</Button>}
      {entry && <Button variant="outline" onClick={()=>setHistory(v=>!v)}><History size={14}/> View History</Button>}
    </div>
    {!dailyLoaded && <p role="alert">Loading saved entries… Editing is disabled until the lock status is available.</p>}
    {entry && <div className={styles.audit}><Lock size={15}/> Saved by {entry.savedByName} · {stamp(entry.savedAt)} · {locked?'Locked':'Unlocked for correction'}{locked&&user?.role==='Admin'&&<Button variant="outline" disabled={busy} onClick={()=>setUnlocking(v=>!v)}>Admin unlock</Button>}</div>}
    {unlocking && <div className={styles.audit}><Input aria-label="Reason for unlocking" placeholder="Required: reason for unlocking this day" value={unlockReason} onChange={e=>setUnlockReason(e.target.value)}/><Button disabled={busy||!unlockReason.trim()} onClick={unlock}>Unlock day</Button><Button variant="outline" onClick={()=>setUnlocking(false)}>Cancel</Button></div>}
    {entry && !entry.locked && <p className="text-sm text-muted-foreground py-2">All current projects are available. Missing projects start at zero. Use Unlock Opening to enter their opening balance, then Save daily entry.</p>}
    {stale && <p role="alert" className={styles.warning}>Another user changed this day. Your draft is preserved. Discard it to load the latest version before editing again.</p>}
    {history && <div className={styles.history}>{Object.entries(entry?.history||{}).sort((a,b)=>b[1].at-a[1].at).map(([revision,event])=><details key={revision}><summary>{event.action==='save'?'Saved and locked':'Unlocked'} by {event.actorName} · {stamp(event.at)}{event.reason?' · '+event.reason:''}</summary><div className={styles.scroll}><table><thead><tr>{['Project','Opening','In','Out','Leave','Reason'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{(event.rows||[]).map(r=><tr key={r.projectId}><td>{r.projectName}</td><td>{r.openingManpower}</td><td>{r.countIn}</td><td>{r.countOut}</td><td>{r.countOnLeave}</td><td>{r.reason}</td></tr>)}</tbody></table></div></details>)}</div>}
    <div className={styles.scroll}><table><thead><tr>{['Project / Location',openingUnlocked?'Opening':'Opening 🔒','In','Out','Reason / Remarks','Closing','On leave','Active'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
      {rows.filter(r=>r.projectName.toLowerCase().includes(search.toLowerCase())&&(!hideZero||[r.openingManpower,r.countIn,r.countOut,r.countOnLeave].some(v=>v!==0))).map(row=><tr key={row.projectId} data-dirty={JSON.stringify(row)!==JSON.stringify(savedRows.find(r=>r.projectId===row.projectId))}>
        <td>{row.projectName}</td><td>{numberInput(row,'openingManpower')}</td><td>{numberInput(row,'countIn')}</td><td>{numberInput(row,'countOut')}</td><td><textarea aria-label={row.projectName+' remarks'} rows={1} title={row.reason || 'Add reason'} placeholder="Add reason…" disabled={!canEdit} value={row.reason} onChange={e=>change(row.projectId,'reason',e.target.value)} /></td><td><strong>{count(row.openingManpower+row.countIn-row.countOut)}</strong></td><td>{numberInput(row,'countOnLeave')}</td><td className={styles.active}><strong>{count(row.openingManpower+row.countIn-row.countOut-row.countOnLeave)}</strong></td>
      </tr>)}</tbody><tfoot><tr><td>Overall total</td><td>{count(totals.opening)}</td><td>{count(totals.in)}</td><td>{count(totals.out)}</td><td>All projects</td><td>{count(totals.closing)}</td><td>{count(totals.leave)}</td><td>{count(totals.active)}</td></tr></tfoot></table></div>
    <div className={styles.footer}><span>{dirty?'Unsaved changes · ':''}Tab to move between fields · Saving locks the entire day</span><div><Button variant="outline" disabled={busy||!draft} onClick={()=>{setDraft(null);setOpeningUnlocked(false);}}>Discard changes</Button><Button disabled={!canEdit||stale} onClick={save}>{busy?'Saving…':locked?'Entry locked':'Save daily entry'}</Button></div></div>
  </div>;
}
