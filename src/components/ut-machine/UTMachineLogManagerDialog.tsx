
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
import { UTMachine, MachineLog } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { PlusCircle, Trash2, File, Paperclip, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '../ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import Link from 'next/link';


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

interface UTMachineLogManagerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  machine: UTMachine;
}

export default function UTMachineLogManagerDialog({ isOpen, setIsOpen, machine }: UTMachineLogManagerDialogProps) {
  const { user, users, addMachineLog, getMachineLogs, deleteMachineLog } = useAppContext();
  const { toast } = useToast();
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachment(e.target.files[0]);
    }
  };

  const onSubmit = async (data: LogFormValues) => {
    if (!user) return;

    if (attachment) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
            const dataUrl = e.target?.result as string;
            const base64Data = dataUrl.split(',')[1];
            
            const formData = new FormData();
            formData.append('file', base64Data);
            formData.append('filename', attachment.name);
            formData.append('mimeType', attachment.type);
            
            const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyi2x471qBbhbhvbQ1E93KpOfb6NxR_XYRZ54FrG6OSeILfjhtnk2HhzZI2uf5sugcc0A/exec";
        
            const res = await fetch(WEB_APP_URL, {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();
            
            if (result.status === 'success') {
                toast({ title: 'File Uploaded', description: 'Your file has been saved to Google Drive.' });
                saveLog(data, { name: result.name, url: result.url });
            } else {
                throw new Error(result.message || 'Unknown error from upload script.');
            }

        } catch (error: any) {
            console.error('Upload Error:', error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not send file to Google Drive.' });
        } finally {
            setIsUploading(false);
        }
      };
      reader.onerror = (error) => {
          console.error('File reading error:', error);
          toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
          setIsUploading(false);
      }
      reader.readAsDataURL(attachment);
    } else {
      saveLog(data);
    }
  };
  
  const saveLog = (data: LogFormValues, attachmentNote?: { name: string, url: string }) => {
    if (!user) return;
    const logData: Omit<MachineLog, 'id'> = {
      ...data,
      machineId: machine.id,
      loggedByUserId: user.id,
      ...(attachmentNote && { attachment: attachmentNote })
    };
    
    addMachineLog(logData);
    toast({
      title: 'Log Added',
      description: 'The usage log has been successfully recorded.',
    });
    form.reset();
    setAttachment(null);
  }

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
                    <div className="space-y-2">
                      <Label>Attachment (Optional)</Label>
                      {attachment ? (
                        <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <span>{attachment.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                           <Button asChild variant="outline" className="w-full">
                              <Label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                                <File className="h-4 w-4" /> Choose File
                              </Label>
                            </Button>
                           <Input id="file-upload" type="file" onChange={handleFileChange} className="hidden" />
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isUploading}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Add Log'}
                    </Button>
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
                                            {log.attachment && (
                                              <Link href={log.attachment.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                                <Paperclip className="h-3 w-3" />
                                                {log.attachment.name}
                                              </Link>
                                            )}
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
