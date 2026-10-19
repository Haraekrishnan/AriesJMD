'use client';
import { Fragment, useMemo, useState, useEffect, useRef } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, Bell, List, Search, SlidersHorizontal, AlertCircle, ClipboardList, ChevronLeft, ChevronRight, Pencil, MessageSquare, Download, Trash2, MoreVertical, Send } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import type { PlannerEvent } from '@/lib/types';
import EventInstanceDialog from './EventInstanceDialog';
import EditEventDialog from './EditEventDialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ALL_PLANNERS, plannerEventVisible } from './planner-visibility';
import { unreadTaskComments, latestTaskComment, unreadTaskRows } from './planner-unread-updates';
import { taskTiming, includeInTaskView } from './planner-task-focus';
import { plannerTaskOrder } from './planner-table-order';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import styles from './planner-dashboard.module.css';

type Instance = { event: PlannerEvent; eventDate: Date };
type Props = { selectedUserId: string; visibleUserIds: string[]; selectedDate: Date | undefined; setSelectedDate: (date: Date | undefined) => void; currentMonth: Date; setCurrentMonth: (date: Date) => void };
const tabs = ['All Tasks', 'Current Tasks', 'Overdue', 'New updates', 'Completed', 'Upcoming'];
const statuses = ['Not Started', 'In Progress', 'Pending', 'Completed', 'Not Applicable'] as const;
export default function PlannerDashboard(props: Props) {
  const { selectedUserId, visibleUserIds, selectedDate, setSelectedDate, currentMonth, setCurrentMonth } = props;
  const { user, users } = useAuth();
  const { getExpandedPlannerEvents, dailyPlannerComments, plannerEvents, deletePlannerEvent, stopPlannerEventFromToday, permanentlyDeletePlannerEvent, addPlannerEventComment } = usePlanner();
  const { toast } = useToast();
  const [tab, setTab] = useState('All Tasks');
  const [assignment, setAssignment] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [view, setView] = useState<Instance | null>(null);
  const [editing, setEditing] = useState<PlannerEvent | null>(null);
  const [deleting, setDeleting] = useState<Instance | null>(null);
  const [stopping,setStopping] = useState<Instance | null>(null);
  const [cutoffDay,setCutoffDay] = useState('');
  const [purging,setPurging] = useState<Instance|null>(null);
  const [purgeText,setPurgeText] = useState('');
  const [purgeSaving,setPurgeSaving] = useState(false);
  const [stopSaving,setStopSaving] = useState(false);
  const stopDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [removing, setRemoving] = useState(false);
  const [remarkEditor, setRemarkEditor] = useState<string | null>(null);
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string,string>>({});
  const [remarkSaving, setRemarkSaving] = useState<string | null>(null);
  const remarkSaveLock = useRef(false);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;
    const measure = () => viewport.style.setProperty('--remark-viewport-width', viewport.clientWidth + 'px');
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setRemarkEditor(null); setRemarkDrafts({}); }, [user?.id]);
  const [calendarView,setCalendarView] = useState(false);
  const [moreFilters,setMoreFilters] = useState(false);
  useEffect(() => { setView(null); setEditing(null); setDeleting(null); setStopping(null); setPurging(null); }, [selectedUserId, visibleUserIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rowKey = (r: Instance) => `${r.event.id}:${format(r.eventDate, 'yyyy-MM-dd')}`;
  const [saving, setSaving] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const day = (r: Instance) => format(r.eventDate, 'yyyy-MM-dd');
  const state = (r: Instance) => r.event.instanceStatuses?.[day(r)] || 'Not Started';
  const name = (id: string) => users.find(u => u.id === id)?.name || 'Former user';
  const assignedBy = (event: PlannerEvent) => event.creatorId && event.creatorId === event.userId ? 'Own task' : event.creatorId ? name(event.creatorId) : 'Unknown';
  const rows = useMemo(() => {
    const start = from ? new Date(from+'T00:00:00') : startOfMonth(to ? new Date(to+'T00:00:00') : currentMonth), end = to ? new Date(to+'T23:59:59') : endOfMonth(from ? new Date(from+'T00:00:00') : currentMonth);
    const ids = new Set(visibleUserIds);
    return [...ids].flatMap(id => getExpandedPlannerEvents(start, end, id)).filter(r => plannerEventVisible(r.event, selectedUserId, visibleUserIds))
      .sort((a,b) => plannerTaskOrder(a,b,today));
  }, [currentMonth, selectedUserId, visibleUserIds, plannerEvents, getExpandedPlannerEvents, today, from, to]);
  const tableRows = useMemo(() => {
    // Carry unfinished earlier-month work into the current month's working list.
    if (from || to) return rows;
    if (!isSameMonth(currentMonth, new Date(today + 'T00:00:00'))) return rows;
    const starts = plannerEvents.filter(e => plannerEventVisible(e,selectedUserId,visibleUserIds)).map(e => new Date(e.date).getTime()).filter(Number.isFinite);
    if (!starts.length) return rows;
    const start = new Date(Math.min(...starts));
    const end = addDays(startOfMonth(currentMonth), -1);
    if (start > end) return rows;
    const overdue = visibleUserIds.flatMap(id => getExpandedPlannerEvents(start,end,id)).filter(r => plannerEventVisible(r.event,selectedUserId,visibleUserIds) && !['Completed','Not Applicable'].includes(state(r)));
    return [...rows,...overdue].sort((a,b)=>plannerTaskOrder(a,b,today));
  }, [rows,currentMonth,today,plannerEvents,selectedUserId,visibleUserIds,getExpandedPlannerEvents,from,to]);
  const taskOwnerId = selectedUserId === ALL_PLANNERS ? user?.id : selectedUserId;
  const matchesTab = (r: Instance, selected: string) => ['All Tasks','Pending Tasks','Current Tasks'].includes(selected) ||
    (selected === 'My Tasks' && r.event.userId === taskOwnerId) ||
    (selected === 'Delegated Tasks' && r.event.creatorId !== r.event.userId && (selectedUserId === ALL_PLANNERS || r.event.creatorId === selectedUserId)) ||
    (selected === 'Completed' && state(r) === 'Completed') ||
    (selected === 'Upcoming' && day(r) > today && !['Completed', 'Not Applicable'].includes(state(r))) ||
    (selected === 'Overdue' && day(r) < today && !['Completed', 'Not Applicable'].includes(state(r)));
  const commentIndex = useMemo(()=>new Map(dailyPlannerComments.map(day=>[day.id,Object.values(day.comments||{})])),[dailyPlannerComments]);
  const comments = (r: Instance) => (commentIndex.get(day(r)+'_'+r.event.userId)||[]).filter(c=>c.eventId===r.event.id);
  const unread = (r: Instance) => unreadTaskComments(comments(r),user?.id);
  const preview = (r: Instance) => latestTaskComment(unread(r)) || latestTaskComment(comments(r));
  const authorDetail = (r: Instance) => {const c=preview(r);if(!c)return '';const author=users.find(u=>u.id===c.userId);return (author?.name||'Former user')+(author?.role==='Admin'?' · Admin':c.userId===r.event.creatorId?' · Creator':'');};
  const updateTime = (r: Instance) => {const c=preview(r);if(!c)return '';const date=new Date(c.date);return Number.isNaN(date.getTime())?'':format(date,'dd MMM, h:mm a');};
  const newUpdates = useMemo(()=>unreadTaskRows(plannerEvents.filter(e=>plannerEventVisible(e,selectedUserId,visibleUserIds)),dailyPlannerComments,user?.id),[plannerEvents,dailyPlannerComments,user?.id,selectedUserId,visibleUserIds]);
  const openUpdates = () => {setCalendarView(false);setAssignment('all');setTab('New updates');setFrom('');setTo('');setStatus('');setCategory('');setLocation('');setQuery('');setPage(1);document.getElementById('planner-task-table')?.scrollIntoView({behavior:'smooth'});};

  const matchesAssignment = (r:Instance) => assignment==='all' || (assignment==='mine' && r.event.userId===taskOwnerId) || (assignment==='delegated' && r.event.creatorId!==r.event.userId && (selectedUserId===ALL_PLANNERS || r.event.creatorId===selectedUserId)) || (assignment==='pending' && !['Completed','Not Applicable'].includes(state(r)));
  const filtered = (tab==='New updates'?newUpdates:tableRows).filter(r => matchesAssignment(r) && (tab==='New updates'||(matchesTab(r, tab) && includeInTaskView(r,today,tab,from,to,status,format(currentMonth,'yyyy-MM')>today.slice(0,7)))) && (!status || state(r) === status) && (!category || r.event.category === category) && (!location || r.event.location === location) && (!from || day(r) >= from) && (!to || day(r) <= to) && [r.event.title, r.event.description, r.event.equipmentRef, r.event.location, name(r.event.userId), name(r.event.creatorId), ...comments(r).flatMap(c=>[c.text,name(c.userId)])].join(' ').toLowerCase().includes(query.toLowerCase().trim())).sort((a,b)=> {if(tab==='New updates')return (preview(b)?.date||'').localeCompare(preview(a)?.date||'');const rank=(r:Instance)=>({overdue:0,today:1,upcoming:2,closed:3}[taskTiming(r,today)]);return rank(a)-rank(b)||plannerTaskOrder(a,b,today);});
  useEffect(() => { setPage(1); setSelected(new Set()); }, [query, status, category, location, tab, assignment, from, to, size, currentMonth, selectedUserId]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const daily = rows.filter(r => isSameDay(r.eventDate, selectedDate || new Date()));

  const canEdit = (r: Instance) => user?.role === 'Admin' || r.event.creatorId === user?.id;
  const canUpdate = (r: Instance) => !!user?.id && r.event.userId === user.id;
  const updateStatus = async (r: Instance, value: string) => {
    if (!canUpdate(r)) return;
    const key = `${r.event.id}/${day(r)}`; setSaving(key);
    try { await update(ref(rtdb, `plannerEvents/${r.event.id}/instanceStatuses`), { [day(r)]: value }); }
    catch { toast({ variant: 'destructive', title: 'Could not save task status. Please try again.' }); }
    finally { setSaving(null); }
  };
  const stopFromToday = async () => {
    if (!stopping || !canEdit(stopping) || stopSaving) return;
    setStopSaving(true);
    try {
      await stopPlannerEventFromToday(stopping.event.id,cutoffDay || stopDate);
      toast({title:'Task stopped from '+(cutoffDay||stopDate),description:'Earlier dates, statuses and conversations remain saved.'});
      setStopping(null);
    } catch (error) {
      toast({variant:'destructive',title:'Could not stop task',description:error instanceof Error ? error.message : 'Please try again.'});
    } finally {setStopSaving(false);}
  };
  const deleteEntireTask = async () => {
    if(!purging || !canEdit(purging) || purgeSaving || purgeText!=='DELETE')return;
    setPurgeSaving(true);
    try {await permanentlyDeletePlannerEvent(purging.event.id);setPurging(null);setView(null);setEditing(null);toast({title:'Task permanently deleted',description:'The task and its linked history have been removed.'});}
    catch(error){toast({variant:'destructive',title:'Could not delete task',description:error instanceof Error?error.message:'Please try again.'});}
    finally{setPurgeSaving(false);}
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
  const saveInlineRemark = async (r: Instance) => {
    const key = rowKey(r), text = remarkDrafts[key]?.trim();
    if (!user || !text || remarkSaveLock.current || !plannerEventVisible(r.event,selectedUserId,visibleUserIds)) return;
    remarkSaveLock.current = true;
    setRemarkSaving(key);
    try {
      await addPlannerEventComment(r.event.userId,day(r),r.event.id,text);
      setRemarkDrafts(previous => { const next={...previous}; delete next[key]; return next; });
      setRemarkEditor(current => current === key ? null : current);
      toast({title:'Update saved',description:'Your remark is saved in this task’s conversation.'});
    } catch { toast({variant:'destructive',title:'Could not save update',description:'Your draft has been kept. Please try again.'}); }
    finally { remarkSaveLock.current=false; setRemarkSaving(null); }
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
  const cards = [
    {title:'Open tasks',value:tableRows.filter(r=>includeInTaskView(r,today,'All Tasks','','','',false)).length,tab:'All Tasks',icon:ClipboardList,tone:'blue'},
    {title:'Overdue',value:tableRows.filter(r=>taskTiming(r,today)==='overdue').length,tab:'Overdue',icon:AlertCircle,tone:'rose'},
    {title:'Due today',value:tableRows.filter(r=>taskTiming(r,today)==='today').length,tab:'Current Tasks',icon:CalendarDays,tone:'blue'},
    {title:'Unread updates',value:newUpdates.length,tab:'New updates',icon:Bell,tone:'amber'}
  ];
  const selectTaskTab = (next:string) => {setCalendarView(false);setTab(next);setFrom('');setTo('');setStatus('');setPage(1);if(next==='New updates'){setAssignment('all');setQuery('');setCategory('');setLocation('');}};
  const calendarDays = eachDayOfInterval({start:startOfWeek(startOfMonth(currentMonth)),end:endOfWeek(endOfMonth(currentMonth))});
  const calendarRows = rows.filter(r=>matchesAssignment(r)&&(!status||state(r)===status)&&(!category||r.event.category===category)&&(!location||r.event.location===location)&&[r.event.title,r.event.description,name(r.event.userId),...comments(r).map(c=>c.text)].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
  const changeMonth = (offset:number) => {setCurrentMonth(addMonths(currentMonth,offset));setFrom('');setTo('');};
  const showDay = (date:Date) => {setCurrentMonth(date);setSelectedDate(date);setFrom(format(date,'yyyy-MM-dd'));setTo(format(date,'yyyy-MM-dd'));setTab('All Tasks');setCalendarView(false);setStatus('');setPage(1);};
  return <div className={styles.planner}>

    <section className={styles.metrics} aria-label="Planner summary">{cards.map(c=><button key={c.title} data-tone={c.tone} onClick={()=>selectTaskTab(c.tab)}><c.icon size={18}/><span><span>{c.title}</span><strong>{c.value}</strong></span></button>)}</section>
    <div className={styles.workspace}>
      <aside className={styles.calendarRail} aria-label="Calendar and selected day agenda">
        <h2>Calendar</h2>
        <div className={styles.monthNav}><button aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button><label><span>{format(currentMonth,'MMMM yyyy')}</span><input aria-label="Choose calendar month" type="month" value={format(currentMonth,'yyyy-MM')} onChange={e=>{if(e.target.value){setCurrentMonth(new Date(e.target.value+'-01T00:00:00'));setFrom('');setTo('');}}}/></label><button aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button><button className={styles.todayButton} onClick={()=>{setCurrentMonth(new Date());setSelectedDate(new Date());setFrom('');setTo('');}}>Today</button></div>
        <div className={styles.calendar}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><small key={d}>{d}</small>)}{calendarDays.map(d=><button key={format(d,'yyyy-MM-dd')} className={isSameDay(d,selectedDate||new Date())?styles.selectedDay:''} data-outside={!isSameMonth(d,currentMonth)} aria-label={format(d,'PPPP')} aria-pressed={isSameDay(d,selectedDate||new Date())} onClick={()=>{setSelectedDate(d);if(!isSameMonth(d,currentMonth))setCurrentMonth(d);}}><b>{format(d,'d')}</b><span>{rows.filter(r=>isSameDay(r.eventDate,d)).slice(0,3).map((r,i)=><i key={i} data-timing={taskTiming(r,today)}/>)}</span></button>)}</div>
        <section className={styles.agenda}><header><h3>{format(selectedDate||new Date(),'EEEE, d MMMM')}</h3><span>{daily.length} tasks</span></header><div className={styles.agendaList}>{daily.length?daily.map(r=><button key={rowKey(r)} onClick={()=>setView(r)}><i/><time>{r.event.time||'—'}</time><span>{r.event.title}</span></button>):<p>No tasks scheduled for this day.</p>}</div><button className={styles.textLink} onClick={()=>showDay(selectedDate||new Date())}>View day tasks →</button></section>
        <div className={styles.calendarKey}>Key: <span><i/>Today</span><span><i/>Overdue</span></div>
      </aside>
      <section className={styles.panel} id="planner-task-table">
        <header className={styles.registerTop}><h2>Tasks</h2><div><div className={styles.viewSwitch} aria-label="Planner view"><button aria-pressed={!calendarView} onClick={()=>setCalendarView(false)}><List size={17}/>List view</button><button aria-pressed={calendarView} onClick={()=>{setFrom('');setTo('');setCalendarView(true);}}><CalendarDays size={17}/>Calendar view</button></div><button onClick={exportExcel}><Download size={17}/>{selected.size?'Export selected ('+selected.size+')':'Export'}</button></div></header>
        {newUpdates.length>0&&<aside className={styles.updateNotice} role="status"><Bell size={20}/><strong>{newUpdates.length} {newUpdates.length===1?'task has':'tasks have'} unread updates</strong><button onClick={openUpdates}>Review updates →</button></aside>}
        <div className={styles.toolbar}><nav className={styles.tabs} aria-label="Task lists">{tabs.map(t=><button key={t} aria-pressed={tab===t&&!calendarView} onClick={()=>selectTaskTab(t)}>{t==='All Tasks'?'Open work':t==='Current Tasks'?'Today':t}<small data-tab={t}>{t==='New updates'?newUpdates.length:tableRows.filter(r=>matchesTab(r,t)&&includeInTaskView(r,today,t,'','','',false)).length}</small></button>)}</nav></div>
        <div className={styles.filters}><select aria-label="Assignment scope" value={assignment} onChange={e=>setAssignment(e.target.value)}><option value="all">All assignments</option><option value="mine">My tasks</option><option value="delegated">Delegated tasks</option><option value="pending">Pending tasks</option></select><label className={styles.searchField}><Search size={17}/><input aria-label="Search tasks" placeholder="Search tasks or people…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Status</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><select aria-label="Filter location" value={location} onChange={e=>setLocation(e.target.value)}><option value="">Location</option>{[...new Set(rows.map(r=>r.event.location).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select><button aria-expanded={moreFilters} onClick={()=>setMoreFilters(!moreFilters)}><SlidersHorizontal size={17}/>Filters</button></div>
        {moreFilters&&<div className={styles.extraFilters}><label>Category<select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(rows.map(r=>r.event.category).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select></label><label>From<input aria-label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input aria-label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button onClick={()=>showDay(new Date())}>Today</button><button onClick={()=>showDay(addDays(new Date(),1))}>Tomorrow</button><button onClick={()=>{setCurrentMonth(new Date());selectTaskTab('Overdue');}}>Earlier unfinished tasks</button><button onClick={()=>{setQuery('');setStatus('');setCategory('');setLocation('');setFrom('');setTo('');setAssignment('all');}}>Clear filters</button></div>}
        <p className={styles.listHint}>{calendarView?'Calendar view · Select a task to view its details':tab==='New updates'?'Unread conversations across all dates':from||to?'Showing tasks for the selected dates':'Add remarks directly from each task row.'}{!calendarView&&tab==='All Tasks'&&!from&&!to&&<span>Overdue and current tasks · Future tasks hidden</span>}</p>
        {calendarView&&<div className={styles.monthView}><div className={styles.monthWeekdays}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div><div className={styles.monthGrid}>{calendarDays.map(d=>{const items=calendarRows.filter(r=>isSameDay(r.eventDate,d));return <section key={format(d,'yyyy-MM-dd')} data-outside={!isSameMonth(d,currentMonth)}><button className={styles.monthDate} aria-label={'View tasks for '+format(d,'PPPP')} aria-current={isSameDay(d,new Date())?'date':undefined} onClick={()=>showDay(d)}>{format(d,'d')}</button>{items.slice(0,3).map(r=><button key={rowKey(r)} className={styles.monthEvent} data-timing={taskTiming(r,today)} onClick={()=>setView(r)}><time>{r.event.time}</time>{r.event.title}</button>)}{items.length>3&&<button className={styles.moreEvents} onClick={()=>showDay(d)}>+{items.length-3} more</button>}</section>;})}</div></div>}
      <div className={styles.tableScroll} hidden={calendarView} ref={tableViewportRef}><table><thead><tr><th><input type="checkbox" aria-label="Select this page for export" checked={visible.length > 0 && visible.every(r=>selected.has(rowKey(r)))} onChange={e=>setSelected(previous=>{const next=new Set(previous);visible.forEach(r=>e.target.checked?next.add(rowKey(r)):next.delete(rowKey(r)));return next;})}/></th>{['Task / Activity','Assigned to','Due date','Status','Remarks / Latest update','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map((r,i)=><Fragment key={rowKey(r)}><tr data-unread={unread(r).length>0} data-timing={taskTiming(r,today)} data-editing={remarkEditor===rowKey(r)}><td><input type="checkbox" aria-label={`Select ${r.event.title} for export`} checked={selected.has(rowKey(r))} onChange={e=>setSelected(previous=>{const next=new Set(previous);e.target.checked?next.add(rowKey(r)):next.delete(rowKey(r));return next;})}/></td><td data-column="task"><button className={styles.taskTitle} onClick={()=>setView(r)}>{unread(r).length>0&&<span className={styles.unreadDot}/>} {r.event.title}</button><small className={styles.taskMeta}>{r.event.category||'General'}{r.event.location?' · '+r.event.location:''}{r.event.equipmentRef?' · '+r.event.equipmentRef:''}</small></td><td data-column="owner">{person(r)}</td><td data-column="due">{format(r.eventDate,'dd MMM yyyy')}{r.event.time&&<small className={styles.taskMeta}>{r.event.time}</small>}<small className={styles.timingLabel} data-timing={taskTiming(r,today)}>{({overdue:'Overdue',today:'Today',upcoming:'Upcoming',closed:'Closed'})[taskTiming(r,today)]}</small></td><td data-column="status">{canUpdate(r) ? <select className={styles.badge} data-status={state(r)} aria-label={`Status for ${r.event.title} on ${day(r)}`} value={state(r)} disabled={saving===`${r.event.id}/${day(r)}`} onChange={e=>updateStatus(r,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select> : badge(r)}</td><td data-column="remark"><button className={styles.remark} title={preview(r)?.text||'No updates yet'} onClick={()=>setView(r)}>
{preview(r)&&<span className={styles.updateAuthor}>{authorDetail(r)}<time>{updateTime(r)}</time></span>}
<span>{preview(r)?.text||'No updates yet'}</span>
{unread(r).length>0&&<strong className={styles.unreadBadge}><MessageSquare size={13}/>{unread(r).length===1?'New update':unread(r).length+' new updates'}</strong>}
</button><div className={styles.remarkLinks}><button disabled={!!remarkSaving} aria-expanded={remarkEditor===rowKey(r)} aria-controls={'remark-'+r.event.id+'-'+day(r)} onClick={()=>setRemarkEditor(rowKey(r))}>{remarkEditor===rowKey(r)?'Writing update…':'+ Add update'}</button><button onClick={()=>setView(r)}>View history ({comments(r).length})</button></div></td><td data-column="actions"><div className={styles.controls}>{canEdit(r)&&<button aria-label={`Edit ${r.event.title}`} onClick={()=>setEditing(r.event)}><Pencil size={16}/></button>}<button aria-label={`View and reply to ${r.event.title}`} onClick={()=>setView(r)}><MessageSquare size={16}/></button><DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`More actions for ${r.event.title}`}><MoreVertical size={17}/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>setView(r)}>View conversation</DropdownMenuItem>{canEdit(r)&&<DropdownMenuItem className="text-destructive" onSelect={()=>setDeleting(r)}><Trash2 size={14} className="mr-2"/>Remove this day only</DropdownMenuItem>}{canEdit(r)&&<><DropdownMenuItem className="text-destructive" onSelect={()=>{setCutoffDay(day(r));setStopping(r);}}>Stop from this date onward</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={()=>{setCutoffDay(stopDate);setStopping(r);}}>Stop from today onward</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={()=>{setPurgeText('');setPurging(r);}}>Permanently delete entire task</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div></td></tr>{remarkEditor===rowKey(r)&&<tr className={styles.inlineRemarkRow}><td colSpan={7}><div className={styles.inlineRemark} id={'remark-'+r.event.id+'-'+day(r)}><label htmlFor={'remark-input-'+r.event.id+'-'+day(r)}>New update · {r.event.title}</label><p>For {name(r.event.userId)} · {format(r.eventDate,'dd MMM yyyy')}</p><textarea id={'remark-input-'+r.event.id+'-'+day(r)} autoFocus rows={3} placeholder="Write a remark or progress update…" value={remarkDrafts[rowKey(r)]||''} disabled={remarkSaving===rowKey(r)} onChange={e=>{const text=e.target.value;setRemarkDrafts(previous=>({...previous,[rowKey(r)]:text}));}} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.nativeEvent.isComposing){e.preventDefault();void saveInlineRemark(r);}}}/><div className={styles.inlineRemarkFooter}><small>Ctrl + Enter to save · Enter for a new line</small><button disabled={!!remarkSaving} onClick={()=>{setRemarkEditor(null);setRemarkDrafts(previous=>{const next={...previous};delete next[rowKey(r)];return next;});}}>Cancel</button><button className={styles.saveRemark} disabled={!!remarkSaving||!remarkDrafts[rowKey(r)]?.trim()} onClick={()=>void saveInlineRemark(r)}><Send size={15}/>{remarkSaving===rowKey(r)?'Saving…':'Save update'}</button></div></div></td></tr>}</Fragment>)}{!visible.length&&<tr><td colSpan={7} className={styles.empty}>No tasks match these filters.</td></tr>}</tbody></table></div>
      <footer className={styles.pagination} hidden={calendarView}><span>Showing {filtered.length ? (currentPage-1)*size+1 : 0} to {Math.min(currentPage*size,filtered.length)} of {filtered.length} tasks</span><div><label>Rows per page: <select aria-label="Rows per page" value={size} onChange={e=>setSize(Number(e.target.value))}>{[10,20,50,100].map(n=><option key={n}>{n}</option>)}</select></label><button disabled={currentPage===1} onClick={()=>setPage(1)} aria-label="First page">«</button><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)} aria-label="Previous page">‹</button>{Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-currentPage)<=1).map((n,i,ns)=><span key={n}>{i>0&&n-ns[i-1]>1&&' … '}<button aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}>{n}</button></span>)}<button disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)} aria-label="Next page">›</button><button disabled={currentPage===pages} onClick={()=>setPage(pages)} aria-label="Last page">»</button></div></footer>
    </section>
    </div>
    {view&&<EventInstanceDialog key={`${view.event.id}-${day(view)}`} isOpen setIsOpen={()=>setView(null)} event={plannerEvents.find(e=>e.id===view.event.id)||view.event} date={view.eventDate} plannerUserId={view.event.userId} onEdit={setEditing}/>}
    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!removing)setDeleting(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this event for this day only?</AlertDialogTitle><AlertDialogDescription>
        {deleting && <>“{deleting.event.title}” will be removed only from {format(deleting.eventDate,'dd MMM yyyy')} for {name(deleting.event.userId)}. All past history, statuses, comments and replies remain saved against the same user. Other dates and future recurring occurrences will not be removed.</>}
      </AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel><AlertDialogAction disabled={removing} className="bg-destructive text-white hover:bg-destructive/90" onClick={e=>{e.preventDefault();void removeOccurrence();}}>{removing?'Removing…':'Remove this day only'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!stopping} onOpenChange={open=>{if(!open&&!stopSaving)setStopping(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Stop this task from the selected date?</AlertDialogTitle><AlertDialogDescription>
        {stopping && <>“{stopping.event.title}” for {name(stopping.event.userId)} will no longer appear from {cutoffDay || stopDate}, including that date and all later dates. An existing cutoff can be moved earlier; it will never be moved later. All earlier tasks, their statuses, comments and replies remain unchanged. Other users’ task series are unaffected.</>}
      </AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={stopSaving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={stopSaving} onClick={e=>{e.preventDefault();void stopFromToday();}}>{stopSaving?'Stopping…':'Confirm cutoff'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!purging} onOpenChange={open=>{if(!open&&!purgeSaving)setPurging(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete entire task?</AlertDialogTitle><AlertDialogDescription>{purging&&<>Delete “{purging.event.title}” for {name(purging.event.userId)} on ALL dates, including past completed occurrences, statuses, updates, comments, replies and task notification history. This cannot be undone. Other tasks and shared daily notes are preserved.</>}</AlertDialogDescription></AlertDialogHeader><label>Type DELETE to confirm<input aria-label="Type DELETE to permanently delete task" value={purgeText} onChange={e=>setPurgeText(e.target.value)} disabled={purgeSaving} className="mt-2 w-full rounded border p-2" autoComplete="off"/></label><AlertDialogFooter><AlertDialogCancel disabled={purgeSaving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={purgeSaving||purgeText!=='DELETE'} className="bg-destructive text-white" onClick={e=>{e.preventDefault();void deleteEntireTask();}}>{purgeSaving?'Deleting…':'Permanently delete task'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {editing&&<EditEventDialog isOpen setIsOpen={()=>setEditing(null)} event={editing}/>}
  </div>;
}
