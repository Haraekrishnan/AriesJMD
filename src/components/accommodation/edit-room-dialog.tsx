
'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { Room } from '@/types';

type EditRoomDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    buildingId: string;
    room?: Room;
};

export default function EditRoomDialog({ isOpen, setIsOpen, buildingId, room }: EditRoomDialogProps) {
    const [roomNumber, setRoomNumber] = useState('');
    const { editRoom } = useAppContext();
    const { toast } = useToast();

    useEffect(() => {
        if (room) {
            setRoomNumber(room.roomNumber);
        }
    }, [room]);

    const handleSubmit = () => {
        if (roomNumber.trim() && buildingId && room) {
            editRoom(buildingId, room.id, roomNumber.trim());
            toast({ title: 'Room Updated', description: `Room ${roomNumber} has been updated.` });
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Room number cannot be empty.' });
        }
    };

    if (!room) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Room</DialogTitle>
                    <DialogDescription>
                        Update the details for the room.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="roomNumber" className="text-right">
                            Room No.
                        </Label>
                        <Input
                            id="roomNumber"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 101, 20B"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
