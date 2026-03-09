
'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JobProgress } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';


interface LongPendingJmsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  longPendingJobs: JobProgress[];
  onViewJob: (job: JobProgress) => void;
}

export default function LongPendingJmsDialog({ isOpen, setIsOpen, longPendingJobs, onViewJob }: LongPendingJmsDialogProps) {
  const { projects, users } = useAppContext();

  const handleViewAndClose = (job: JobProgress) => {
    onViewJob(job);
    setIsOpen(false);
  };

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Long Pending JMS</DialogTitle>
            <DialogDescription>
              These jobs have not been updated in over 3 days. Click on a job to view details.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-1">
             <div className="space-y-2 p-4">
                {longPendingJobs.length > 0 ? longPendingJobs.map(job => {
                  const project = projects.find(p => p.id === job.projectId);
                  const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
                  
                  const returnedStep = job.steps.find(s => s.isReturned);
                  const pendingStep = job.steps.find(s => s.status === 'Pending');
                  const acknowledgedStep = job.steps.find(s => s.status === 'Acknowledged');
                  const currentStep = returnedStep || pendingStep || acknowledgedStep;
              
                  const assignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
                  
                  return (
                    <div key={job.id} onClick={() => handleViewAndClose(job)} className="border p-3 rounded-lg cursor-pointer hover:bg-muted/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold">{job.title}</p>
                                <p className="text-sm text-muted-foreground">{locationText || 'No Location'}</p>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap pl-4">{formatDistanceToNow(parseISO(job.lastUpdated), { addSuffix: true })}</p>
                        </div>
                        {currentStep && (
                            <div className="mt-2 pt-2 border-t text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground">Current Step:</span>
                                    <Badge variant={
                                        returnedStep ? 'destructive' 
                                        : acknowledgedStep ? 'default' 
                                        : 'secondary'
                                    }>
                                        {currentStep.name}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground">With:</span>
                                    <span>{assignee ? assignee.name : 'Unassigned'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                  )
                }) : (
                  <p className="text-center text-muted-foreground py-8">No long pending jobs found.</p>
                )}
             </div>
          </ScrollArea>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
