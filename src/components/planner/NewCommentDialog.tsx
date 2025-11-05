
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { parseISO } from 'date-fns';
import type { PlannerEvent } from '@/lib/types';

interface NewCommentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  event: PlannerEvent;
}

export default function NewCommentDialog({ isOpen, setIsOpen, event }: NewCommentDialogProps) {
  const { user, users, markPlannerCommentsAsRead } = useAppContext();

  const newComments = useMemo(() => {
    if (!user || !event.comments) return [];
    const commentsArray = Array.isArray(event.comments) ? event.comments : Object.values(event.comments);
    return commentsArray.filter(c => !c.isRead && c.userId !== user.id);
  }, [event, user]);

  const handleClose = () => {
    if (user) {
        markPlannerCommentsAsRead(user.id, event.eventDate);
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Comments on Your Delegated Task</DialogTitle>
          <DialogDescription>
            You have new comments on the event: "{event.title}".
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64">
            <div className="space-y-4 p-1">
                {newComments.map(comment => {
                    const commentUser = users.find(u => u.id === comment.userId);
                    return (
                        <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                        <div className="bg-muted p-3 rounded-lg w-full">
                            <div className="flex justify-between items-center"><p className="font-semibold text-sm">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</p></div>
                            <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                        </div>
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
