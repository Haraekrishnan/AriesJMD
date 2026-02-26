'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JobProgress } from '@/lib/types';
import { JobProgressTable } from './JobProgressTable';

interface LongPendingJmsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  longPendingJobs: JobProgress[];
  onViewJob: (job: JobProgress) => void;
}

export default function LongPendingJmsDialog({ isOpen, setIsOpen, longPendingJobs, onViewJob }: LongPendingJmsDialogProps) {
  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Long Pending JMS</DialogTitle>
            <DialogDescription>
              These jobs have not been updated in over 3 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden mt-4">
             <JobProgressTable jobs={longPendingJobs} onViewJob={onViewJob} />
          </div>
          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
