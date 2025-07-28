
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';

const memoSchema = z.object({
  manpowerId: z.string().min(1, 'Please select an employee.'),
  type: z.enum(['Memo', 'Warning Letter']),
  date: z.date({ required_error: 'Please select a date.' }),
  reason: z.string().min(10, 'A detailed reason is required.'),
  issuedBy: z.string().min(1, 'Issuer name is required.'),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface IssueMemoDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function IssueMemoDialog({ isOpen, setIsOpen }: IssueMemoDialogProps) {
  const { manpowerProfiles, addMemoOrWarning } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
    defaultValues: { type: 'Memo', date: new Date() },
  });

  const onSubmit = (data: MemoFormValues) => {
    addMemoOrWarning(data.manpowerId, {
      type: data.type,
      date: data.date.toISOString(),
      reason: data.reason,
      issuedBy: data.issuedBy,
    });
    const profile = manpowerProfiles.find(p => p.id === data.manpowerId);
    toast({ title: `${data.type} Issued`, description: `A ${data.type.toLowerCase()} has been issued to ${profile?.name}.` });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ type: 'Memo', date: new Date() });
    }
    setIsOpen(open);
  };

  const manpowerOptions = useMemo(() => {
    return manpowerProfiles.map(p => ({ value: p.id, label: `${p.name} (${p.trade})` }));
  }, [manpowerProfiles]);

  const selectedManpowerId = form.watch('manpowerId');

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Memo / Warning Letter</DialogTitle>
          <DialogDescription>Select an employee and provide details for the record.</DialogDescription>
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
                      {selectedManpowerId ? manpowerOptions.find(o => o.value === selectedManpowerId)?.label : "Select employee..."}
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
              <Label>Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Memo">Memo</SelectItem>
                      <SelectItem value="Warning Letter">Warning Letter</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Issued</Label>
              <Controller
                name="date"
                control={form.control}
                render={({ field }) => (
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                )}
              />
               {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="issuedBy">Issued By</Label>
            <Input id="issuedBy" {...form.register('issuedBy')} />
            {form.formState.errors.issuedBy && <p className="text-xs text-destructive">{form.formState.errors.issuedBy.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason / Details</Label>
            <Textarea {...form.register('reason')} rows={5} />
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Issue Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
