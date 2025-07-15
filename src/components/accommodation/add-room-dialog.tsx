
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';

type AddRoomDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    buildingId: string;
};

export default function AddRoomDialog({ isOpen, setIsOpen, buildingId }: AddRoomDialogProps) {
    const [roomNumber, setRoomNumber] = useState('');
    const { addRoom } = useAppContext();
    const { toast } = useToast();

    const handleSubmit = () => {
        if (roomNumber.trim() && buildingId) {
            addRoom(buildingId, roomNumber.trim());
            toast({ title: 'Room Added', description: `Room ${roomNumber} has been added.` });
            setRoomNumber('');
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Room number cannot be empty.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Room</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new room.
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
                    <Button type="submit" onClick={handleSubmit}>Add Room</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
