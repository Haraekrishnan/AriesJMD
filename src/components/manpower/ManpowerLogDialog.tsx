'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ManpowerLogDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export default function ManpowerLogDialog({ isOpen, setIsOpen }: ManpowerLogDialogProps) {
    const { projects, addManpowerLog, user } = useAppContext();
    const { toast } = useToast();

    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [projectId, setProjectId] = useState(user?.projectId || '');
    const [countIn, setCountIn] = useState('');
    const [countOut, setCountOut] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!date || !projectId || !countIn || !countOut) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
            return;
        }
        addManpowerLog({
            date,
            projectId,
            countIn: Number(countIn),
            countOut: Number(countOut),
            reason,
        });
        setIsOpen(false);
        toast({ title: 'Manpower Logged' });
        // Reset form
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setProjectId(user?.projectId || '');
        setCountIn('');
        setCountOut('');
        setReason('');
    };
    
    const canChangeProject = user?.role === 'Admin' || user?.role === 'Manager';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Daily Manpower</DialogTitle>
                    <DialogDescription>
                        Enter the manpower details for a project on a specific date.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project" className="text-right">Project</Label>
                        <Select value={projectId} onValueChange={setProjectId} disabled={!canChangeProject}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="countIn" className="text-right">Count In</Label>
                        <Input id="countIn" type="number" value={countIn} onChange={(e) => setCountIn(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="countOut" className="text-right">Count Out</Label>
                        <Input id="countOut" type="number" value={countOut} onChange={(e) => setCountOut(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">Reason</Label>
                        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="col-span-3" placeholder="e.g. sick leave, etc." />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Save Log</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
