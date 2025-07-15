
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  numberOfBeds: z.coerce.number().min(1, 'Number of beds must be at least 1').max(10, 'A room cannot have more than 10 beds.'),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface AddRoomDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  buildingId: string;
}

export default function AddRoomDialog({ isOpen, setIsOpen, buildingId }: AddRoomDialogProps) {
  const { addRoom } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { numberOfBeds: 4 }
  });

  const onSubmit = (data: RoomFormValues) => {
    addRoom(buildingId, data);
    toast({ title: 'Room Added', description: `Room ${data.roomNumber} has been added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ numberOfBeds: 4 });
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
          <DialogDescription>Add a new room to the selected building.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roomNumber">Room Number</Label>
            <Input id="roomNumber" {...form.register('roomNumber')} placeholder="e.g., 101" />
            {form.formState.errors.roomNumber && <p className="text-xs text-destructive">{form.formState.errors.roomNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfBeds">Number of Beds</Label>
            <Input id="numberOfBeds" type="number" {...form.register('numberOfBeds')} placeholder="e.g., 4" />
            {form.formState.errors.numberOfBeds && <p className="text-xs text-destructive">{form.formState.errors.numberOfBeds.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Room</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
