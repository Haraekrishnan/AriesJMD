
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';

type AddBedDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    buildingId: string;
    roomId: string;
};

export default function AddBedDialog({ isOpen, setIsOpen, buildingId, roomId }: AddBedDialogProps) {
    const [bedNumber, setBedNumber] = useState('');
    const [bedType, setBedType] = useState<'Bunk' | 'Single'>('Bunk');
    const { addBed } = useAppContext();
    const { toast } = useToast();

    const handleSubmit = () => {
        if (bedNumber.trim() && buildingId && roomId) {
            addBed(buildingId, roomId, bedNumber.trim(), bedType);
            toast({ title: 'Bed Added', description: `Bed ${bedNumber} has been added.` });
            setBedNumber('');
            setBedType('Bunk');
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Bed number cannot be empty.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Bed</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new bed in the room.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bedNumber" className="text-right">
                            Bed No.
                        </Label>
                        <Input
                            id="bedNumber"
                            value={bedNumber}
                            onChange={(e) => setBedNumber(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., A, B"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">
                            Bed Type
                        </Label>
                        <RadioGroup 
                            defaultValue="Bunk"
                            className="col-span-3 flex gap-4"
                            onValueChange={(value: 'Bunk' | 'Single') => setBedType(value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Bunk" id="bunk" />
                                <Label htmlFor="bunk">Bunk</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Single" id="single" />
                                <Label htmlFor="single">Single</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Add Bed</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
