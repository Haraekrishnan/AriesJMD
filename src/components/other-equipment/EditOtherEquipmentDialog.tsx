'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { OtherEquipment } from '@/types';

type EditOtherEquipmentDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: OtherEquipment;
};

export default function EditOtherEquipmentDialog({ isOpen, setIsOpen, item }: EditOtherEquipmentDialogProps) {
    const { editOtherEquipment, users } = useAppContext();
    const { toast } = useToast();

    const [equipmentName, setEquipmentName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [allottedTo, setAllottedTo] = useState('');
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (item) {
            setEquipmentName(item.equipmentName);
            setSerialNumber(item.serialNumber);
            setAllottedTo(item.allottedTo);
            setRemarks(item.remarks || '');
        }
    }, [item]);

    const handleSubmit = () => {
        if (!equipmentName || !serialNumber || !allottedTo) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
            return;
        }
        editOtherEquipment(item.id, {
            equipmentName,
            serialNumber,
            allottedTo,
            remarks
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Equipment</DialogTitle>
                    <DialogDescription>
                        Update the details for {item.equipmentName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="equipmentName" className="text-right">Name</Label>
                        <Input id="equipmentName" value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="serialNumber" className="text-right">Serial No.</Label>
                        <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="allottedTo" className="text-right">Allotted To</Label>
                        <Select value={allottedTo} onValueChange={setAllottedTo}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="remarks" className="text-right">Remarks</Label>
                        <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="col-span-3" />
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