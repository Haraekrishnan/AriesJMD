'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ChevronsUpDown } from 'lucide-react';
import { useMemo } from 'react';

const requestSchema = z.object({
  manpowerId: z.string().min(1, 'Please select an employee.'),
  remarks: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface LogbookRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function LogbookRequestDialog({ isOpen, setIsOpen }: LogbookRequestDialogProps) {
  const { manpowerProfiles, addLogbookRequest } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });

  const onSubmit = (data: RequestFormValues) => {
    addLogbookRequest(data.manpowerId, data.remarks);
    toast({ title: 'Logbook Request Submitted' });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };

  const availableProfiles = useMemo(() => {
    return manpowerProfiles.filter(p => p.status === 'Working');
  }, [manpowerProfiles]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Logbook</DialogTitle>
          <DialogDescription>Submit a request for an employee's logbook.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Controller
              name="manpowerId"
              control={form.control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {field.value ? (
                          (() => {
                              const profile = availableProfiles.find(p => p.id === field.value);
                              return profile ? (
                                  <div className="flex items-baseline gap-2">
                                      <span>{profile.name}</span>
                                      <span className="text-muted-foreground text-xs">({profile.trade})</span>
                                  </div>
                              ) : "Select employee...";
                          })()
                      ) : "Select employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {availableProfiles.map(p => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => form.setValue("manpowerId", p.id)}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground text-xs">({p.trade})</span>
                                </div>
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
          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea {...form.register('remarks')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
