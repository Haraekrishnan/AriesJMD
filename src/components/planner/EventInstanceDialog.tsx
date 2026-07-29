
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Send, MessageSquare, Clock, User, Trash2, Edit } from 'lucide-react';
import type { PlannerEvent, Comment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface EventInstanceDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  event: PlannerEvent;
  date: Date;
  plannerUserId: string;
  onEdit: (event: PlannerEvent) => void;
}

export default function EventInstanceDialog({
  isOpen,
  setIsOpen,
  event,
  date,
  plannerUserId,
  onEdit,
}: EventInstanceDialogProps) {
  const { user, users } = useAuth();
  const { dailyPlannerComments, addPlannerEventComment, deletePlannerEvent } = usePlanner();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  const dayStr = format(date, 'yyyy-MM-dd');
  const dayCommentId = `${dayStr}_${plannerUserId}`;
  
  const comments = useMemo(() => {
    const dayData = dailyPlannerComments.find((c) => c.id === dayCommentId);
    if (!dayData?.comments) return [];
    
    return Object.values(dayData.comments)
      .filter((c) => c.eventId === event.id)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [dailyPlannerComments, dayCommentId, event.id]);

  const creator = users.find((u) => u.id === event.creatorId);
  const isOwner = user?.id === event.creatorId || user?.role === 'Admin';

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    addPlannerEventComment(plannerUserId, dayStr, event.id, newComment);
    setNewComment('');
    toast({ title: "Comment Sent" });
  };

  const handleDelete = () => {
    deletePlannerEvent(event.id);
    setIsOpen(false);
    toast({ variant: 'destructive', title: 'Event Deleted' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30">
                  {event.frequency}
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {format(date, 'PPPP')}
                </span>
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                {event.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs font-medium text-slate-500 mt-2">
            {event.description || "No description provided for this event."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col py-4 gap-4">
          {/* INFO SECTION */}
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex items-center gap-2">
               <Avatar className="h-8 w-8 border">
                <AvatarImage src={creator?.avatar} />
                <AvatarFallback>{creator?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="text-[10px]">
                <p className="font-black text-slate-500 uppercase leading-none">Created By</p>
                <p className="font-bold text-black">{creator?.name}</p>
              </div>
            </div>
          </div>

          {/* CHAT SECTION */}
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="h-3 w-3" /> Event Conversation
            </h4>
            
            <ScrollArea className="flex-1 border rounded-lg bg-slate-50/50 p-3">
              <div className="space-y-3">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const author = users.find((u) => u.id === comment.userId);
                    return (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 border shrink-0">
                          <AvatarImage src={author?.avatar} />
                          <AvatarFallback className="text-[8px]">{author?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-white dark:bg-slate-800 p-2 rounded shadow-sm border border-slate-200">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-500">{author?.name}</span>
                            <span className="text-[8px] font-bold text-slate-400">
                              {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-black dark:text-white leading-tight">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No replies yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* INPUT SECTION */}
          <div className="relative mt-2">
            <Textarea
              placeholder="Add a reply or update..."
              className="min-h-[60px] pr-12 text-xs font-bold border-2 focus-visible:ring-primary/20"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 bg-primary hover:bg-primary/90 shadow-sm"
              disabled={!newComment.trim()}
              onClick={handleSendComment}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex sm:justify-between items-center w-full">
          <div className="flex gap-2">
            {isOwner && (
              <>
                <Button variant="outline" size="sm" className="h-8 px-3 font-bold text-xs" onClick={() => { onEdit(event); setIsOpen(false); }}>
                  <Edit className="mr-2 h-3.5 w-3.5" /> Edit Master
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-3 font-bold text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the event and all its recurring instances from the planner.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                        Delete Event
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" className="h-8 px-4 font-bold text-xs" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
