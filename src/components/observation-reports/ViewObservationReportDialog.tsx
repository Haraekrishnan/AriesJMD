

'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';
import type { ObservationReport, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow, isValid } from 'date-fns';

const Section = ({ title, content }: { title: string, content?: string }) => {
    if (!content) return null;
    return (
        <div className="space-y-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm p-3 border rounded-md bg-muted min-h-[4rem] whitespace-pre-wrap">{content}</p>
        </div>
    );
};

interface ViewObservationReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  report: ObservationReport;
}

export default function ViewObservationReportDialog({ isOpen, setIsOpen, report }: ViewObservationReportDialogProps) {
  const { users, user, projects, updateObservationReport, addObservationComment } = useAppContext();
  const [correctiveActions, setCorrectiveActions] = useState(report.correctiveActions || '');
  const [reopenReason, setReopenReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();

  const reporter = users.find(u => u.id === report.reporterId);
  const project = projects.find(p => p.id === report.projectId);

  const canManage = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
  const isReporter = user?.id === report.reporterId;
  
  const commentsArray = Array.isArray(report.comments) ? report.comments : (report.comments ? Object.values(report.comments) : []);

  const handleClose = () => {
    if (!canManage || !correctiveActions.trim()) {
        setIsOpen(false);
        return;
    }
    updateObservationReport(report.id, { correctiveActions, status: 'Closed', closedAt: new Date().toISOString() });
    addObservationComment(report.id, `${user?.name} closed the report with the following actions:\n${correctiveActions}`);
    toast({ title: 'Report Closed', description: 'Corrective actions have been saved.' });
    setIsOpen(false);
  };
  
  const handleReopen = () => {
    if (!reopenReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for reopening.", variant: 'destructive'});
      return;
    }
    updateObservationReport(report.id, { status: 'Open', closedAt: undefined });
    addObservationComment(report.id, `Report reopened by ${user?.name}. Reason: ${reopenReason}`);
    toast({ title: "Report Reopened" });
  };
  
  const handleAddComment = () => {
      if(!newComment.trim()) return;
      addObservationComment(report.id, newComment);
      setNewComment('');
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Observation Report</DialogTitle>
          <div className="flex justify-between items-start pt-2">
            <DialogDescription>
              Report by {reporter?.name} on {format(parseISO(report.visitDate), 'PPP')} at {report.visitTime}
            </DialogDescription>
            <Badge variant={report.status === 'Open' ? 'destructive' : 'success'}>{report.status}</Badge>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-6">
          <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-md">
                <div><span className="font-semibold">Project:</span> {project?.name}</div>
                <div><span className="font-semibold">Location:</span> {report.location}</div>
                <div><span className="font-semibold">Supervisor:</span> {report.supervisorName}</div>
                <div><span className="font-semibold">Site In-charge:</span> {report.siteInChargeName}</div>
                <div className="col-span-2"><span className="font-semibold">Job:</span> {report.jobDescription}</div>
              </div>
              <Section title="Good Practices Observed" content={report.goodPractices} />
              <Section title="Unsafe Acts Observed" content={report.unsafeActs} />
              <Section title="Unsafe Conditions Observed" content={report.unsafeConditions} />
              
              <div className="space-y-2">
                  <Label htmlFor="correctiveActions">Corrective/Preventive Actions Taken</Label>
                  <Textarea 
                      id="correctiveActions"
                      value={correctiveActions}
                      onChange={(e) => setCorrectiveActions(e.target.value)}
                      rows={4}
                      disabled={report.status === 'Closed' && !canManage}
                  />
              </div>
               <div className="space-y-2">
                  <Label>Comments</Label>
                  <div className="space-y-2">
                    {commentsArray.length > 0 ? commentsArray.map((c, i) => {
                      const commentUser = users.find(u => u.id === c.userId);
                      return (
                        <div key={i} className="flex items-start gap-2">
                            <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="text-xs bg-muted/50 p-2 rounded-md w-full">
                                <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{c.date && isValid(parseISO(c.date)) ? formatDistanceToNow(parseISO(c.date), { addSuffix: true }) : ''}</p></div>
                                <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                            </div>
                        </div>
                      )
                    }) : <p className="text-xs text-muted-foreground text-center">No comments yet.</p>}
                  </div>
              </div>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t justify-between">
            <div>
              {canManage && report.status === 'Closed' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive">Reopen Report</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Reopen Report</AlertDialogTitle><AlertDialogDescription>Please provide a reason for reopening this report.</AlertDialogDescription></AlertDialogHeader>
                        <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Reason for reopening..." />
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReopen}>Reopen</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            {(isReporter || canManage) && report.status === 'Open' && <Button type="button" onClick={handleClose}>Save & Close Report</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    

    
