
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import type { ManpowerProfile, LeaveRecord } from '@/lib/types';

interface ExtendLeaveDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: ManpowerProfile;
  leave: LeaveRecord;
}

export default function ExtendLeaveDialog({ isOpen, setIsOpen, profile, leave }: ExtendLeaveDialogProps) {
  const { extendLeave } = useAppContext();
  const { toast } = useToast();
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(
    leave.plannedEndDate ? new Date(leave.plannedEndDate) : new Date()
  );

  useEffect(() => {
    setNewEndDate(leave.plannedEndDate ? new Date(leave.plannedEndDate) : new Date());
  }, [leave, isOpen]);

  const handleExtend = () => {
    if (!newEndDate) {
      toast({ title: "Error", description: "Please select a new end date.", variant: "destructive" });
      return;
    }
    extendLeave(profile.id, leave.id, newEndDate);
    toast({ title: "Leave Extended", description: `${profile.name}'s leave has been extended.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend Leave for {profile.name}</DialogTitle>
          <DialogDescription>
            Select a new planned end date for this leave period.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label>New Planned End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !newEndDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newEndDate ? format(newEndDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newEndDate} onSelect={setNewEndDate} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleExtend}>Extend Leave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
