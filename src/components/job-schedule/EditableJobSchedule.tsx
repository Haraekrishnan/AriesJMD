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
import { Check, PlusCircle, Save, Trash2, Copy, Users, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMemo, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

const scheduleItemSchema = z.object({
  id: z.string(),
  manpowerIds: z.array(z.string()).min(1, "Select at least one person"),
  jobType: z.string().optional().or(z.literal('')),
  jobNo: z.string().optional().or(z.literal('')),
  projectVesselName: z.string().optional().or(z.literal('')),
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
  const { user, users, manpowerProfiles, vehicles, jobSchedules, saveJobSchedule, projects, can } = useAppContext();
  const { toast } = useToast();
  
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
    return new Set(watchedItems.flatMap(item => item.manpowerIds));
  }, [watchedItems]);
  
  const vehicleOptions = useMemo(() => vehicles || [], [vehicles]);

  const onSubmit = (data: ScheduleFormValues) => {
    const scheduleId = `schedule_${selectedDate}`;
    saveJobSchedule({
      id: schedule?.id || scheduleId,
      date: selectedDate,
      projectId: 'all', // Centralized schedule
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <ScrollArea className="w-full">
        <div className="min-w-[1200px]">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">Sr.No</TableHead>
                    <TableHead className="min-w-[250px]">Name</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Job No.</TableHead>
                    <TableHead>Project/Vessel's Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reporting Time</TableHead>
                    <TableHead>Client/Contact</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
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
                                  {controllerField.value?.length > 0
                                    ? controllerField.value.map(id => (
                                        <Badge key={id} variant="secondary">{manpowerOptions.find(p => p.value === id)?.label || id}</Badge>
                                      ))
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
                                                      const selected = new Set(controllerField.value);
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
                  <TableCell><Input {...form.register(`items.${index}.location`)} /></TableCell>
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
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => insert(index + 1, { 
                                id: `item-${Date.now()}-${Math.random()}`, 
                                manpowerIds: [], 
                                jobType: '', 
                                jobNo: '', 
                                projectVesselName: '', 
                                location: '', 
                                reportingTime: '09:00', 
                                clientContact: '', 
                                vehicleId: 'none', 
                                remarks: '' 
                              })}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Insert row below</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete row</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
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
             <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => append({ id: `item-${Date.now()}`, manpowerIds: [], jobType: '', jobNo: '', projectVesselName: '', location: '', reportingTime: '09:00', clientContact: '', vehicleId: 'none', remarks: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Row
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
                <Save className="mr-2 h-4 w-4"/>
                Save Schedule
            </Button>
           </div>
      </div>
    </form>
  );
}
