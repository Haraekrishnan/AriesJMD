'use client';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { DftMachine, MachineLog } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '../ui/table';

const logSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fromTime: z.string().min(1, 'Start time is required'),
  toTime: z.string().min(1, 'End time is required'),
  location: z.string().min(1, 'Location is required'),
  jobDescription: z.string().min(1, 'Description is required'),
});
type LogFormValues = z.infer<typeof logSchema>;

interface DftMachineLogManagerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  machine: DftMachine;
}

export default function DftMachineLogManagerDialog({ isOpen, setIsOpen, machine }: DftMachineLogManagerDialogProps) {
  const { user, users, addMachineLog, getMachineLogs } = useAppContext();
  const { toast } = useToast();
  
  const machineLogs = getMachineLogs(machine.id);

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      fromTime: '09:00',
      toTime: '17:00',
      location: '',
      jobDescription: '',
    },
  });

  const onSubmit = (data: LogFormValues) => {
    if (!user) return;
    addMachineLog({ ...data, machineId: machine.id, userId: user.id });
    toast({
      title: 'Log Added',
      description: 'The usage log has been successfully recorded.',
    });
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Usage Log Manager: {machine.machineName}</DialogTitle>
          <DialogDescription>Add new usage logs and view past entries for this machine.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            <div>
                 <h3 className="font-semibold mb-4">Add New Log Entry</h3>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" {...form.register('date')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fromTime">From</Label>
                            <Input id="fromTime" type="time" {...form.register('fromTime')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="toTime">To</Label>
                            <Input id="toTime" type="time" {...form.register('toTime')} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="location">Location / Project</Label>
                        <Input id="location" {...form.register('location')} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="jobDescription">Job Description</Label>
                        <Input id="jobDescription" {...form.register('jobDescription')} />
                    </div>
                    <Button type="submit" className="w-full">Add Log</Button>
                </form>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Past Usage Logs</h3>
                <ScrollArea className="h-96 rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Job</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machineLogs.map(log => {
                                const logUser = users.find(u => u.id === log.userId);
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{logUser?.name}</TableCell>
                                        <TableCell>{log.jobDescription}</TableCell>
                                    </TableRow>
                                )
                            })}
                             {machineLogs.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="text-center">No logs found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
