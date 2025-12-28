
'use client';
import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown } from 'lucide-react';

const assignmentSchema = z.object({
  occupantId: z.string().min(1, 'Please select a person to assign.'),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignOccupantDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  bedInfo: { buildingId: string; roomId: string; bedId: string };
}

export default function AssignOccupantDialog({ isOpen, setIsOpen, bedInfo }: AssignOccupantDialogProps) {
  const { assignOccupant, manpowerProfiles, buildings } = useAppContext();
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const availableManpower = useMemo(() => {
    const occupiedBedIds = new Set<string>();
    buildings.forEach(building => {
      (building.rooms || []).forEach(room => {
        (room.beds || []).forEach(bed => {
          if (bed.occupantId) {
            occupiedBedIds.add(bed.occupantId);
          }
        });
      });
    });

    return manpowerProfiles.filter(p => !occupiedBedIds.has(p.id) && p.status === 'Working');
  }, [manpowerProfiles, buildings]);


  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
  });

  const onSubmit = async (data: AssignmentFormValues) => {
    try {
        await assignOccupant(bedInfo.buildingId, bedInfo.roomId, bedInfo.bedId, data.occupantId);
        const occupantName = manpowerProfiles.find(p => p.id === data.occupantId)?.name;
        toast({ title: 'Bed Assigned', description: `${occupantName} has been assigned to the bed.` });
        setIsOpen(false);
        form.reset();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Bed</DialogTitle>
          <DialogDescription>Select a person from the manpower list to assign to this bed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Person</Label>
            <Controller
              name="occupantId"
              control={form.control}
              render={({ field }) => (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {field.value ? availableManpower.find(mp => mp.id === field.value)?.name : "Select person..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search manpower..." />
                      <CommandList>
                        <CommandEmpty>No one available.</CommandEmpty>
                        <CommandGroup>
                          {availableManpower.map(mp => (
                            <CommandItem
                              key={mp.id}
                              value={mp.name}
                              onSelect={() => {
                                form.setValue("occupantId", mp.id);
                                setIsPopoverOpen(false);
                              }}
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
             {form.formState.errors.occupantId && <p className="text-xs text-destructive">{form.formState.errors.occupantId.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Assign Bed</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
