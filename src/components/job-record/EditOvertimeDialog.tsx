
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ManpowerProfile } from '@/lib/types';
import { format } from 'date-fns';

interface EditOvertimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ManpowerProfile;
  day: number;
  currentOvertime: number;
  onSave: (profileId: string, day: number, hours: number | null) => void;
}

export default function EditOvertimeDialog({ isOpen, onClose, profile, day, currentOvertime, onSave }: EditOvertimeDialogProps) {
  const [overtime, setOvertime] = useState(currentOvertime.toString());

  useEffect(() => {
    setOvertime(currentOvertime.toString());
  }, [currentOvertime, isOpen]);

  const handleSave = () => {
    const hours = parseFloat(overtime);
    onSave(profile.id, day, isNaN(hours) || hours <= 0 ? null : hours);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Overtime</DialogTitle>
          <DialogDescription>
            Editing overtime for {profile.name} on day {day}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="overtime-hours">Overtime Hours</Label>
          <Input
            id="overtime-hours"
            type="number"
            value={overtime}
            onChange={(e) => setOvertime(e.target.value)}
            placeholder="0"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
