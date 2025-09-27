
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
import { Check, PlusCircle, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMemo, useEffect } from 'react';

const scheduleItemSchema = z.object({
  id: z.string(),
  manpowerIds: z.array(z.string()).min(1, "Select at least one person"),
  jobType: z.string().optional(),
  jobNo: z.string().optional(),
  projectVesselName: z.string().optional(),
  location: z.string().optional(),
  reportingTime: z.string().optional(),
  clientContact: z.string().optional(),
  vehicleId: z.string().optional(),
  remarks: z.string().optional(),
});

const scheduleSchema = z.object({
  items: z.array(scheduleItemSchema),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface EditableJobScheduleProps {
  schedule?: JobSchedule;
  projectId: string;
  selectedDate: string;
  globallyAssignedIds: Set<string>;
}

export default function EditableJobSchedule({ schedule, projectId, selectedDate, globallyAssignedIds }: EditableJobScheduleProps) {
  const { user, manpowerProfiles, vehicles, saveJobSchedule } = useAppContext();
  
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      items: schedule?.items ?? [],
    },
  });

  useEffect(() => {
    form.reset({ items: schedule?.items ?? [] });
  }, [schedule, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const manpowerOptions = useMemo(() => 
    manpowerProfiles
        .filter(p => p.status === 'Working')
        .map(p => ({ value: p.id, label: `${p.name} (${p.trade})` })),
    [manpowerProfiles]
  );

  const currentlyAssignedManpowerIdsInThisForm = useMemo(() => {
    return new Set(form.getValues().items.flatMap(item => item.manpowerIds));
  }, [form.watch('items')]);
  
  const vehicleOptions = useMemo(() => vehicles, [vehicles]);

  const onSubmit = (data: ScheduleFormValues) => {
    saveJobSchedule({
      id: schedule?.id || `${projectId}_${selectedDate}`,
      date: selectedDate,
      projectId: projectId,
      supervisorId: user!.id,
      createdAt: schedule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: data.items,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]">Sr.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Job No.</TableHead>
                <TableHead>Project/Vessel's Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Reporting Time</TableHead>
                <TableHead>Client/Contact</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-[50px]"></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell className="font-medium text-center">{index + 1}</TableCell>
              <TableCell>
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
                                  <Badge key={id} variant="secondary">{manpowerProfiles.find(p => p.id === id)?.name}</Badge>
                                ))
                              : <span className="text-muted-foreground">Select...</span>}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search manpower..." />
                          <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                              {manpowerOptions.map(option => {
                                const isSelectedInCurrentItem = controllerField.value?.includes(option.value);
                                const isAssignedGlobally = globallyAssignedIds.has(option.value);
                                const isDisabled = isAssignedGlobally && !isSelectedInCurrentItem;

                                return (
                                <CommandItem key={option.value} onSelect={() => {
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
                                className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", isSelectedInCurrentItem ? "opacity-100" : "opacity-0")} />
                                  {option.label}
                                </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
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
                        <SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">N/A</SelectItem>
                            {vehicleOptions.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 )} />
              </TableCell>
              <TableCell><Textarea {...form.register(`items.${index}.remarks`)} className="min-h-[20px]"/></TableCell>
              <TableCell>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {fields.length === 0 && (
              <TableRow>
                  <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                      No schedule entries for this day. Click "Add Row" to begin.
                  </TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end p-4 border-t gap-2">
           <Button type="button" variant="outline" onClick={() => append({ id: `item-${Date.now()}`, manpowerIds: [], jobType: '', jobNo: '', projectVesselName: '', location: '', reportingTime: '', clientContact: '', vehicleId: 'none', remarks: '' })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
          <Button type="submit">
              <Save className="mr-2 h-4 w-4"/>
              Save Schedule
          </Button>
      </div>
    </form>
  );
}
