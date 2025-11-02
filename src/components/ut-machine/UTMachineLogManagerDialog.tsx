
'use client';
import { useState, useRef, MouseEvent } from 'react';
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
import { PlusCircle, Trash2, Paperclip, Upload, X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '../ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const logSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fromTime: z.string().min(1, 'Start time is required'),
  toTime: z.string().min(1, 'End time is required'),
  location: z.string().min(1, 'Location is required'),
  jobDescription: z.string().min(1, 'Description is required'),
  userName: z.string().min(1, 'User name is required'),
  status: z.enum(['Active', 'Idle'], { required_error: "Status is required." }),
  reason: z.string().optional(),
  attachmentUrl: z.string().optional(),
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
  const [isUploading, setIsUploading] = useState(false);
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

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
      attachmentUrl: '',
    },
  });

  const watchStatus = form.watch('status');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: 'Uploading...', description: 'Please wait while the file is uploaded.' });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "my_unsigned_upload"); 

    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dmgyflpz8/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        setIsUploading(false);

        if (data.secure_url) {
            form.setValue('attachmentUrl', data.secure_url);
            toast({ title: 'Upload Successful', description: 'File has been attached.' });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload file.' });
        }
    } catch (error) {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Upload Error', description: 'An error occurred during upload.' });
    }
  };

  const onSubmit = async (data: LogFormValues) => {
    if (!user) return;
    addMachineLog(data, machine.id);
    toast({
      title: 'Log Added',
      description: 'The usage log has been successfully recorded.',
    });
    form.reset({
      ...form.getValues(),
      date: format(new Date(), 'yyyy-MM-dd'),
      jobDescription: '',
      reason: '',
      attachmentUrl: ''
    });
  };
  
  const handleDelete = (logId: string) => {
    deleteMachineLog(logId);
    toast({ title: 'Log Deleted', variant: 'destructive' });
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsPanning(true);
      setStartPosition({
          x: e.clientX - translate.x,
          y: e.clientY - translate.y,
      });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      if (!isPanning || !imageContainerRef.current) return;
      e.preventDefault();
      const x = e.clientX - startPosition.x;
      const y = e.clientY - startPosition.y;
      setTranslate({ x, y });
  };
  
  const handleMouseUpOrLeave = () => {
      setIsPanning(false);
  };

  const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

  return (
    <>
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
                       {form.watch('attachmentUrl') ? (
                         <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                            <button type="button" onClick={() => setViewingAttachmentUrl(form.watch('attachmentUrl')!)} className="flex items-center gap-2 truncate hover:underline">
                              <Paperclip className="h-4 w-4"/>
                              <span className="truncate">Uploaded File</span>
                            </button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', '')}>
                              <X className="h-4 w-4"/>
                            </Button>
                         </div>
                      ) : (
                        <div className="relative">
                          <Button asChild variant="outline" size="sm">
                            <Label htmlFor="ut-log-file-upload"><Upload className="mr-2 h-4 w-4"/> {isUploading ? 'Uploading...' : 'Upload File'}</Label>
                          </Button>
                          <Input id="ut-log-file-upload" type="file" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isUploading}>
                        Add Log
                    </Button>
                </form>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Past Usage Logs</h3>
                <ScrollArea className="h-96 rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job &amp; Date</TableHead>
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
                                            {log.attachmentUrl && <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setViewingAttachmentUrl(log.attachmentUrl!)}><Paperclip className="h-3 w-3 mr-1"/>View Attachment</Button>}
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
    <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Attachment Viewer</DialogTitle>
                <div className="flex items-center gap-2">
                    {!isPdf && (
                        <>
                          <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                        </>
                    )}
                    {isPdf && numPages && (
                        <div className="flex items-center gap-2 text-sm">
                            <Button variant="outline" size="icon" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span>Page {pageNumber} of {numPages}</span>
                            <Button variant="outline" size="icon" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    )}
                    <a href={viewingAttachmentUrl || ''} download target="_blank" rel="noopener noreferrer">
                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                    </a>
                </div>
            </DialogHeader>
            <div 
              ref={imageContainerRef}
              className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/50 rounded-md"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
                {viewingAttachmentUrl && (
                    isPdf ? (
                        <Document
                            file={viewingAttachmentUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex justify-center"
                        >
                            <Page pageNumber={pageNumber} />
                        </Document>
                    ) : (
                         <img 
                            src={viewingAttachmentUrl} 
                            alt="Attachment" 
                            className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                            style={{
                                transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`,
                                maxWidth: zoom > 1 ? 'none' : '100%',
                                maxHeight: zoom > 1 ? 'none' : '100%',
                                objectFit: 'contain'
                            }}
                        />
                    )
                )}
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}

    