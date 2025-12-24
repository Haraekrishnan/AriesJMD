
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { DamageReport, DamageReportStatus } from '@/lib/types';
import { ThumbsUp, ThumbsDown, Paperclip, Send } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


const statusVariant: { [key in DamageReportStatus]: 'secondary' | 'destructive' | 'success' | 'outline' } = {
  'Pending': 'secondary',
  'Under Review': 'secondary',
  'Approved': 'success',
  'Rejected': 'destructive',
};

interface ViewDamageReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  report: DamageReport;
}

export default function ViewDamageReportDialog({ isOpen, setIsOpen, report }: ViewDamageReportDialogProps) {
  const { user, users, inventoryItems, utMachines, dftMachines, updateDamageReportStatus } = useAppContext();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const allItems = useMemo(() => [ ...inventoryItems, ...utMachines, ...dftMachines ], [inventoryItems, utMachines, dftMachines]);
  const item = useMemo(() => allItems.find(i => i.id === report.itemId), [report, allItems]);
  const reporter = useMemo(() => users.find(u => u.id === report.reporterId), [report, users]);
  
  const canApprove = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Project Coordinator'].includes(user.role);
  }, [user]);

  const handleAction = (status: 'Approved' | 'Rejected') => {
    if (status === 'Rejected' && !comment.trim()) {
        toast({ title: 'Comment Required', description: 'Please provide a reason for rejection.', variant: 'destructive'});
        return;
    }
    updateDamageReportStatus(report.id, status, comment);
    toast({ title: `Report ${status}`, description: `The damage report has been ${status.toLowerCase()}.`});
    setIsOpen(false);
  };

  const handleAddComment = () => {
    // This is a placeholder for a more complete comment system if needed later.
    // For now, comments are only for approval/rejection.
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Damage Report Details</DialogTitle>
          <div className="flex justify-between items-start pt-2">
            <DialogDescription>
              Reported by {reporter?.name} on {format(parseISO(report.reportDate), 'dd MMM, yyyy')}
            </DialogDescription>
             <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="text-sm space-y-2 p-3 border rounded-md">
                <p><strong>Item:</strong> {item?.name || report.otherItemName}</p>
                <p><strong>Serial/Aries ID:</strong> {item?.serialNumber || 'N/A'} / {item?.ariesId || 'N/A'}</p>
            </div>
             <div className="space-y-1">
                <Label>Reason for Damage</Label>
                <p className="text-sm p-3 border rounded-md bg-muted min-h-[6rem]">{report.reason}</p>
             </div>
             {report.attachmentUrl && (
                <div className="space-y-1">
                    <Label>Attachment</Label>
                    <a href={report.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full justify-start" disabled={!report.attachmentUrl}><Paperclip className="mr-2 h-4 w-4"/>View Attached Document</Button>
                    </a>
                </div>
             )}
              {(canApprove && report.status === 'Pending') && (
                <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="action-comment">Comment (Required for Rejection)</Label>
                    <Textarea id="action-comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."/>
                </div>
              )}
        </div>
        <DialogFooter className="justify-between">
            <div>
              {(canApprove && report.status === 'Pending') && (
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive"><ThumbsDown className="mr-2 h-4 w-4"/>Reject</Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Rejection?</AlertDialogTitle><AlertDialogDescription>This will reject the damage report. Ensure you have added a comment.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAction('Rejected')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button><ThumbsUp className="mr-2 h-4 w-4"/>Approve</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Approval?</AlertDialogTitle><AlertDialogDescription>Approving will mark the item as 'Damaged' in the inventory.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAction('Approved')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
