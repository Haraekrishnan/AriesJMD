
'use client';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, PlusCircle, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';

const scheduleItemSchema = z.object({
  id: z.string(),
  client: z.string().min(1, "Required"),
  jobDescription: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  manpowerIds: z.array(z.string()),
  equipment: z.string().optional(),
  remarks: z.string().optional(),
});

const scheduleSchema = z.object({
  items: z.array(scheduleItemSchema),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface JobScheduleRowProps {
  schedule?: JobSchedule;
  projectId: string;
  selectedDate: string;
  isEditable: boolean;
}

export default function JobScheduleRow({ schedule, projectId, selectedDate, isEditable }: JobScheduleRowProps) {
  const { user, manpowerProfiles, saveJobSchedule } = useAppContext();
  
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      items: schedule?.items ?? [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const manpowerOptions = manpowerProfiles
    .filter(p => p.eic === projectId && p.status === 'Working')
    .map(p => ({ value: p.id, label: `${p.name} (${p.trade})` }));

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

  if (!isEditable && (!schedule || schedule.items.length === 0)) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
          No schedule has been set for this project on this date.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {fields.map((field, index) => (
        <TableRow key={field.id}>
          <TableCell className="font-medium text-center">{index + 1}</TableCell>
          <TableCell><Textarea {...form.register(`items.${index}.client`)} disabled={!isEditable} className="min-h-[20px]"/></TableCell>
          <TableCell><Textarea {...form.register(`items.${index}.jobDescription`)} disabled={!isEditable} className="min-h-[20px]"/></TableCell>
          <TableCell><Textarea {...form.register(`items.${index}.location`)} disabled={!isEditable} className="min-h-[20px]"/></TableCell>
          <TableCell>
            <Controller
              name={`items.${index}.manpowerIds`}
              control={form.control}
              render={({ field: controllerField }) => (
                <Popover>
                  <PopoverTrigger asChild disabled={!isEditable}>
                    <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                      <div className="flex flex-wrap gap-1">
                        {controllerField.value.length > 0
                          ? controllerField.value.map(id => (
                              <Badge key={id} variant="secondary">{manpowerProfiles.find(p => p.id === id)?.name}</Badge>
                            ))
                          : "Select manpower..."}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search manpower..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {manpowerOptions.map(option => (
                            <CommandItem
                              key={option.value}
                              onSelect={() => {
                                const selected = new Set(controllerField.value);
                                if (selected.has(option.value)) {
                                  selected.delete(option.value);
                                } else {
                                  selected.add(option.value);
                                }
                                controllerField.onChange(Array.from(selected));
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", controllerField.value.includes(option.value) ? "opacity-100" : "opacity-0")} />
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </TableCell>
          <TableCell><Textarea {...form.register(`items.${index}.equipment`)} disabled={!isEditable} className="min-h-[20px]"/></TableCell>
          <TableCell><Textarea {...form.register(`items.${index}.remarks`)} disabled={!isEditable} className="min-h-[20px]"/></TableCell>
          {isEditable && (
            <TableCell>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          )}
        </TableRow>
      ))}
      {isEditable && (
         <TableRow>
            <TableCell colSpan={8} className="p-2">
                 <Button type="button" variant="secondary" className="w-full" onClick={() => append({ id: `item-${Date.now()}`, client: '', jobDescription: '', location: '', manpowerIds: [], equipment: '', remarks: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                </Button>
            </TableCell>
         </TableRow>
      )}
      <TableRow>
          <TableCell colSpan={8} className="text-right p-2">
            <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={!isEditable && !schedule}>
                <Save className="mr-2 h-4 w-4"/>
                Save Schedule
            </Button>
          </TableCell>
      </TableRow>
    </>
  );
}
