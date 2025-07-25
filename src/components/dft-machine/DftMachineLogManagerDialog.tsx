
'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const logSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fromTime: z.string().min(1, 'Start time is required'),
  toTime: z.string().min(1, 'End time is required'),
  location: z.string().min(1, 'Location is required'),
  jobDescription: z.string().min(1, 'Description is required'),
  userName: z.string().min(1, 'User name is required'),
  status: z.enum(['Active', 'Idle'], { required_error: "Status is required." }),
  reason: z.string().optional(),
}).refine(data => {
    if (data.status === 'Idle' && !data.reason) {
        return false;
    }
    return true;
}, {
    message: 'Reason is required when status is Idle.',
    path: ['reason'],
});
type LogFormValues = z.infer<typeof logSchema>;

interface DftMachineLogManagerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  machine: DftMachine;
}

export default function DftMachineLogManagerDialog({ isOpen, setIsOpen, machine }: DftMachineLogManagerDialogProps) {
  const { user, users, addMachineLog, getMachineLogs, deleteMachineLog } = useAppContext();
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
      userName: '',
      status: 'Active',
      reason: '',
    },
  });

  const watchStatus = form.watch('status');

  const onSubmit = (data: LogFormValues) => {
    if (!user) return;
    addMachineLog({ ...data, machineId: machine.id, loggedByUserId: user.id });
    toast({
      title: 'Log Added',
      description: 'The usage log has been successfully recorded.',
    });
    form.reset();
  };

  const handleDelete = (logId: string) => {
    deleteMachineLog(logId);
    toast({ title: 'Log Deleted', variant: 'destructive' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
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
                        <Label htmlFor="userName">User Name</Label>
                        <Input id="userName" {...form.register('userName')} placeholder="Enter name of person who used it" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="location">Location / Project</Label>
                        <Input id="location" {...form.register('location')} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="jobDescription">Job Description</Label>
                        <Input id="jobDescription" {...form.register('jobDescription')} />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Controller control={form.control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Idle">Idle</SelectItem></SelectContent></Select>)}/>
                        {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
                    </div>
                    {watchStatus === 'Idle' && (
                        <div className="space-y-2">
                            <Label>Reason for Idle</Label>
                            <Textarea {...form.register('reason')} />
                            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
                        </div>
                    )}
                    <Button type="submit" className="w-full">Add Log</Button>
                </form>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Past Usage Logs</h3>
                <ScrollArea className="h-96 rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job & Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machineLogs.map(log => {
                                const loggedByUser = users.find(u => u.id === log.loggedByUserId);
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <p className="font-medium">{log.jobDescription}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(log.date), 'dd MMM yyyy')}, {log.fromTime} - {log.toTime}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === 'Active' ? 'success' : 'secondary'}>{log.status}</Badge>
                                            {log.reason && <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{log.userName}</p>
                                            <p className="text-xs text-muted-foreground">Logged by: {loggedByUser?.name}</p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user?.role === 'Admin' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Log Entry?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                             {machineLogs.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center">No logs found.</TableCell></TableRow>
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
