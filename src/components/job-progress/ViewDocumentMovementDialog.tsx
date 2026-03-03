
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { DocumentMovement, DocumentMovementStatus, Comment } from '@/lib/types';
import { Check, CheckCheck, Send } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';

const statusVariant: { [key in DocumentMovementStatus]: 'secondary' | 'default' | 'success' } = {
  'Pending': 'secondary',
  'Acknowledged': 'default',
  'Completed': 'success',
};

interface ViewDocumentMovementDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  movement: DocumentMovement;
}

export default function ViewDocumentMovementDialog({ isOpen, setIsOpen, movement }: ViewDocumentMovementDialogProps) {
  const { user, users, acknowledgeDocumentMovement, completeDocumentMovement, addDocumentMovementComment } = useAppContext();
  const [comment, setComment] = useState('');
  
  const creator = useMemo(() => users.find(u => u.id === movement.creatorId), [users, movement]);
  const assignee = useMemo(() => users.find(u => u.id === movement.assigneeId), [users, movement]);
  
  const commentsArray = Array.isArray(movement.comments) ? movement.comments : Object.values(movement.comments || {});
  
  const handleAcknowledge = () => {
    acknowledgeDocumentMovement(movement.id, comment);
    setComment('');
  };
  
  const handleComplete = () => {
    completeDocumentMovement(movement.id, comment);
    setComment('');
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addDocumentMovementComment(movement.id, comment);
    setComment('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{movement.title}</DialogTitle>
              <DialogDescription>
                Sent from {creator?.name} to {assignee?.name}
              </DialogDescription>
            </div>
            <Badge variant={statusVariant[movement.status]}>{movement.status}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">History & Comments</h4>
            <ScrollArea className="h-48 rounded-md border p-2">
              <div className="space-y-3">
                {commentsArray.map((c, i) => {
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
                })}
                {commentsArray.length === 0 && <p className="text-xs text-center py-4 text-muted-foreground">No comments yet.</p>}
              </div>
            </ScrollArea>
          </div>
          <div className="relative">
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."/>
              <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleAddComment} disabled={!comment.trim()}><Send className="h-4 w-4"/></Button>
          </div>
        </div>
        <DialogFooter className="justify-between">
            <div className="flex gap-2">
              {user?.id === movement.assigneeId && movement.status === 'Pending' && (
                <Button onClick={handleAcknowledge}><Check className="mr-2 h-4 w-4"/>Acknowledge</Button>
              )}
              {(user?.id === movement.assigneeId && movement.status === 'Acknowledged') || (user?.id === movement.creatorId && movement.status === 'Acknowledged') && (
                <Button onClick={handleComplete}><CheckCheck className="mr-2 h-4 w-4"/>Complete</Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
