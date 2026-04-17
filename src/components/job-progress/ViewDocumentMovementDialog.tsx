
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import type { DocumentMovement, DocumentMovementStatus, Comment, Role } from '@/lib/types';
import { Check, CheckCheck, Send, Undo2, Forward, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusVariant: { [key in DocumentMovementStatus]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'Pending': 'secondary',
  'Acknowledged': 'default',
  'Returned': 'destructive',
  'Completed': 'success',
};

interface ViewDocumentMovementDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  movement: DocumentMovement;
}

export default function ViewDocumentMovementDialog({ isOpen, setIsOpen, movement: initialMovement }: ViewDocumentMovementDialogProps) {
  const { user, users } = useAuth();
  const { documentMovements, acknowledgeDocumentMovement, completeDocumentMovement, addDocumentMovementComment, forwardDocumentMovement, returnDocumentMovement, deleteDocumentMovement } = usePlanner();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardToUserId, setForwardToUserId] = useState('');
  
  const request = useMemo(() => {
    return documentMovements.find(m => m.id === initialMovement.id) || initialMovement;
  }, [documentMovements, initialMovement]);
  
  const creator = useMemo(() => users.find(u => u.id === request.creatorId), [users, request]);
  const assignee = useMemo(() => users.find(u => u.id === request.assigneeId), [users, request]);
  
  const commentsArray = Array.isArray(request.comments) ? request.comments : Object.values(request.comments || {});

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addDocumentMovementComment(request.id, comment);
    setComment('');
  };
  
  const handleAcknowledge = () => {
    if (user?.id !== request.assigneeId) return;
    acknowledgeDocumentMovement(request.id, comment);
    setComment('');
  }
  
  const handleForward = () => {
    if (!forwardToUserId) {
        toast({ title: "Please select a user to forward to.", variant: "destructive" });
        return;
    }
    forwardDocumentMovement(request.id, forwardToUserId, comment);
    setIsForwarding(false);
    setComment('');
    setForwardToUserId('');
  }
  
  const handleReturn = () => {
    if (!comment.trim()) {
        toast({ title: "A reason is required to return.", variant: "destructive" });
        return;
    }
    returnDocumentMovement(request.id, comment);
    setComment('');
  }

  const handleComplete = () => {
    completeDocumentMovement(request.id, comment);
    setComment('');
    setIsOpen(false);
  }

  const assignableUsers = useMemo(() => {
    if (!user) return [];
    const currentParticipantIds = new Set([request.creatorId, request.assigneeId, ...(request.comments || []).map(c => c.userId)]);
    return users.filter(u => !currentParticipantIds.has(u.id));
  }, [user, users, request]);
  
  const canTakeAction = user?.id === request.assigneeId;
  const canDelete = user?.role === 'Admin' || user?.id === request.creatorId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{request.title}</DialogTitle>
              <DialogDescription>
                Created by {creator?.name} &middot; Currently with {assignee?.name}
              </DialogDescription>
            </div>
            <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">History & Comments</h4>
            <ScrollArea className="h-48 rounded-md border p-2">
              <div className="space-y-3">
                {commentsArray.length > 0 ? commentsArray.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()).map((c, i) => {
                    const commentUser = users.find(u => u.id === c.userId);
                    return (
                        <div key={i} className="flex items-start gap-2">
                            <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="text-xs bg-background p-2 rounded-md w-full">
                                <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(parseISO(c.date), { addSuffix: true })}</p></div>
                                <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                            </div>
                        </div>
                    )
                }) : <p className="text-xs text-center py-4 text-muted-foreground">No comments yet.</p>}
              </div>
            </ScrollArea>
          </div>
          
          <div className="relative pt-2">
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."/>
              <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-[-50%]" onClick={handleAddComment} disabled={!comment.trim()}><Send className="h-4 w-4"/></Button>
          </div>

          {isForwarding && (
             <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                <Label>Forward to</Label>
                 <Select value={forwardToUserId} onValueChange={setForwardToUserId}>
                    <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                    <SelectContent>
                        {assignableUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsForwarding(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleForward} disabled={!forwardToUserId}>Confirm Forward</Button>
                 </div>
             </div>
          )}
        </div>
        <DialogFooter className="justify-between">
            <div className="flex gap-2">
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete this document tracker and its history.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                          deleteDocumentMovement(request.id);
                          setIsOpen(false);
                      }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
                {canTakeAction && movement.status === 'Acknowledged' && (
                    <>
                        <Button size="sm" onClick={() => setIsForwarding(true)}><Forward className="mr-2 h-4 w-4"/>Forward</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="outline"><Undo2 className="mr-2 h-4 w-4"/>Return</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Return Document?</AlertDialogTitle><AlertDialogDescription>Please provide a reason for returning the document.</AlertDialogDescription></AlertDialogHeader>
                                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Reason for return..."/>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReturn}>Confirm Return</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" onClick={handleComplete}><CheckCheck className="mr-2 h-4 w-4"/>Complete</Button>
                    </>
                )}
                {canTakeAction && (movement.status === 'Pending' || movement.status === 'Returned') && (
                     <Button onClick={handleAcknowledge}><Check className="mr-2 h-4 w-4"/>Acknowledge</Button>
                )}
                <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
