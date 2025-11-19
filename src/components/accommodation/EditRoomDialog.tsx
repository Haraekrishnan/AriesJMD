
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { Room } from '@/lib/types';
import { useEffect } from 'react';

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface EditRoomDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  buildingId: string;
  room: Room;
}

export default function EditRoomDialog({ isOpen, setIsOpen, buildingId, room }: EditRoomDialogProps) {
  const { updateRoom } = useAppContext();
  const { toast } = useToast();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomNumber: room.roomNumber,
    },
  });

  useEffect(() => {
    form.reset({ roomNumber: room.roomNumber });
  }, [room, form]);

  const onSubmit = (data: RoomFormValues) => {
    updateRoom(buildingId, { ...room, roomNumber: data.roomNumber });
    toast({ title: 'Room Updated', description: 'The room number has been updated.' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>Update the number/name for this room.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roomNumber">Room Number/Name</Label>
            <Input id="roomNumber" {...form.register('roomNumber')} />
            {form.formState.errors.roomNumber && <p className="text-xs text-destructive">{form.formState.errors.roomNumber.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
