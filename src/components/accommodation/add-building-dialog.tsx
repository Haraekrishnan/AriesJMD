
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '../ui/use-toast';

type AddBuildingDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export default function AddBuildingDialog({ isOpen, setIsOpen }: AddBuildingDialogProps) {
    const [buildingNumber, setBuildingNumber] = useState('');
    const { addBuilding } = useAppContext();
    const { toast } = useToast();

    const handleSubmit = () => {
        if (buildingNumber.trim()) {
            addBuilding(buildingNumber.trim());
            toast({ title: 'Building Added', description: `Building ${buildingNumber} has been created.` });
            setBuildingNumber('');
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Building number cannot be empty.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Building</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new accommodation building.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="buildingNumber" className="text-right">
                            Building No.
                        </Label>
                        <Input
                            id="buildingNumber"
                            value={buildingNumber}
                            onChange={(e) => setBuildingNumber(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., A1, B2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Add Building</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
