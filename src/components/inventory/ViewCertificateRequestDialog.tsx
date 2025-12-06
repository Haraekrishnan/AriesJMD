
'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { CertificateRequest, InventoryItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ViewCertificateRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  request: CertificateRequest;
}

export default function ViewCertificateRequestDialog({ isOpen, setIsOpen, request }: ViewCertificateRequestDialogProps) {
  const { user, users, inventoryItems, utMachines, fulfillCertificateRequest, addCertificateRequestComment } = useAppContext();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const requester = users.find(u => u.id === request.requesterId);
  const item = inventoryItems.find(i => i.id === request.itemId);
  const machine = utMachines.find(m => m.id === request.utMachineId);
  
  const subjectName = item ? item.name : machine?.machineName;
  const subjectSN = item ? item.serialNumber : machine?.serialNumber;


  const handleFulfill = () => {
    if (!comment) {
      toast({ variant: 'destructive', title: 'Comment required for fulfilling.' });
      return;
    }
    fulfillCertificateRequest(request.id, comment);
    toast({ title: 'Request Fulfilled' });
    setIsOpen(false);
  };
  
  const handleAddComment = () => {
      if (!comment) return;
      addCertificateRequestComment(request.id, comment);
      setComment('');
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Certificate Request</DialogTitle>
          <DialogDescription>
            {requester?.name} is requesting a {request.requestType} for {subjectName} (SN: {subjectSN}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Comment History</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-4">
                  {(request.comments || []).map((comment, index) => {
                  const commentUser = users.find(u => u.id === comment.userId);
                  return (
                      <div key={index} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="bg-muted p-3 rounded-lg w-full">
                          <div className="flex justify-between items-center"><p className="font-semibold text-sm">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p></div>
                          <p className="text-sm text-foreground/80 mt-1">{comment.text}</p>
                      </div>
                      </div>
                  )
                  })}
              </div>
            </ScrollArea>
          </div>
          <div>
            <Label>Your Comment (e.g., paste link to certificate)</Label>
            <div className="relative">
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment or link..." className="pr-12"/>
                <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleAddComment} disabled={!comment.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter className="justify-between">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <Button onClick={handleFulfill} className="bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-2 h-4 w-4"/> Fulfill Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
