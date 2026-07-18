'use client';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Eye } from 'lucide-react';
import type { JobProgress } from '@/lib/types';

interface CompletedJmsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onViewJob: (job: JobProgress) => void;
}

export default function CompletedJmsDialog({ isOpen, setIsOpen, onViewJob }: CompletedJmsDialogProps) {
  const { user, users } = useAuth();
  const { jobProgress, markJmsAsNoted } = usePlanner();
  const { projects } = useGeneral();
  
  const completedJms = useMemo(() => {
    if (!user) return [];
    
    const isPrivileged = ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);

    return jobProgress.filter(job => {
        // Must be completed
        if (job.status !== 'Completed') return false;
        
        // Must not be already noted
        if (job.notedById) return false;

        // Visibility rule:
        // 1. Privileged roles see all completed
        // 2. Creator sees their own completed
        if (isPrivileged) return true;
        return job.creatorId === user.id;
    }).sort((a, b) => parseISO(b.lastUpdated).getTime() - parseISO(a.lastUpdated).getTime());
  }, [user, jobProgress]);

  const handleNoted = (jobId: string) => {
    markJmsAsNoted(jobId);
  };

  const handleView = (job: JobProgress) => {
    onViewJob(job);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl h-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Completed JMS (Awaiting Review)</DialogTitle>
          <DialogDescription>
            These jobs have been finalized with hard copy submission. Review and mark them as noted to clear from this list.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-auto mt-2">
          <div className="space-y-3 p-1">
            {completedJms.length > 0 ? completedJms.map(job => {
              const project = projects.find(p => p.id === job.projectId);
              const creator = users.find(u => u.id === job.creatorId);
              const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
              
              return (
                <div key={job.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm sm:text-base mb-1 uppercase">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate mb-2">{locationText || 'N/A'}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <Badge variant="outline" className="h-4 py-0 text-[9px] font-mono">JMS: {job.jmsNo || 'N/A'}</Badge>
                        <span className="text-muted-foreground font-medium">by {creator?.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-xs px-4 font-bold whitespace-nowrap" 
                      onClick={() => handleView(job)}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        DETAILS
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-9 text-xs px-4 bg-green-600 hover:bg-green-700 font-bold whitespace-nowrap text-white" 
                      onClick={() => handleNoted(job.id)}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        MARK AS NOTED
                    </Button>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                  <CheckCircle className="h-12 w-12 mx-auto opacity-20" />
                  <p>No un-noted completed jobs.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto border-t pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
