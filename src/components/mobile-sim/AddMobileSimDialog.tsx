
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { DatePickerInput } from '../ui/date-picker-input';
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { MobileSimStatus } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';


const itemSchema = z.object({
  type: z.enum(['Mobile', 'SIM', 'Mobile with SIM']),
  allottedToUserId: z.string().optional(),
  allotmentDate: z.date({ required_error: 'Allotment date is required' }),
  projectId: z.string().min(1, 'Project is required'),
  status: z.enum(['Active', 'Inactive', 'Returned']),
  remarks: z.string().optional(),
  ariesId: z.string().optional(),

  // Mobile fields
  make: z.string().optional(),
  model: z.string().optional(),
  imei: z.string().optional(),
  
  // SIM fields
  simProvider: z.string().optional(),
  simNumber: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'Mobile' || data.type === 'Mobile with SIM') {
        if (!data.make) ctx.addIssue({ path: ['make'], message: 'Make is required.'});
        if (!data.model) ctx.addIssue({ path: ['model'], message: 'Model is required.'});
        if (!data.imei) ctx.addIssue({ path: ['imei'], message: 'IMEI is required.'});
    }
    if (data.type === 'SIM' || data.type === 'Mobile with SIM') {
        if (!data.simProvider) ctx.addIssue({ path: ['simProvider'], message: 'SIM Provider is required.'});
        if (!data.simNumber) ctx.addIssue({ path: ['simNumber'], message: 'SIM Number is required.'});
    }
});

type FormValues = z.infer<typeof itemSchema>;

interface AddMobileSimDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions: MobileSimStatus[] = ['Active', 'Inactive', 'Returned'];

export default function AddMobileSimDialog({ isOpen, setIsOpen }: AddMobileSimDialogProps) {
  const { users, projects, addMobileSim, manpowerProfiles } = useAppContext();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [allotmentType, setAllotmentType] = useState<'user' | 'manpower'>('user');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { status: 'Active', type: 'Mobile' },
  });

  const watchType = form.watch('type');

  const allPersonnelOptions = useMemo(() => {
    if (allotmentType === 'user') {
        return users.map(u => ({ id: u.id, name: u.name }));
    }
    return manpowerProfiles.map(p => ({ id: p.id, name: p.name }));
  }, [users, manpowerProfiles, allotmentType]);

  const onSubmit = (data: FormValues) => {
    addMobileSim({
      ...data,
      allotmentDate: data.allotmentDate.toISOString(),
    });
    toast({
      title: 'Item Added',
      description: `${data.type} has been added.`,
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          form.reset({ status: 'Active', type: 'Mobile' });
          setAllotmentType('user');
      }
      setIsOpen(open);
  }

  const handleAllotmentTypeChange = (type: 'user' | 'manpower') => {
      setAllotmentType(type);
      form.setValue('allottedToUserId', ''); // Reset selection when type changes
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Mobile/SIM</DialogTitle>
          <DialogDescription>Fill in the details for the new item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Type</Label>
                <Controller control={form.control} name="type" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="SIM">SIM</SelectItem>
                      <SelectItem value="Mobile with SIM">Mobile with SIM</SelectItem>
                    </SelectContent>
                  </Select>
                )}/>
            </div>
            
            {(watchType === 'Mobile' || watchType === 'Mobile with SIM') && (
              <fieldset className="border p-4 rounded-md space-y-4">
                <legend className="text-sm font-medium px-1">Mobile Details</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Make</Label><Input {...form.register('make')} />{form.formState.errors.make && <p className="text-xs text-destructive">{form.formState.errors.make.message}</p>}</div>
                  <div><Label>Model</Label><Input {...form.register('model')} />{form.formState.errors.model && <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>}</div>
                </div>
                <div><Label>IMEI</Label><Input {...form.register('imei')} />{form.formState.errors.imei && <p className="text-xs text-destructive">{form.formState.errors.imei.message}</p>}</div>
              </fieldset>
            )}

            {(watchType === 'SIM' || watchType === 'Mobile with SIM') && (
              <fieldset className="border p-4 rounded-md space-y-4">
                <legend className="text-sm font-medium px-1">SIM Details</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Provider</Label><Input {...form.register('simProvider')} />{form.formState.errors.simProvider && <p className="text-xs text-destructive">{form.formState.errors.simProvider.message}</p>}</div>
                  <div><Label>Number</Label><Input {...form.register('simNumber')} />{form.formState.errors.simNumber && <p className="text-xs text-destructive">{form.formState.errors.simNumber.message}</p>}</div>
                </div>
              </fieldset>
            )}

            <div><Label>Aries ID</Label><Input {...form.register('ariesId')} /></div>

            <div className="space-y-2">
                <Label>Allotment Type</Label>
                <RadioGroup value={allotmentType} onValueChange={(value) => handleAllotmentTypeChange(value as 'user' | 'manpower')} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="user" id="user" /><Label htmlFor="user">App User</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="manpower" id="manpower" /><Label htmlFor="manpower">Manpower</Label></div>
                </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Allotted To (Optional)</Label>
              <Controller
                name="allottedToUserId"
                control={form.control}
                render={({ field }) => (
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                              {field.value ? allPersonnelOptions.find(p => p.id === field.value)?.name : "Select person..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Search person..."/>
                              <CommandList>
                              <CommandEmpty>No person found.</CommandEmpty>
                              <CommandGroup>
                                  {allPersonnelOptions.map((p) => (
                                  <CommandItem
                                      key={p.id}
                                      value={p.name}
                                      onSelect={() => {
                                          form.setValue('allottedToUserId', p.id)
                                          setPopoverOpen(false)
                                      }}
                                  >
                                      <Check className={`mr-2 h-4 w-4 ${p.id === field.value ? "opacity-100" : "opacity-0"}`} />
                                      {p.name}
                                  </CommandItem>
                                  ))}
                              </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
                )}
              />
               {form.formState.errors.allottedToUserId && <p className="text-xs text-destructive">{form.formState.errors.allottedToUserId.message}</p>}
            </div>
            
            <div><Label>Allotment Date</Label><Controller control={form.control} name="allotmentDate" render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />{form.formState.errors.allotmentDate && <p className="text-xs text-destructive">{form.formState.errors.allotmentDate.message}</p>}</div>

            <div className="grid grid-cols-2 gap-4">
                <div><Label>Project</Label><Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}</div>
                <div><Label>Status</Label><Controller control={form.control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/></div>
            </div>
            <div><Label>Remarks</Label><Textarea {...form.register('remarks')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
