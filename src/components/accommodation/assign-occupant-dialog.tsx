
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

type AssignOccupantDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    bedInfo: { buildingId: string; roomId: string; bedId: string };
};

export default function AssignOccupantDialog({ isOpen, setIsOpen, bedInfo }: AssignOccupantDialogProps) {
    const { manpowerProfiles, assignOccupant, buildings } = useAppContext();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");

    const assignedOccupantIds = new Set(
        buildings.flatMap(b => b.rooms.flatMap(r => r.beds.map(bed => bed.occupantId).filter(Boolean)))
    );

    const availableProfiles = manpowerProfiles.filter(p => !assignedOccupantIds.has(p.id));

    const handleSubmit = () => {
        if (!value) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a person to assign.' });
            return;
        }
        assignOccupant(bedInfo.buildingId, bedInfo.roomId, bedInfo.bedId, value);
        toast({ title: 'Bed Assigned', description: 'The occupant has been assigned successfully.' });
        setValue("");
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Bed</DialogTitle>
                    <DialogDescription>
                        Select a person to assign to this bed. Only unassigned people are shown.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                            >
                                {value
                                    ? availableProfiles.find((profile) => profile.id === value)?.name
                                    : "Select person..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search person..." />
                                <CommandEmpty>No person found.</CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className='h-72'>
                                    {availableProfiles.map((profile) => (
                                        <CommandItem
                                            key={profile.id}
                                            value={profile.id}
                                            onSelect={(currentValue) => {
                                                setValue(currentValue === value ? "" : currentValue)
                                                setOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === profile.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {profile.name}
                                        </CommandItem>
                                    ))}
                                    </ScrollArea>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Assign</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

