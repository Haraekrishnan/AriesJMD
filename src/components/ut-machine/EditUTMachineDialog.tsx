'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { UTMachine } from '@/types';
import { format } from 'date-fns';

type EditUTMachineDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    machine: UTMachine;
};

export default function EditUTMachineDialog({ isOpen, setIsOpen, machine }: EditUTMachineDialogProps) {
    const { editUTMachine } = useAppContext();
    const { toast } = useToast();

    const [machineName, setMachineName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [calibrationDueDate, setCalibrationDueDate] = useState('');

    useEffect(() => {
        if (machine) {
            setMachineName(machine.machineName);
            setSerialNumber(machine.serialNumber);
            setCalibrationDueDate(format(new Date(machine.calibrationDueDate), 'yyyy-MM-dd'));
        }
    }, [machine]);

    const handleSubmit = () => {
        if (!machineName || !serialNumber || !calibrationDueDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
            return;
        }
        editUTMachine(machine.id, {
            machineName,
            serialNumber,
            calibrationDueDate: new Date(calibrationDueDate).toISOString(),
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit UT Machine</DialogTitle>
                    <DialogDescription>
                        Update the details for {machine.machineName}.
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
                    <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}