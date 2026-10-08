'use client';
import styles from './schedule-worksheet.module.css';
import ScheduleFormTextCell from './ScheduleFormTextCell';
import { scheduleColumns, scheduleAssignmentConflict, copyScheduleJobDetails } from './schedule-worksheet';
import { useFieldArray, useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, PlusCircle, Save, Trash2, Copy, Users, ChevronsUpDown, ArrowUp, ArrowDown, Search, UserX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const scheduleItemSchema = z.object({
  id: z.string(),
  manpowerIds: z.array(z.string()).min(1, "Select at least one person"),
  jobType: z.string().optional().or(z.literal('')),
  jobNo: z.string().optional().or(z.literal('')),
  projectVesselName: z.string().optional().or(z.literal('')),
  projectId: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  reportingTime: z.string().optional().or(z.literal('')),
  clientContact: z.string().optional().or(z.literal('')),
  vehicleId: z.string().optional(),
  remarks: z.string().optional(),
});

const scheduleSchema = z.object({
  name: z.string().optional(),
  items: z.array(scheduleItemSchema).min(1, "Add at least one job row"),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface EditableJobScheduleProps {
  schedule?: JobSchedule;
  selectedDate: string;
  globallyAssignedIds: Set<string>;
  onSaved: (schedule: JobSchedule) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function EditableJobSchedule({ schedule, selectedDate, globallyAssignedIds, onSaved, onCancel, onDirtyChange }: EditableJobScheduleProps) {
  const { user, users, manpowerProfiles, vehicles, jobSchedules, saveJobSchedule, projects, can } = useAppContext();
  const { toast } = useToast();
  
  const [selectedRow, setSelectedRow] = useState(0);
  const [personnelRow, setPersonnelRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'cancel' | null>(null);
  const [searchPersonId, setSearchPersonId] = useState<string | null>(null);
  const [searchPopoverOpen, setSearchPersonPopoverOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: schedule?.name ?? '',
      items: schedule?.items ?? [],
    },
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form.formState.isDirty]);

  useEffect(() => { onDirtyChange?.(form.formState.isDirty); }, [form.formState.isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const { fields, append, remove, replace, insert, move } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const manpowerOptions = useMemo(() => {
    const regularManpower = manpowerProfiles
        .filter(p => p.status === 'Working')
        .map(p => {
            const project = projects.find(proj => proj.id === p.projectId);
            const projectText = project ? `, ${project.name}` : '';
            return { value: p.id, label: `${p.name} (${p.trade}${projectText})` };
        });

    const adminAndManagers = users
        .filter(u => (u.role === 'Admin' || u.role === 'Manager' || u.role === 'Project Coordinator') && u.status === 'active')
        .map(u => {
            const projectName = u.projectIds && u.projectIds.length > 0
                ? projects.find(p => p.id === u.projectIds?.[0])?.name
                : '';
            return { value: u.id, label: `${u.name} (${u.role}${projectName ? `, ${projectName}`: ''})` };
        });
    
    const combinedMap = new Map();
    regularManpower.forEach(u => combinedMap.set(u.value, u));
    adminAndManagers.forEach(u => {
        if (!combinedMap.has(u.value)) {
            combinedMap.set(u.value, u);
        }
    });
    return Array.from(combinedMap.values());
  }, [manpowerProfiles, users, projects]);

  // Only personnel changes refresh the worksheet; typing belongs to individual cells.
  useWatch({ control: form.control, name: fields.map((_, index) => `items.${index}.manpowerIds` as const), exact: true });
  const watchedItems = form.getValues('items');
  const watchedName = form.watch('name');

  // Recompute from the subscribed draft: nested RHF writes must invalidate availability.
  const currentlyAssignedManpowerIdsInThisForm = new Set(watchedItems.flatMap(item => item.manpowerIds || []));

  const assignedPersonnel = (() => {
    const list: { id: string; name: string; rowIndex: number }[] = [];
    watchedItems.forEach((item, index) => {
        if (!item.manpowerIds) return;
        item.manpowerIds.forEach(id => {
            const option = manpowerOptions.find(o => o.value === id);
            list.push({ id, name: option ? option.label : id, rowIndex: index });
        });
    });
    return list;
  })();

  const movePersonWithinRow = (id: string, rowIndex: number, direction: -1 | 1) => {
    const ids = form.getValues(`items.${rowIndex}.manpowerIds`) || [];
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const reordered = [...ids];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    form.setValue(`items.${rowIndex}.manpowerIds`, reordered, { shouldDirty: true });
  };

  const handleQuickUnassign = (id: string, rowIndex: number) => {
      const currentIds = form.getValues(`items.${rowIndex}.manpowerIds`);
      form.setValue(`items.${rowIndex}.manpowerIds`, (currentIds || []).filter(val => val !== id), { shouldDirty: true, shouldValidate: true });
      setSearchPersonId(null);
      toast({ title: "Person Unassigned" });
  };

  const handleQuickReassign = (id: string, fromRowIndex: number, toRowIndex: number) => {
      if (fromRowIndex === toRowIndex || !Number.isInteger(toRowIndex)) return;
      const draft = form.getValues('items');
      if (!draft[toRowIndex] || !draft[fromRowIndex]?.manpowerIds?.includes(id)) return;
      const fromIds = form.getValues(`items.${fromRowIndex}.manpowerIds`);
      form.setValue(`items.${fromRowIndex}.manpowerIds`, fromIds.filter(val => val !== id), { shouldDirty: true, shouldValidate: true });
      
      const toIds = form.getValues(`items.${toRowIndex}.manpowerIds`) || [];
      if (!toIds.includes(id)) {
          form.setValue(`items.${toRowIndex}.manpowerIds`, [...toIds, id], { shouldDirty: true, shouldValidate: true });
      }
      setSearchPersonId(null);
      toast({ title: "Person Reassigned" });
  };
  
  const vehicleOptions = useMemo(() => vehicles || [], [vehicles]);

  const displayName = (id: string) => manpowerProfiles.find(p => p.id === id)?.name || users.find(u => u.id === id)?.name || id;
  const onSubmit = async (data: ScheduleFormValues) => {
    if (!user || !can.manage_job_schedule || schedule?.isLocked || saveLock.current) return;
    const conflict = scheduleAssignmentConflict(data.items, globallyAssignedIds);
    if (conflict) { toast({ variant: 'destructive', title: 'Duplicate assignment', description: displayName(conflict) + ' is already assigned on this date. Please adjust the rows before saving.' }); return; }
    const saved: JobSchedule = {
      ...schedule,
      id: schedule?.id || 'schedule_' + selectedDate,
      name: data.name, date: selectedDate, projectId: schedule?.projectId || 'all',
      supervisorId: schedule?.supervisorId || user.id,
      createdAt: schedule?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      items: data.items, isLocked: schedule?.isLocked || false,
    };
    saveLock.current = true; setSaving(true);
    try { await saveJobSchedule(saved); form.reset(data); toast({ title: 'Schedule Saved' }); onSaved(saved); }
    catch { toast({ variant: 'destructive', title: 'Schedule could not be saved', description: 'Your changes are still here. Please try again.' }); }
    finally { saveLock.current = false; setSaving(false); }
  };

  const handleCopyYesterday = () => {
    if (!selectedDate) return;
    
    const dateObj = parseISO(selectedDate);
    const yesterdayStr = format(subDays(dateObj, 1), 'yyyy-MM-dd');
    const currentName = (form.getValues('name') || '').trim();
    
    // Improved matching with fallback for "Schedule 1"
    const yesterdaySchedule = jobSchedules.find(s => {
        const isDateMatch = s.date === yesterdayStr;
        if (!isDateMatch) return false;
        
        const nameMatch = (s.name || '').trim() === currentName;
        // Fallback for "Schedule 1" to match old un-named records or records with default date IDs
        const isFirstScheduleFallback = currentName === 'Schedule 1' && (!s.name || s.id === `schedule_${yesterdayStr}`);
        
        return nameMatch || isFirstScheduleFallback;
    });
    
    if (yesterdaySchedule && yesterdaySchedule.items) {
      const newItems = yesterdaySchedule.items.map(item => ({
        ...item,
        id: `item-${Date.now()}-${Math.random()}`, 
      }));
      replace(newItems);
      toast({ title: `Copied "${currentName}" from Yesterday` });
    } else {
      toast({ 
          variant: 'destructive', 
          title: 'Copy Failed',
          description: `No matching schedule "${currentName || 'Untitled'}" found from yesterday (${yesterdayStr}).` 
      });
    }
  };

  const yesterdayScheduleExists = useMemo(() => {
    if (!jobSchedules || !selectedDate) return false;
    const dateObj = parseISO(selectedDate);
    const yesterdayStr = format(subDays(dateObj, 1), 'yyyy-MM-dd');
    const currentName = (watchedName || '').trim();
    
    return jobSchedules.some(s => {
        const isDateMatch = s.date === yesterdayStr;
        if (!isDateMatch) return false;
        
        const nameMatch = (s.name || '').trim() === currentName;
        const isFirstScheduleFallback = currentName === 'Schedule 1' && (!s.name || s.id === `schedule_${yesterdayStr}`);
        
        return nameMatch || isFirstScheduleFallback;
    });
  }, [jobSchedules, selectedDate, watchedName]);
  
  const getAssignmentInfo = (manpowerId: string) => {
    const row = watchedItems.findIndex(item => item.manpowerIds?.includes(manpowerId));
    if (row >= 0) return 'Assigned in row ' + (row + 1) + ' of this draft. Use Find assigned person to move them.';
    for (const other of jobSchedules) {
      if (other.date !== selectedDate || other.id === schedule?.id) continue;
      const otherRow = (other.items || []).findIndex(item => item.manpowerIds?.includes(manpowerId));
      if (otherRow >= 0) return 'Assigned in "' + (other.name || 'Main Schedule') + '", row ' + (otherRow + 1) + '.';
    }
    return 'Assigned in another schedule on this date.';
  };

  const filterPersonnel = (_value: string, search: string, keywords?: string[]) => {
    const label = (keywords || []).join(' ').toLowerCase();
    return search.toLowerCase().trim().split(/\s+/).every(word => label.includes(word)) ? 1 : 0;
  };

  const generateNewItem = () => ({
    id: `item-${Date.now()}-${Math.random()}`,
    manpowerIds: [],
    jobType: '',
    jobNo: '',
    projectVesselName: '',
    projectId: '',
    location: '',
    reportingTime: '09:00',
    clientContact: '',
    vehicleId: 'none',
    remarks: '',
  });

  const selected = fields[selectedRow] ? selectedRow : Math.max(0, fields.length - 1);
  const addRow = () => { append(generateNewItem()); setSelectedRow(fields.length); };
  const choosePerson = (id: string) => { setSearchPersonId(id); setSearchPersonPopoverOpen(false); const found = assignedPersonnel.find(p => p.id === id); if (found) { setSelectedRow(found.rowIndex); document.getElementById('schedule-row-' + fields[found.rowIndex].id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } };

  return <form onSubmit={form.handleSubmit(onSubmit, () => toast({ variant: 'destructive', title: 'Check the highlighted rows', description: 'Each job needs at least one assigned person.' }))}>
    <fieldset disabled={saving} className={styles.editorFieldset}>
      <div className={styles.heading}>
        <div><h2>Edit {schedule?.name || 'Schedule'}</h2><p>All assigned personnel are shown in each job row.</p></div>
        <div className={styles.scheduleName}><Label htmlFor="worksheet-name">Schedule name</Label><Input id="worksheet-name" {...form.register('name')} /><span className={styles.draft}>{form.formState.isDirty ? 'Unsaved changes' : 'Editing'}</span></div>
      </div>
      <div className={styles.toolbar}>
        <Button type="button" size="sm" onClick={addRow}><PlusCircle className="mr-2 h-4 w-4" />Add job row</Button>
        <Button type="button" size="sm" variant="outline" disabled={!fields.length} title="Copies the job details with no personnel assigned" onClick={() => { insert(selected + 1, copyScheduleJobDetails(form.getValues('items.' + selected as `items.${number}`), generateNewItem().id)); setSelectedRow(selected + 1); }}><Copy className="mr-2 h-4 w-4" />Copy job details</Button>
        <Button type="button" size="sm" variant="outline" disabled={!fields.length || selected === 0} onClick={() => { move(selected, selected - 1); setSelectedRow(selected - 1); }}><ArrowUp className="mr-1 h-4 w-4" />Move up</Button>
        <Button type="button" size="sm" variant="outline" disabled={!fields.length || selected >= fields.length - 1} onClick={() => { move(selected, selected + 1); setSelectedRow(selected + 1); }}><ArrowDown className="mr-1 h-4 w-4" />Move down</Button>
        <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={!fields.length} onClick={() => setConfirmAction('delete')}><Trash2 className="mr-1 h-4 w-4" />Delete row</Button>
        <Popover open={searchPopoverOpen} onOpenChange={setSearchPersonPopoverOpen}>
          <PopoverTrigger asChild><Button type="button" variant="outline" size="sm" className={styles.findPerson}><Search className="mr-2 h-4 w-4" />Find assigned person...</Button></PopoverTrigger>
          <PopoverContent className="w-[min(360px,calc(100vw-24px))] p-0"><Command filter={filterPersonnel}><CommandInput placeholder="Search assigned names..." /><CommandList><CommandEmpty>No assigned person found.</CommandEmpty><CommandGroup>{assignedPersonnel.map(p => <CommandItem key={p.id + ':' + p.rowIndex} value={p.id + ":" + p.rowIndex} keywords={[p.name, displayName(p.id)]} onSelect={() => choosePerson(p.id)}>{displayName(p.id)} · Row {p.rowIndex + 1}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
        </Popover>
      </div>
      {searchPersonId && (() => { const found = assignedPersonnel.find(p => p.id === searchPersonId); return found ? <div className={styles.toolbar}><span>{displayName(searchPersonId)} · Row {found.rowIndex + 1}</span><Select onValueChange={v => handleQuickReassign(searchPersonId, found.rowIndex, Number(v))}><SelectTrigger className="w-40"><SelectValue placeholder="Move person to row" /></SelectTrigger><SelectContent>{fields.map((f, i) => <SelectItem key={f.id} value={String(i)} disabled={i === found.rowIndex}>Row {i + 1}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={() => handleQuickUnassign(searchPersonId, found.rowIndex)}>Unassign</Button><Button type="button" variant="ghost" aria-label="Clear person search" onClick={() => setSearchPersonId(null)}><X size={16} /></Button></div> : null; })()}
      <div className={styles.gridScroll} role="region" aria-label="Edit job schedule worksheet" tabIndex={0}>
        <table className={styles.sheet}>
          <colgroup><col className={styles.numberCol} /><col className={styles.personCol} />{scheduleColumns.slice(1).map(c => <col key={c} />)}</colgroup>
          <thead><tr><th scope="col">#</th>{scheduleColumns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{fields.map((field, index) => <tr key={field.id} id={'schedule-row-' + field.id} data-selected={index === selected} onFocusCapture={() => setSelectedRow(index)}>
            <td><button type="button" className={styles.rowSelect} aria-label={'Select row ' + (index + 1)} aria-pressed={index === selected} onClick={() => setSelectedRow(index)}>{index + 1}</button></td>
            <td>
              <ol className={styles.names}>{(watchedItems[index]?.manpowerIds || []).map((id, n) => <li key={id}><span className={styles.personNumber}>{n + 1}</span><span>{displayName(id)}</span><span className={styles.personOrder}>
                <button type="button" className={styles.orderPerson} disabled={n === 0} title="Move employee up within this row" aria-label={'Move ' + displayName(id) + ' up within row ' + (index + 1)} onClick={() => movePersonWithinRow(id, index, -1)}><ArrowUp size={12} /></button>
                <button type="button" className={styles.orderPerson} disabled={n === (watchedItems[index]?.manpowerIds.length || 0) - 1} title="Move employee down within this row" aria-label={'Move ' + displayName(id) + ' down within row ' + (index + 1)} onClick={() => movePersonWithinRow(id, index, 1)}><ArrowDown size={12} /></button>
              </span><button type="button" className={styles.removeName} aria-label={'Remove ' + displayName(id) + ' from row ' + (index + 1)} onClick={() => handleQuickUnassign(id, index)}><X size={12} /></button></li>)}</ol>
              <Controller name={`items.${index}.manpowerIds`} control={form.control} render={({ field: controllerField }) => <Popover open={personnelRow === field.id} onOpenChange={open => setPersonnelRow(open ? field.id : null)}><PopoverTrigger asChild><Button type="button" variant="link" className={styles.addPersonnel}>+ Add / change personnel</Button></PopoverTrigger>
                              <PopoverContent className="w-[min(360px,calc(100vw-24px))] p-0" align="start">
                                <Command filter={filterPersonnel}>
                                  <CommandInput placeholder="Search manpower..." />
                                  <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>

                                      {(personnelRow === field.id ? manpowerOptions : []).map(option => {
                                        const isSelectedInCurrentItem = controllerField.value?.includes(option.value);
                                        const isAssignedGlobally = globallyAssignedIds.has(option.value);
                                        const isAssignedInThisForm = currentlyAssignedManpowerIdsInThisForm.has(option.value);
                                        const isDisabled = (isAssignedGlobally || isAssignedInThisForm) && !isSelectedInCurrentItem;

                                        return <CommandItem key={option.value} value={option.value} keywords={[option.label]}
                                          disabled={isDisabled} className="w-full text-xs"
                                          onSelect={() => {
                                            const draft = form.getValues('items');
                                            const ids = draft[index]?.manpowerIds || [];
                                            if (!ids.includes(option.value) && (globallyAssignedIds.has(option.value) || draft.some((item, row) => row !== index && item.manpowerIds?.includes(option.value)))) return;
                                            controllerField.onChange(ids.includes(option.value) ? ids.filter(id => id !== option.value) : [...ids, option.value]);
                                          }}>
                                          <Check className={cn('mr-2 h-4 w-4 shrink-0', isSelectedInCurrentItem ? 'opacity-100' : 'opacity-0')} />
                                          <span>{option.label}{isDisabled && <span className="block text-[11px] text-muted-foreground whitespace-normal">{getAssignmentInfo(option.value)}</span>}</span>
                                        </CommandItem>;
                                      })}

                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
              </Popover>} />
              {form.formState.errors.items?.[index]?.manpowerIds && <p className={styles.error}>Select at least one person.</p>}
            </td>
            <td><ScheduleFormTextCell aria-label={`Job type, row ${index + 1}`} control={form.control} name={`items.${index}.jobType`} /></td>
            <td><ScheduleFormTextCell aria-label={`Job No., row ${index + 1}`} control={form.control} name={`items.${index}.jobNo`} /></td>
            <td><ScheduleFormTextCell aria-label={`Project / Vessel, row ${index + 1}`} control={form.control} name={`items.${index}.projectVesselName`} /></td>
            <td><Controller name={`items.${index}.projectId`} control={form.control} render={({field}) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger aria-label={'Project, row ' + (index + 1)}><SelectValue placeholder="Project" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>} /></td>
            <td><ScheduleFormTextCell aria-label={'Location, row ' + (index + 1)} control={form.control} name={`items.${index}.location`} /></td>
            <td><Input type="time" aria-label={'Reporting time, row ' + (index + 1)} {...form.register(`items.${index}.reportingTime`)} /></td>
            <td><ScheduleFormTextCell aria-label={'Client / Contact, row ' + (index + 1)} control={form.control} name={`items.${index}.clientContact`} /></td>
            <td><Controller name={`items.${index}.vehicleId`} control={form.control} render={({field}) => <Select value={field.value || 'none'} onValueChange={field.onChange}><SelectTrigger aria-label={'Vehicle, row ' + (index + 1)}><SelectValue placeholder="N/A" /></SelectTrigger><SelectContent><SelectItem value="none">N/A</SelectItem>{vehicleOptions.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>)}</SelectContent></Select>} /></td>
            <td><ScheduleFormTextCell aria-label={'Remarks, row ' + (index + 1)} control={form.control} name={`items.${index}.remarks`} /></td>
          </tr>)}{!fields.length && <tr><td colSpan={11} className={styles.empty}>No job entries. Add a job row to begin.</td></tr>}</tbody>
        </table>
      </div>
      <div className={styles.footer}>
        <div>{fields.length} job rows · {currentlyAssignedManpowerIdsInThisForm.size} personnel assigned{!fields.length && <Button type="button" variant="outline" size="sm" onClick={handleCopyYesterday} disabled={!yesterdayScheduleExists}><Copy size={14} className="mr-2" />Copy Yesterday</Button>}</div>
        <div className={styles.footerActions}><Button type="button" variant="outline" onClick={() => form.formState.isDirty ? setConfirmAction('cancel') : onCancel()}>Cancel changes</Button><Button type="submit" disabled={saving}><Save size={16} className="mr-2" />{saving ? 'Saving...' : 'Save Schedule'}</Button></div>
      </div>
    </fieldset>
    <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmAction === 'delete' ? 'Delete selected job row?' : 'Discard unsaved changes?'}</AlertDialogTitle><AlertDialogDescription>{confirmAction === 'delete' ? 'This removes the job and its personnel assignments from this draft. Save Schedule to apply the deletion.' : 'The saved schedule will remain unchanged.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { if (confirmAction === 'delete') { remove(selected); setSelectedRow(Math.max(0, selected - 1)); } else onCancel(); setConfirmAction(null); }}>{confirmAction === 'delete' ? 'Delete row' : 'Discard changes'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </form>;
}
