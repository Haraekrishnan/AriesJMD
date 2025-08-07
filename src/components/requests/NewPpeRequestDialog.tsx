
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useEffect } from 'react';

const ppeRequestSchema = z.object({
  manpowerId: z.string().min(1, 'Please select a person'),
  ppeType: z.enum(['Coverall', 'Safety Shoes']),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().optional(),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
});

type PpeRequestFormValues = z.infer<typeof ppeRequestSchema>;

interface NewPpeRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewPpeRequestDialog({ isOpen, setIsOpen }: NewPpeRequestDialogProps) {
  const { addPpeRequest, manpowerProfiles } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PpeRequestFormValues>({
    resolver: zodResolver(ppeRequestSchema),
    defaultValues: {
      requestType: 'New',
      quantity: 1,
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

  const onSubmit = (data: PpeRequestFormValues) => {
    addPpeRequest(data);
    toast({
      title: 'PPE Request Submitted',
      description: 'Your request has been submitted to the manager for approval.',
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ requestType: 'New', quantity: 1 });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New PPE Request</DialogTitle>
          <DialogDescription>Request a coverall or safety shoes for an employee.</DialogDescription>
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
                      {field.value ? manpowerProfiles.find(mp => mp.id === field.value)?.name : "Select person..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search manpower..." />
                      <CommandList>
                        <CommandEmpty>No one found.</CommandEmpty>
                        <CommandGroup>
                          {manpowerProfiles.map(mp => (
                            <CommandItem
                              key={mp.id}
                              value={mp.name}
                              onSelect={() => form.setValue("manpowerId", mp.id)}
                            >
                              {mp.name}
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
            <Label>Remarks</Label>
            <Textarea {...form.register('remarks')} rows={3} placeholder="Reason for replacement, etc."/>
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
