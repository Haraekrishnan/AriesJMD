
'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobStep, JobStepStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Clock, Circle, XCircle, MoreHorizontal, Send, Paperclip, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/storage';

interface ViewJobProgressDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
}

const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};

export default function ViewJobProgressDialog({ isOpen, setIsOpen, job: initialJob }: ViewJobProgressDialogProps) {
    const { user, users, jobProgress, updateJobStepStatus, addJobStepComment } = useAppContext();
    const { toast } = useToast();
    const [newComments, setNewComments] = useState<Record<string, string>>({});
    const [attachments, setAttachments] = useState<Record<string, File | null>>({});
    const [isUploading, setIsUploading] = useState(false);
    
    // Use the live job from context to get real-time updates
    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);

    const creator = users.find(u => u.id === job.creatorId);

    const handleAcknowledge = (stepId: string) => {
        updateJobStepStatus(job.id, stepId, 'Acknowledged');
    };

    const handleComplete = async (step: JobStep) => {
        const file = attachments[step.id];
        let attachmentUrl: string | undefined = undefined;

        if (step.requiresAttachment && !file) {
            toast({ variant: 'destructive', title: 'Attachment Required', description: 'Please upload a file to complete this step.' });
            return;
        }

        if (file) {
            setIsUploading(true);
            try {
                attachmentUrl = await uploadFile(file, `job-progress/${job.id}/${step.id}/${file.name}`);
                toast({ title: 'Attachment uploaded' });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Upload Failed', description: (error as Error).message });
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }
        
        updateJobStepStatus(job.id, step.id, 'Completed', newComments[step.id], { attachmentUrl });
        setNewComments(prev => ({...prev, [step.id]: ''}));
        setAttachments(prev => ({...prev, [step.id]: null}));
    };
    
    const handleFileChange = (stepId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => ({ ...prev, [stepId]: e.target.files![0] }));
        }
    };
    
    const handleAddComment = (stepId: string) => {
        const text = newComments[stepId];
        if (!text?.trim()) return;
        addJobStepComment(job.id, stepId, text);
        setNewComments(prev => ({...prev, [stepId]: ''}));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{job.title}</DialogTitle>
                    <DialogDescription>Created by {creator?.name} on {format(parseISO(job.createdAt), 'PPP')}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="relative pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-border -translate-x-1/2"></div>
                        
                        <div className="space-y-8">
                            {job.steps.map((step, index) => {
                                const assignee = users.find(u => u.id === step.assigneeId);
                                const isCurrentUserAssignee = user?.id === step.assigneeId;
                                const isPreviousStepCompleted = index === 0 || job.steps[index - 1].status === 'Completed';
                                const canAct = isCurrentUserAssignee && isPreviousStepCompleted;
                                const StatusIcon = statusConfig[step.status].icon;
                                
                                return (
                                    <div key={step.id} className="relative flex items-start">
                                        <div className={cn("absolute left-10 top-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2", statusConfig[step.status].color.replace('text-', 'bg-').replace('-500', '-100 dark:bg-opacity-30'))}>
                                            <StatusIcon className={cn("h-3 w-3", statusConfig[step.status].color)} />
                                        </div>
                                        <div className="ml-10 w-full pl-6 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{step.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                        <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar}/><AvatarFallback>{assignee?.name?.[0]}</AvatarFallback></Avatar>
                                                        <span>{assignee?.name}</span>
                                                        {step.dueDate && <span>&middot; Due {format(parseISO(step.dueDate), 'dd MMM')}</span>}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="capitalize">{statusConfig[step.status].label}</Badge>
                                            </div>
                                            
                                            {step.description && <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{step.description}</p>}
                                            
                                            {canAct && step.status === 'Pending' && <Button size="sm" onClick={() => handleAcknowledge(step.id)}>Acknowledge</Button>}
                                            {canAct && step.status === 'Acknowledged' && (
                                                <div className="p-3 border rounded-md bg-background space-y-3">
                                                    {step.requiresAttachment && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Attachment</Label>
                                                            {attachments[step.id] ? (
                                                              <div className="flex items-center justify-between p-1 rounded-md border text-sm">
                                                                <div className="flex items-center gap-2 truncate"><Paperclip className="h-4 w-4"/> <span className="truncate">{attachments[step.id]?.name}</span></div>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachments(p => ({...p, [step.id]: null}))}><X className="h-4 w-4"/></Button>
                                                              </div>
                                                            ) : (
                                                              <Button asChild variant="outline" size="sm"><Label htmlFor={`attach-${step.id}`}><Upload className="mr-2 h-3 w-3"/> Upload File</Label></Button>
                                                            )}
                                                            <Input id={`attach-${step.id}`} type="file" onChange={(e) => handleFileChange(step.id, e)} className="hidden"/>
                                                        </div>
                                                    )}
                                                    <div className="relative">
                                                      <Textarea value={newComments[step.id] || ''} onChange={e => setNewComments(p => ({...p, [step.id]: e.target.value}))} placeholder="Add completion notes..." rows={2} className="pr-10" />
                                                      <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" disabled={!newComments[step.id]} onClick={() => handleAddComment(step.id)}><Send className="h-4 w-4"/></Button>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleComplete(step)} disabled={isUploading}>Mark as Completed</Button>
                                                </div>
                                            )}

                                            {step.status === 'Completed' && step.completionDetails && (
                                                <div className="text-xs space-y-2 p-2 border rounded-md bg-green-50 dark:bg-green-900/30">
                                                    <p>Completed by {users.find(u => u.id === step.completedBy)?.name} on {format(parseISO(step.completionDetails.date!), 'PPP p')}</p>
                                                    {step.completionDetails.notes && <p className="italic">"{step.completionDetails.notes}"</p>}
                                                    {step.completionDetails.attachmentUrl && <Button asChild size="sm" variant="link" className="p-0 h-auto"><a href={step.completionDetails.attachmentUrl} target="_blank" rel="noopener noreferrer"><Paperclip className="h-3 w-3 mr-1"/>View Attachment</a></Button>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
