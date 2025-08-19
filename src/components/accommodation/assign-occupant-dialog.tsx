
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

  const assignedManpowerIds = useMemo(() => {
    const ids = new Set<string>();
    buildings.forEach(b => {
        const roomsArray = b.rooms ? (Array.isArray(b.rooms) ? b.rooms : Object.values(b.rooms)) : [];
        roomsArray.forEach(r => {
            if (!r) return;
            const bedsArray = r.beds ? (Array.isArray(r.beds) ? r.beds : Object.values(r.beds)) : [];
            bedsArray.forEach(bed => {
                if (bed && bed.occupantId) ids.add(bed.occupantId);
            });
        });
    });
    return ids;
  }, [buildings]);

  const availableManpower = useMemo(() => {
    return manpowerProfiles.filter(p => p.status === 'Working' && !assignedManpowerIds.has(p.id));
  }, [manpowerProfiles, assignedManpowerIds]);


  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
  });

  const onSubmit = (data: AssignmentFormValues) => {
    assignOccupant(bedInfo.buildingId, bedInfo.roomId, bedInfo.bedId, data.occupantId);
    const occupantName = manpowerProfiles.find(p => p.id === data.occupantId)?.name;
    toast({ title: 'Bed Assigned', description: `${occupantName} has been assigned to the bed.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
