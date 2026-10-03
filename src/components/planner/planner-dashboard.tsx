'use client';
import { useMemo, useState, useEffect } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, CheckCircle, Clock, AlertCircle, Users, ClipboardList, ChevronLeft, ChevronRight, Eye, Pencil, MessageSquare, Download, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import type { PlannerEvent } from '@/lib/types';
import EventInstanceDialog from './EventInstanceDialog';
import EditEventDialog from './EditEventDialog';
import PlannerCalendar from './planner-calendar';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ALL_PLANNERS, plannerEventVisible } from './planner-visibility';
import { plannerTaskOrder, latestPlannerUpdate } from './planner-table-order';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import styles from './planner-dashboard.module.css';

type Instance = { event: PlannerEvent; eventDate: Date };
type Props = { selectedUserId: string; visibleUserIds: string[]; selectedDate: Date | undefined; setSelectedDate: (date: Date | undefined) => void; currentMonth: Date; setCurrentMonth: (date: Date) => void };
const tabs = ['All Tasks', 'My Tasks', 'Delegated Tasks', 'Completed', 'Upcoming', 'Overdue'];
const statuses = ['Not Started', 'In Progress', 'Pending', 'Completed', 'Not Applicable'] as const;
export default function PlannerDashboard(props: Props) {
  const { selectedUserId, visibleUserIds, selectedDate, setSelectedDate, currentMonth, setCurrentMonth } = props;
  const { user, users } = useAuth();
  const { getExpandedPlannerEvents, dailyPlannerComments, plannerEvents, deletePlannerEvent } = usePlanner();
  const { toast } = useToast();
  const [tab, setTab] = useState('All Tasks');
  const [quickTab, setQuickTab] = useState('My Tasks');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [view, setView] = useState<Instance | null>(null);
  const [editing, setEditing] = useState<PlannerEvent | null>(null);
  const [deleting, setDeleting] = useState<Instance | null>(null);
  const [removing, setRemoving] = useState(false);
  const [worksheet, setWorksheet] = useState(false);
  useEffect(() => { setView(null); setEditing(null); setDeleting(null); }, [selectedUserId, visibleUserIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rowKey = (r: Instance) => `${r.event.id}:${format(r.eventDate, 'yyyy-MM-dd')}`;
  const [saving, setSaving] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const day = (r: Instance) => format(r.eventDate, 'yyyy-MM-dd');
  const state = (r: Instance) => r.event.instanceStatuses?.[day(r)] || 'Not Started';
  const name = (id: string) => users.find(u => u.id === id)?.name || 'Former user';
  const assignedBy = (event: PlannerEvent) => event.creatorId && event.creatorId === event.userId ? 'Own task' : event.creatorId ? name(event.creatorId) : 'Unknown';
  const rows = useMemo(() => {
    const start = startOfMonth(currentMonth), end = endOfMonth(currentMonth);
    const ids = new Set(visibleUserIds);
    return [...ids].flatMap(id => getExpandedPlannerEvents(start, end, id)).filter(r => plannerEventVisible(r.event, selectedUserId, visibleUserIds))
      .sort((a,b) => plannerTaskOrder(a,b,today));
  }, [currentMonth, selectedUserId, visibleUserIds, plannerEvents, getExpandedPlannerEvents, today]);
  const tableRows = useMemo(() => {
    // Carry unfinished earlier-month work into the current month's working list.
    if (!isSameMonth(currentMonth, new Date(today + 'T00:00:00'))) return rows;
    const starts = plannerEvents.filter(e => plannerEventVisible(e,selectedUserId,visibleUserIds)).map(e => new Date(e.date).getTime()).filter(Number.isFinite);
    if (!starts.length) return rows;
    const start = new Date(Math.min(...starts));
    const end = addDays(startOfMonth(currentMonth), -1);
    if (start > end) return rows;
    const overdue = visibleUserIds.flatMap(id => getExpandedPlannerEvents(start,end,id)).filter(r => plannerEventVisible(r.event,selectedUserId,visibleUserIds) && !['Completed','Not Applicable'].includes(state(r)));
    return [...rows,...overdue].sort((a,b)=>plannerTaskOrder(a,b,today));
  }, [rows,currentMonth,today,plannerEvents,selectedUserId,visibleUserIds,getExpandedPlannerEvents]);
  const taskOwnerId = selectedUserId === ALL_PLANNERS ? user?.id : selectedUserId;
  const matchesTab = (r: Instance, selected: string) => selected === 'All Tasks' ||
    (selected === 'My Tasks' && r.event.userId === taskOwnerId) ||
    (selected === 'Delegated Tasks' && r.event.creatorId !== r.event.userId && (selectedUserId === ALL_PLANNERS || r.event.creatorId === selectedUserId)) ||
    (selected === 'Completed' && state(r) === 'Completed') ||
    (selected === 'Upcoming' && day(r) > today && !['Completed', 'Not Applicable'].includes(state(r))) ||
    (selected === 'Overdue' && day(r) < today && !['Completed', 'Not Applicable'].includes(state(r)));
  const comments = (r: Instance) => Object.values(dailyPlannerComments.find(c => c.id === `${day(r)}_${r.event.userId}`)?.comments || {}).filter(c => c.eventId === r.event.id).sort((a,b) => a.date.localeCompare(b.date));
  const filtered = tableRows.filter(r => matchesTab(r, tab) && (!status || state(r) === status) && (!category || r.event.category === category) && (!location || r.event.location === location) && (!from || day(r) >= from) && (!to || day(r) <= to) && [r.event.title, r.event.description, r.event.equipmentRef, r.event.location, name(r.event.userId), name(r.event.creatorId)].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
  useEffect(() => { setPage(1); setSelected(new Set()); }, [query, status, category, location, tab, from, to, size, currentMonth, selectedUserId]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const daily = rows.filter(r => isSameDay(r.eventDate, selectedDate || new Date()));
  const quick = tableRows.filter(r => matchesTab(r, quickTab));
  const canEdit = (r: Instance) => user?.role === 'Admin' || r.event.creatorId === user?.id;
  const canUpdate = (r: Instance) => !!user?.id && r.event.userId === user.id;
  const updateStatus = async (r: Instance, value: string) => {
    if (!canUpdate(r)) return;
    const key = `${r.event.id}/${day(r)}`; setSaving(key);
    try { await update(ref(rtdb, `plannerEvents/${r.event.id}/instanceStatuses`), { [day(r)]: value }); }
    catch { toast({ variant: 'destructive', title: 'Could not save task status. Please try again.' }); }
    finally { setSaving(null); }
  };
  const removeOccurrence = async () => {
    if (!deleting || !canEdit(deleting) || removing) return;
    setRemoving(true);
    try {
      await deletePlannerEvent(deleting.event.id, day(deleting));
      toast({ title: 'Event removed for this day only', description: 'Other dates and all saved history remain unchanged.' });
      setDeleting(null);
    } catch { toast({ variant: 'destructive', title: 'Could not remove this occurrence. Please try again.' }); }
    finally { setRemoving(false); }
  };
  const exportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Planner');
      sheet.columns = ['Date','Time','Task / Activity','Category','Equipment / Ref.','Location','Assigned To','Assigned / Delegated By','Status','Comments / Replies'].map(header => ({header, width: header === 'Comments / Replies' ? 70 : 24}));
      filtered.filter(r => !selected.size || selected.has(rowKey(r))).forEach(r => sheet.addRow([day(r),r.event.time || '',r.event.title,r.event.category || '',r.event.equipmentRef || '',r.event.location || '',name(r.event.userId),assignedBy(r.event),state(r),comments(r).map(c => `${name(c.userId)} (${c.date}): ${c.text}`).join('\n')]));
      sheet.eachRow(row => row.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'top' }; }));
      const url = URL.createObjectURL(new Blob([await workbook.xlsx.writeBuffer()]));
      const link = document.createElement('a'); link.href = url; link.download = `Planner_${format(currentMonth,'yyyy-MM')}.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast({variant:'destructive',title:'Export failed. Please try again.'}); }
  };
  const badge = (r: Instance) => <span className={styles.badge} data-status={state(r)}>{state(r)}</span>;
  const person = (r: Instance) => <span className={styles.person}><i>{name(r.event.userId).split(' ').map(n=>n[0]).slice(0,2).join('')}</i>{name(r.event.userId)}</span>;
  const completed = rows.filter(r => state(r) === 'Completed').length;
  const upcoming = useMemo(() => {
    const ids = new Set(visibleUserIds);
    return [...ids].flatMap(id => getExpandedPlannerEvents(addDays(new Date(today + 'T00:00:00'),1), addDays(new Date(today + 'T00:00:00'),7), id))
      .filter(r => plannerEventVisible(r.event, selectedUserId, visibleUserIds) && !['Completed', 'Not Applicable'].includes(r.event.instanceStatuses?.[format(r.eventDate,'yyyy-MM-dd')] || 'Not Started')).length;
  }, [selectedUserId, visibleUserIds, plannerEvents, getExpandedPlannerEvents, today]);
  const cards = [
    {title:'Total Tasks',value:rows.length,detail:format(currentMonth,'MMMM yyyy'),icon:ClipboardList,tone:'blue'},
    {title:'Completed',value:completed,detail:`${rows.length ? Math.round(completed/rows.length*100) : 0}% completion`,icon:CheckCircle,tone:'green'},
    {title:'In Progress',value:rows.filter(r=>state(r)==='In Progress').length,detail:'Work underway',icon:Clock,tone:'amber'},
    {title:'Pending',value:rows.filter(r=>state(r)==='Pending').length,detail:'Awaiting action',icon:AlertCircle,tone:'rose'},
    {title:'Delegated to Others',value:rows.filter(r=>matchesTab(r,'Delegated Tasks')).length,detail:'This month',icon:Users,tone:'purple'},
    {title:'Upcoming',value:upcoming,detail:'Next 7 days',icon:CalendarDays,tone:'slate'}
  ];
  return <div className={styles.planner}>
    <section className={styles.metrics} aria-label="Planner summary">{cards.map(c=><article key={c.title} data-tone={c.tone}><span className={styles.metricIcon}><c.icon size={24}/></span><div><h2>{c.title}</h2><strong>{c.value}</strong><small>{c.detail}</small></div></article>)}</section>
    <section className={styles.overview}>
      <article className={styles.panel}><header><h2>{format(currentMonth,'MMMM yyyy')}</h2><div className={styles.controls}><button aria-label="Previous month" onClick={()=>setCurrentMonth(addMonths(currentMonth,-1))}><ChevronLeft size={16}/></button><button aria-label="Next month" onClick={()=>setCurrentMonth(addMonths(currentMonth,1))}><ChevronRight size={16}/></button><button onClick={()=>{setCurrentMonth(new Date());setSelectedDate(new Date());}}>Today</button></div></header>
        <div className={styles.calendar}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><small key={d}>{d}</small>)}{eachDayOfInterval({start:startOfWeek(startOfMonth(currentMonth)),end:endOfWeek(endOfMonth(currentMonth))}).map(d=><button key={d.toISOString()} className={isSameDay(d,selectedDate||new Date()) ? styles.selectedDay : ''} data-outside={!isSameMonth(d,currentMonth)} aria-label={format(d,'PPPP')} aria-pressed={isSameDay(d,selectedDate||new Date())} onClick={()=>{setSelectedDate(d);if(!isSameMonth(d,currentMonth))setCurrentMonth(d);}}>{format(d,'d')}<span>{rows.filter(r=>isSameDay(r.eventDate,d)).slice(0,3).map((r,i)=><i key={i} data-status={state(r)}/>)}</span></button>)}</div>
      </article>
      <article className={styles.panel}><header><h2>Tasks for {format(selectedDate||new Date(),'dd MMM yyyy')}</h2><small>{daily.length} Tasks</small></header><div className={styles.dayList}>{daily.length ? daily.map(r=><button key={r.event.id} onClick={()=>setView(r)}><span className={styles.dot}/><time>{r.event.time || '—'}</time><strong>{r.event.title}<small>{[r.event.location,r.event.equipmentRef].filter(Boolean).join(' | ')}</small></strong>{person(r)}{badge(r)}</button>) : <p className={styles.empty}>No tasks scheduled for this day.</p>}</div><button className={styles.textLink} onClick={()=>{setFrom(format(selectedDate||new Date(),'yyyy-MM-dd'));setTo(format(selectedDate||new Date(),'yyyy-MM-dd'));setTab('All Tasks');document.getElementById('planner-task-table')?.scrollIntoView({behavior:'smooth'});}}>View all tasks for this day →</button></article>
      <article className={styles.panel}><nav className={styles.quickTabs} aria-label="Task preview">{['My Tasks','Delegated Tasks','Upcoming','Overdue'].map(t=><button key={t} aria-pressed={quickTab===t} onClick={()=>setQuickTab(t)}>{t}</button>)}</nav><div className={styles.quickList}>{quick.slice(0,3).map(r=><button key={`${r.event.id}-${day(r)}`} onClick={()=>setView(r)}><div><strong>{r.event.title}</strong><small>{r.event.location || 'No location'} · {format(r.eventDate,'dd MMM yyyy')}</small><small>{comments(r).length} comments / replies</small></div>{badge(r)}</button>)}{!quick.length && <p className={styles.empty}>No tasks in this view.</p>}</div><button className={styles.textLink} onClick={()=>setTab(quickTab)}>View {quickTab.toLowerCase()} →</button></article>
    </section>
    <section className={styles.panel} id="planner-task-table"><div className={styles.toolbar}><nav className={styles.tabs} aria-label="Task lists">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav><button onClick={exportExcel}><Download size={15}/>{selected.size ? `Export selected (${selected.size})` : 'Export to Excel'}</button><button aria-pressed={worksheet} onClick={()=>setWorksheet(!worksheet)}>Daily worksheet</button></div>
      <div className={styles.focusBar}><span>Today first · Earlier unfinished tasks · Upcoming · Past completed</span>{['Today','Tomorrow'].map((label,i)=><button key={label} onClick={()=>{const date=addDays(new Date(),i);setCurrentMonth(date);setSelectedDate(date);setFrom(format(date,'yyyy-MM-dd'));setTo(format(date,'yyyy-MM-dd'));setTab('All Tasks');setStatus('');setCategory('');setLocation('');setQuery('');setPage(1);}}>{label}</button>)}<button onClick={()=>{setCurrentMonth(new Date());setTab('Overdue');setFrom('');setTo('');setStatus('');setCategory('');setLocation('');setQuery('');setPage(1);}}>Earlier unfinished tasks</button></div>
      <div className={styles.filters}><input aria-label="Search tasks" placeholder="Search task, equipment, person…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All Statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{[...new Set(rows.map(r=>r.event.category).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select><select aria-label="Filter location" value={location} onChange={e=>setLocation(e.target.value)}><option value="">All Locations</option>{[...new Set(rows.map(r=>r.event.location).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select><input aria-label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input aria-label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)}/><button onClick={()=>{setQuery('');setStatus('');setCategory('');setLocation('');setFrom('');setTo('');}}>× Clear filters</button></div>
      <div className={styles.tableScroll}><table><thead><tr><th><input type="checkbox" aria-label="Select this page for export" checked={visible.length > 0 && visible.every(r=>selected.has(rowKey(r)))} onChange={e=>setSelected(previous=>{const next=new Set(previous);visible.forEach(r=>e.target.checked?next.add(rowKey(r)):next.delete(rowKey(r)));return next;})}/></th>{['#','Date','Time','Task / Activity','Category','Assigned / Delegated By','Location','Assigned To','Status','Remarks / Latest Update','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map((r,i)=><tr key={`${r.event.id}-${day(r)}`}><td><input type="checkbox" aria-label={`Select ${r.event.title} for export`} checked={selected.has(rowKey(r))} onChange={e=>setSelected(previous=>{const next=new Set(previous);e.target.checked?next.add(rowKey(r)):next.delete(rowKey(r));return next;})}/></td><td>{(currentPage-1)*size+i+1}</td><td>{format(r.eventDate,'dd-MM-yyyy')}</td><td>{r.event.time || '—'}</td><td><button className={styles.taskTitle} onClick={()=>setView(r)}>{r.event.title}</button></td><td><span className={styles.category} data-category={r.event.category || 'General'}>{r.event.category || 'General'}</span></td><td>{assignedBy(r.event)}</td><td>{r.event.location || '—'}</td><td>{person(r)}</td><td>{canUpdate(r) ? <select className={styles.badge} data-status={state(r)} aria-label={`Status for ${r.event.title} on ${day(r)}`} value={state(r)} disabled={saving===`${r.event.id}/${day(r)}`} onChange={e=>updateStatus(r,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select> : badge(r)}</td><td><button className={styles.remark} title={latestPlannerUpdate(r.event,comments(r))} onClick={()=>setView(r)}>{latestPlannerUpdate(r.event,comments(r))}{comments(r).some(c=>c.userId!==user?.id && !c.viewedBy?.[user?.id || '']) && <small><MessageSquare size={12}/> Unread</small>}</button></td><td><div className={styles.controls}>{canEdit(r)&&<button aria-label={`Edit ${r.event.title}`} onClick={()=>setEditing(r.event)}><Pencil size={14}/></button>}<button aria-label={`View and reply to ${r.event.title}`} onClick={()=>setView(r)}><Eye size={15}/></button><DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`More actions for ${r.event.title}`}><MoreVertical size={15}/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>setView(r)}>View conversation</DropdownMenuItem>{canEdit(r)&&<DropdownMenuItem className="text-destructive" onSelect={()=>setDeleting(r)}><Trash2 size={14} className="mr-2"/>Remove this day only</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div></td></tr>)}{!visible.length&&<tr><td colSpan={12} className={styles.empty}>No tasks match these filters.</td></tr>}</tbody></table></div>
      <footer className={styles.pagination}><span>Showing {filtered.length ? (currentPage-1)*size+1 : 0} to {Math.min(currentPage*size,filtered.length)} of {filtered.length} entries</span><div><label>Rows per page: <select value={size} onChange={e=>setSize(Number(e.target.value))}>{[10,25,50,100].map(n=><option key={n}>{n}</option>)}</select></label><button disabled={currentPage===1} onClick={()=>setPage(1)} aria-label="First page">«</button><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)} aria-label="Previous page">‹</button>{Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-currentPage)<=1).map((n,i,ns)=><span key={n}>{i>0&&n-ns[i-1]>1&&' … '}<button aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}>{n}</button></span>)}<button disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)} aria-label="Next page">›</button><button disabled={currentPage===pages} onClick={()=>setPage(pages)} aria-label="Last page">»</button></div></footer>
    </section>
    {worksheet&&<section className={styles.worksheet}><h2>Daily worksheet · notes, history and locks</h2>{selectedUserId === ALL_PLANNERS ? visibleUserIds.map(id => <details key={id} className="border rounded-md p-3 mb-3"><summary className="cursor-pointer font-semibold">{name(id)}</summary><PlannerCalendar {...props} selectedUserId={id}/></details>) : <PlannerCalendar {...props}/>} </section>}
    {view&&<EventInstanceDialog key={`${view.event.id}-${day(view)}`} isOpen setIsOpen={()=>setView(null)} event={plannerEvents.find(e=>e.id===view.event.id)||view.event} date={view.eventDate} plannerUserId={view.event.userId} onEdit={setEditing}/>}
    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!removing)setDeleting(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this event for this day only?</AlertDialogTitle><AlertDialogDescription>
        {deleting && <>“{deleting.event.title}” will be removed only from {format(deleting.eventDate,'dd MMM yyyy')} for {name(deleting.event.userId)}. All past history, statuses, comments and replies remain saved against the same user. Other dates and future recurring occurrences will not be removed.</>}
      </AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel><AlertDialogAction disabled={removing} className="bg-destructive text-white hover:bg-destructive/90" onClick={e=>{e.preventDefault();void removeOccurrence();}}>{removing?'Removing…':'Remove this day only'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    {editing&&<EditEventDialog isOpen setIsOpen={()=>setEditing(null)} event={editing}/>}
  </div>;
}
