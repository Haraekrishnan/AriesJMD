
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { ManpowerProfile } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';

const ppeHistorySchema = z.object({
  manpowerId: z.string().min(1, 'Please select an employee.'),
  ppeType: z.enum(['Coverall', 'Safety Shoes']),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().optional(),
  issueDate: z.date({ required_error: 'Issue date is required' }),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
});

type PpeHistoryFormValues = z.infer<typeof ppeHistorySchema>;

interface IssuePpeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function IssuePpeDialog({ isOpen, setIsOpen }: IssuePpeDialogProps) {
  const { user, addPpeHistoryRecord, manpowerProfiles } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PpeHistoryFormValues>({
    resolver: zodResolver(ppeHistorySchema),
    defaultValues: {
      requestType: 'New',
      quantity: 1,
      issueDate: new Date(),
    },
  });
  
  const manpowerId = form.watch('manpowerId');
  const ppeType = form.watch('ppeType');

  useEffect(() => {
    if (manpowerId && ppeType) {
        const profile = manpowerProfiles.find(p => p.id === manpowerId);
        if (profile) {
          const size = ppeType === 'Coverall' ? profile.coverallSize : profile.shoeSize;
          form.setValue('size', size || '');
        }
    }
  }, [manpowerId, ppeType, manpowerProfiles, form]);

  const onSubmit = (data: PpeHistoryFormValues) => {
    if (!user) return;
    addPpeHistoryRecord(data.manpowerId, {
      ...data,
      issueDate: data.issueDate.toISOString(),
      issuedById: user.id,
    });
    toast({ title: 'PPE Record Added', description: 'The PPE issue history has been updated.' });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };
  
  const manpowerOptions = useMemo(() => {
    return manpowerProfiles.map(p => ({ value: p.id, label: `${p.name} (${p.trade})` }));
  }, [manpowerProfiles]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add PPE Issue Record</DialogTitle>
          <DialogDescription>Manually log a PPE item issued to an employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Employee</Label>
                <Controller
                    name="manpowerId"
                    control={form.control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                {field.value ? manpowerOptions.find(mp => mp.value === field.value)?.label : "Select employee..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                <CommandInput placeholder="Search employee..." />
                                <CommandList>
                                    <CommandEmpty>No employee found.</CommandEmpty>
                                    <CommandGroup>
                                    {manpowerOptions.map(option => (
                                        <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            form.setValue("manpowerId", option.value);
                                        }}
                                        >
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
                 {form.formState.errors.manpowerId && <p className="text-xs text-destructive">{form.formState.errors.manpowerId.message}</p>}
            </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>PPE Type</Label>
                <Controller name="ppeType" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                        <SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent>
                    </Select>
                )}/>
                {form.formState.errors.ppeType && <p className="text-xs text-destructive">{form.formState.errors.ppeType.message}</p>}
            </div>
             <div className="space-y-2">
                <Label>Size</Label>
                <Input {...form.register('size')} placeholder="e.g., 42 or XL" />
                {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
            </div>
          </div>
          {ppeType === 'Coverall' && (
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" {...form.register('quantity')} />
            </div>
          )}
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Controller name="requestType" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Replacement">Replacement</SelectItem></SelectContent>
                        </Select>
                    )}/>
            </div>
            <div className="space-y-2">
                <Label>Issue Date</Label>
                <Controller name="issueDate" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea {...form.register('remarks')} rows={3} placeholder="Reason for replacement, etc."/>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
