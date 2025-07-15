
'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { Building } from '@/types';

type EditBuildingDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    building: Building;
};

export default function EditBuildingDialog({ isOpen, setIsOpen, building }: EditBuildingDialogProps) {
    const [buildingNumber, setBuildingNumber] = useState('');
    const { editBuilding } = useAppContext();
    const { toast } = useToast();

    useEffect(() => {
        if (building) {
            setBuildingNumber(building.buildingNumber);
        }
    }, [building]);

    const handleSubmit = () => {
        if (buildingNumber.trim()) {
            editBuilding(building.id, buildingNumber.trim());
            toast({ title: 'Building Updated', description: `Building ${buildingNumber} has been updated.` });
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Building number cannot be empty.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Building</DialogTitle>
                    <DialogDescription>
                        Update the details for the accommodation building.
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
                    <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
