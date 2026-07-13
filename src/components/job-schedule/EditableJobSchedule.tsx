'use client';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, PlusCircle, Save, Trash2, Copy, Users, ChevronsUpDown, ArrowUp, ArrowDown, Search, UserX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

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
  items: z.array(scheduleItemSchema),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface EditableJobScheduleProps {
  schedule?: JobSchedule;
  selectedDate: string;
  globallyAssignedIds: Set<string>;
}

export default function EditableJobSchedule({ schedule, selectedDate, globallyAssignedIds }: EditableJobScheduleProps) {
  const { user, users, manpowerProfiles, vehicles, jobSchedules, saveJobSchedule, projects } = useAppContext();
  const { toast } = useToast();
  
  const [searchPersonId, setSearchPersonId] = useState<string | null>(null);
  const [searchPopoverOpen, setSearchPersonPopoverOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      items: schedule?.items ?? [],
    },
  });

  useEffect(() => {
    form.reset({ items: schedule?.items ?? [] });
  }, [schedule, form]);

  const { fields, append, remove, replace, insert } = useFieldArray({
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
        .filter(u => (u.role === 'Admin' || u.role === 'Manager') && u.status === 'active')
        .map(u => {
            const projectName = u.projectIds && u.projectIds.length > 0
                ? projects.find(p => p.id === u.projectIds[0])?.name
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

  const watchedItems = form.watch('items');

  const currentlyAssignedManpowerIdsInThisForm = useMemo(() => {
    return new Set(watchedItems.flatMap(item => item.manpowerIds || []));
  }, [watchedItems]);

  const assignedPersonnel = useMemo(() => {
    const list: { id: string; name: string; rowIndex: number }[] = [];
    watchedItems.forEach((item, index) => {
        if (!item.manpowerIds) return;
        item.manpowerIds.forEach(id => {
            const option = manpowerOptions.find(o => o.value === id);
            list.push({ id, name: option ? option.label : id, rowIndex: index });
        });
    });
    return list;
  }, [watchedItems, manpowerOptions]);

  const handleQuickUnassign = (id: string, rowIndex: number) => {
      const currentIds = form.getValues(`items.${rowIndex}.manpowerIds`);
      form.setValue(`items.${rowIndex}.manpowerIds`, currentIds.filter(val => val !== id));
      setSearchPersonId(null);
      toast({ title: "Person Unassigned" });
  };

  const handleQuickReassign = (id: string, fromRowIndex: number, toRowIndex: number) => {
      if (fromRowIndex === toRowIndex) return;
      const fromIds = form.getValues(`items.${fromRowIndex}.manpowerIds`);
      form.setValue(`items.${fromRowIndex}.manpowerIds`, fromIds.filter(val => val !== id));
      
      const toIds = form.getValues(`items.${toRowIndex}.manpowerIds`) || [];
      if (!toIds.includes(id)) {
          form.setValue(`items.${toRowIndex}.manpowerIds`, [...toIds, id]);
      }
      setSearchPersonId(null);
      toast({ title: "Person Reassigned" });
  };
  
  const vehicleOptions = useMemo(() => vehicles || [], [vehicles]);

  const onSubmit = (data: ScheduleFormValues) => {
    const scheduleId = `schedule_${selectedDate}`;
    saveJobSchedule({
      id: schedule?.id || scheduleId,
      date: selectedDate,
      projectId: 'all', 
      supervisorId: user!.id,
      createdAt: schedule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: data.items,
      isLocked: schedule?.isLocked || false,
    });
    toast({ title: 'Schedule Saved', description: 'Your changes have been saved successfully.' });
  };
  
  const handleCopyYesterday = () => {
    const yesterdayStr = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
    const yesterdaySchedule = jobSchedules.find(s => s.date === yesterdayStr);
    
    if (yesterdaySchedule && yesterdaySchedule.items) {
      const newItems = yesterdaySchedule.items.map(item => ({
        ...item,
        id: `item-${Date.now()}-${Math.random()}`, 
      }));
      replace(newItems);
      toast({ title: "Yesterday's Schedule Copied", description: "Review and save the schedule for today." });
    } else {
      toast({ variant: 'destructive', title: 'No Schedule Found', description: "No schedule from yesterday to copy." });
    }
  };

  const yesterdayScheduleExists = useMemo(() => {
    if (!jobSchedules) return false;
    const yesterdayStr = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
    return jobSchedules.some(s => s.date === yesterdayStr);
  }, [jobSchedules, selectedDate]);
  
  const getAssignmentInfo = (manpowerId: string) => {
    if (!jobSchedules) return 'Loading...';
    for (const s of jobSchedules) {
      if (s.date === selectedDate) {
        if (s.items && Array.isArray(s.items)) {
            for (const item of s.items) {
              if (item.manpowerIds.includes(manpowerId)) {
                const supervisor = users.find(u => u.id === s.supervisorId);
                const projectName = s.projectId !== 'all' ? (projects.find(p => p.id === s.projectId)?.name || 'a project') : 'the schedule';
                return `Assigned to ${projectName} by ${supervisor?.name || 'Unknown'}`;
              }
            }
        }
      }
    }
    return 'Assigned elsewhere on this date.';
  };

  const emptyItem = { 
    id: '', 
    manpowerIds: [], 
    jobType: '', 
    jobNo: '', 
    projectVesselName: '', 
    projectId: '',
    location: '', 
    reportingTime: '09:00', 
    clientContact: '', 
    vehicleId: 'none', 
    remarks: '' 
  };

  const generateNewItem = () => ({
    ...emptyItem,
    id: `item-${Date.now()}-${Math.random()}`,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Quick Personnel Finder & Reassignment */}
      <div className="p-4 bg-muted/20 border-b flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Find Assigned Person:</span>
          </div>
          <Popover open={searchPopoverOpen} onOpenChange={setSearchPersonPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[250px] justify-between h-9">
                    {searchPersonId ? (assignedPersonnel.find(p => p.id === searchPersonId)?.name || "Select person...") : "Search assigned staff..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Type name..." />
                    <CommandList>
                        <CommandEmpty>No assigned person found.</CommandEmpty>
                        <CommandGroup>
                            {Array.from(new Set(assignedPersonnel.map(p => p.id))).map(id => {
                                const p = assignedPersonnel.find(x => x.id === id);
                                return (
                                    <CommandItem key={id} value={p?.name} onSelect={() => {
                                        setSearchPersonId(id);
                                        setSearchPersonPopoverOpen(false);
                                    }}>
                                        <Check className={cn("mr-2 h-4 w-4", id === searchPersonId ? "opacity-100" : "opacity-0")} />
                                        {p?.name}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
          </Popover>

          {searchPersonId && (() => {
              const currentAssignment = assignedPersonnel.find(p => p.id === searchPersonId);
              if (!currentAssignment) return null;
              
              return (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                      <Badge variant="secondary" className="h-9 px-3">Row {currentAssignment.rowIndex + 1}</Badge>
                      <Select onValueChange={(val) => handleQuickReassign(searchPersonId, currentAssignment.rowIndex, parseInt(val))}>
                          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Move to Row..." /></SelectTrigger>
                          <SelectContent>
                              {fields.map((_, i) => (
                                  <SelectItem key={i} value={i.toString()} disabled={i === currentAssignment.rowIndex}>Row {i + 1}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <Button variant="destructive" size="sm" className="h-9" onClick={() => handleQuickUnassign(searchPersonId, currentAssignment.rowIndex)}>
                          <UserX className="mr-2 h-4 w-4" /> Unassign
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchPersonId(null)}><X className="h-4 w-4"/></Button>
                  </div>
              )
          })()}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="w-full">
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[50px]">Sr.No</TableHead>
                      <TableHead className="min-w-[250px]">Name</TableHead>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Job No.</TableHead>
                      <TableHead>Project/Vessel's Name</TableHead>
                      <TableHead className="min-w-[200px]">Project</TableHead>
                      <TableHead>Location Details</TableHead>
                      <TableHead>Reporting Time</TableHead>
                      <TableHead>Client/Contact</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <div className="px-1">
                          <Badge variant="secondary" className="font-bold text-xs h-6">
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Count: {watchedItems[index]?.manpowerIds?.length || 0}
                          </Badge>
                        </div>
                        <Controller
                          name={`items.${index}.manpowerIds`}
                          control={form.control}
                          render={({ field: controllerField }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start h-auto min-h-10 text-left">
                                  <div className="flex flex-wrap gap-1">
                                    {(controllerField.value || []).length > 0
                                      ? controllerField.value.map(id => {
                                          const option = manpowerOptions.find(p => p.value === id);
                                          return (
                                            <Badge 
                                              key={id} 
                                              variant="secondary"
                                              className="flex items-center gap-1 py-0.5"
                                            >
                                              <span className="max-w-[150px] truncate">{option?.label || id}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  const currentIds = form.getValues(`items.${index}.manpowerIds`);
                                                  form.setValue(`items.${index}.manpowerIds`, currentIds.filter(val => val !== id));
                                                }}
                                                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </Badge>
                                          );
                                        })
                                      : <span className="text-muted-foreground">Select...</span>}
                                  </div>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search manpower..." />
                                  <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                    <TooltipProvider>
                                      {manpowerOptions.map(option => {
                                        const isSelectedInCurrentItem = controllerField.value?.includes(option.value);
                                        const isAssignedGlobally = globallyAssignedIds.has(option.value);
                                        const isAssignedInThisForm = currentlyAssignedManpowerIdsInThisForm.has(option.value);
                                        const isDisabled = (isAssignedGlobally || isAssignedInThisForm) && !isSelectedInCurrentItem;

                                        return (
                                        <Tooltip key={option.value} open={isDisabled ? undefined : false}>
                                            <TooltipTrigger asChild>
                                                <div className={cn(isDisabled && 'cursor-not-allowed')}>
                                                <CommandItem
                                                    onSelect={() => {
                                                        if (isDisabled) return;
                                                        const selected = new Set(controllerField.value || []);
                                                        if (isSelectedInCurrentItem) {
                                                        selected.delete(option.value);
                                                        } else {
                                                        selected.add(option.value);
                                                        }
                                                        controllerField.onChange(Array.from(selected));
                                                    }}
                                                    disabled={isDisabled}
                                                    className={cn('w-full', isDisabled && 'opacity-50')}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", isSelectedInCurrentItem ? "opacity-100" : "opacity-0")} />
                                                    {option.label}
                                                </CommandItem>
                                                </div>
                                            </TooltipTrigger>
                                            {isDisabled && (
                                                <TooltipContent>
                                                    <p>{getAssignmentInfo(option.value)}</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                        )
                                      })}
                                      </TooltipProvider>
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {form.formState.errors.items?.[index]?.manpowerIds && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.manpowerIds?.message}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Input {...form.register(`items.${index}.jobType`)} /></TableCell>
                    <TableCell><Input {...form.register(`items.${index}.jobNo`)} /></TableCell>
                    <TableCell><Input {...form.register(`items.${index}.projectVesselName`)} /></TableCell>
                    <TableCell>
                      <Controller
                          name={`items.${index}.projectId`}
                          control={form.control}
                          render={({ field: controllerField }) => (
                              <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select Project" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {projects.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          )}
                      />
                    </TableCell>
                    <TableCell><Input {...form.register(`items.${index}.location`)} placeholder="e.g. Tank 401" /></TableCell>
                    <TableCell><Input type="time" {...form.register(`items.${index}.reportingTime`)} /></TableCell>
                    <TableCell><Input {...form.register(`items.${index}.clientContact`)} /></TableCell>
                    <TableCell>
                      <Controller name={`items.${index}.vehicleId`} control={form.control} render={({ field: controllerField }) => (
                          <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                              <SelectTrigger className="w-[120px]"><SelectValue placeholder="N/A" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">N/A</SelectItem>
                                  {vehicleOptions?.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      )} />
                    </TableCell>
                    <TableCell><Textarea {...form.register(`items.${index}.remarks`)} className="min-h-[40px] w-[200px]"/></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => insert(index, generateNewItem())}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Insert Above</p></TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => insert(index + 1, generateNewItem())}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Insert Below</p></TooltipContent>
                          </Tooltip>

                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete Row</p></TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Row?</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to remove this entry from the schedule?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(index)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {fields.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                            No schedule entries for this day. Click "Add Row" or copy from yesterday.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t gap-4">
             <div>
              {fields.length === 0 && (
                <Button type="button" variant="outline" onClick={handleCopyYesterday} disabled={!yesterdayScheduleExists}>
                  <Copy className="mr-2 h-4 w-4"/> Copy Yesterday
                </Button>
              )}
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
               <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => append(generateNewItem())}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Row
              </Button>
              <Button type="submit" className="flex-1 sm:flex-none">
                  <Save className="mr-2 h-4 w-4"/>
                  Save Schedule
              </Button>
             </div>
        </div>
      </form>
    </div>
  );
}