
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
    // Get all employees who are marked as 'Working'
    const workingManpower = manpowerProfiles.filter(p => p.status === 'Working');

    // Create a set of all manpower IDs that are currently in a valid bed
    const occupiedManpowerIds = new Set<string>();
    buildings.forEach(building => {
      (building.rooms || []).forEach(room => {
        (room.beds || []).forEach(bed => {
          if (bed.occupantId) {
            occupiedManpowerIds.add(bed.occupantId);
          }
        });
      });
    });

    // An employee is available if they are working and their ID is NOT in the set of occupied beds.
    // This correctly handles "ghost" assignments where a user has an `accommodation` object but isn't actually in a bed.
    return workingManpower.filter(p => !occupiedManpowerIds.has(p.id));
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
                      {field.value ? (
                          (() => {
                              const profile = availableManpower.find(mp => mp.id === field.value);
                              return profile ? (
                                  <div className="flex items-baseline gap-2">
                                      <span>{profile.name}</span>
                                      <span className="text-muted-foreground text-xs">({profile.trade}{profile.eic ? `, ${profile.eic}` : ''})</span>
                                  </div>
                              ) : "Select person...";
                          })()
                      ) : "Select person..."}
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
                                <div className="flex justify-between items-center w-full">
                                    <span>{mp.name}</span>
                                    <span className="text-muted-foreground text-xs">({mp.trade}{mp.eic ? `, ${mp.eic}` : ''})</span>
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
