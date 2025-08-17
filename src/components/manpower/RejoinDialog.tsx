

'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import type { ManpowerProfile } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface RejoinDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function RejoinDialog({ isOpen, setIsOpen }: RejoinDialogProps) {
  const { manpowerProfiles, rejoinFromLeave } = useAppContext();
  const { toast } = useToast();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [rejoinDate, setRejoinDate] = useState<Date | undefined>(new Date());
  
  const onLeaveProfiles = useMemo(() => {
    return manpowerProfiles.filter(p => p.status === 'On Leave' && p.leaveHistory && p.leaveHistory.some(l => !l.rejoinedDate));
  }, [manpowerProfiles]);

  const selectedProfile = useMemo(() => {
    return onLeaveProfiles.find(p => p.id === selectedProfileId);
  }, [selectedProfileId, onLeaveProfiles]);

  const activeLeaveRecord = useMemo(() => {
    if (!selectedProfile) return null;
    return (selectedProfile.leaveHistory || []).find(l => !l.rejoinedDate);
  }, [selectedProfile]);

  const handleRejoin = () => {
    if (!selectedProfile || !activeLeaveRecord || !rejoinDate) {
      toast({ title: 'Error', description: 'Please select an employee and a rejoin date.', variant: 'destructive' });
      return;
    }
    rejoinFromLeave(selectedProfile.id, activeLeaveRecord.id, rejoinDate);
    toast({ title: 'Status Updated', description: `${selectedProfile.name} has been marked as rejoined.` });
    setIsOpen(false);
    setSelectedProfileId(null);
    setRejoinDate(new Date());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedProfileId(null);
      setRejoinDate(new Date());
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md h-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Rejoin Status</DialogTitle>
          <DialogDescription>Select an employee who has returned from leave to update their status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-auto">
            <div className="space-y-2">
                <Label>Employee on Leave</Label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedProfile ? selectedProfile.name : "Select employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employees on leave.</CommandEmpty>
                        <CommandGroup>
                          {onLeaveProfiles.map(p => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => {
                                setSelectedProfileId(p.id);
                              }}
                            >
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
            </div>
            {selectedProfile && (
                <div className="space-y-2">
                    <Label>Rejoining Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !rejoinDate && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {rejoinDate ? format(rejoinDate, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={rejoinDate} onSelect={setRejoinDate} initialFocus /></PopoverContent>
                    </Popover>
                </div>
            )}
        </div>
        <DialogFooter className="mt-auto">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleRejoin} disabled={!selectedProfile || !rejoinDate}>Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
