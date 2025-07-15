'use client';
import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { DftMachine } from '@/types';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

type DftMachineLogManagerDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    machine: DftMachine;
};

export default function DftMachineLogManagerDialog({ isOpen, setIsOpen, machine }: DftMachineLogManagerDialogProps) {
    const { addDftMachineLog, users } = useAppContext();
    const { toast } = useToast();

    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [fromTime, setFromTime] = useState('');
    const [toTime, setToTime] = useState('');
    const [location, setLocation] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    const handleSubmit = () => {
        if (!date || !fromTime || !toTime || !location || !jobDescription) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all log details.' });
            return;
        }
        addDftMachineLog(machine.id, { date, fromTime, toTime, location, jobDescription });
        // Reset form
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setFromTime('');
        setToTime('');
        setLocation('');
        setJobDescription('');
    };

    const sortedLogs = useMemo(() => {
        return machine.logs?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
    }, [machine.logs]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Usage Log for {machine.machineName}</DialogTitle>
                    <DialogDescription>
                        Add and view usage history for SN: {machine.serialNumber}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Add New Log</h3>
                        <div className="space-y-4">
                            <div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="fromTime">From</Label><Input id="fromTime" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></div>
                                <div><Label htmlFor="toTime">To</Label><Input id="toTime" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></div>
                            </div>
                            <div><Label htmlFor="location">Location / Job No.</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
                            <div><Label htmlFor="jobDescription">Job Description</Label><Input id="jobDescription" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} /></div>
                             <Button onClick={handleSubmit}>Add Log</Button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Log History</h3>
                        <ScrollArea className="h-96 pr-4">
                            {sortedLogs.length > 0 ? (
                                <div className="space-y-4">
                                    {sortedLogs.map(log => {
                                        const user = users.find(u => u.id === log.userId);
                                        return(
                                        <div key={log.id} className="p-3 border rounded-md text-sm bg-muted/50">
                                            <p className="font-semibold">{log.jobDescription}</p>
                                            <p className="text-muted-foreground">Date: {format(new Date(log.date), 'dd MMM, yyyy')}, {log.fromTime} - {log.toTime}</p>
                                            <p className="text-muted-foreground">Location: {log.location}</p>
                                            {user && <p className="text-xs text-muted-foreground mt-1">Logged by: {user.name}</p>}
                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center pt-10">No usage logs recorded.</p>
                            )}
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}