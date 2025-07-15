'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type AddUTMachineDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export default function AddUTMachineDialog({ isOpen, setIsOpen }: AddUTMachineDialogProps) {
    const { addUTMachine } = useAppContext();
    const { toast } = useToast();

    const [machineName, setMachineName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [calibrationDueDate, setCalibrationDueDate] = useState('');

    const handleSubmit = () => {
        if (!machineName || !serialNumber || !calibrationDueDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
            return;
        }
        addUTMachine({
            machineName,
            serialNumber,
            calibrationDueDate: new Date(calibrationDueDate).toISOString(),
        });
        setIsOpen(false);
        setMachineName('');
        setSerialNumber('');
        setCalibrationDueDate('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add UT Machine</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new UT machine.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="machineName" className="text-right">
                            Machine Name
                        </Label>
                        <Input
                            id="machineName"
                            value={machineName}
                            onChange={(e) => setMachineName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="serialNumber" className="text-right">
                            Serial No.
                        </Label>
                        <Input
                            id="serialNumber"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="calibrationDueDate" className="text-right">
                            Calibration Due
                        </Label>
                        <Input
                            id="calibrationDueDate"
                            type="date"
                            value={calibrationDueDate}
                            onChange={(e) => setCalibrationDueDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Add Machine</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}