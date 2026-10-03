
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
import { Send, MessageSquare, Clock, User, Edit } from 'lucide-react';
import type { PlannerEvent, Comment } from '@/lib/types';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import { useToast } from '@/hooks/use-toast';

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
  const { dailyPlannerComments, addPlannerEventComment, markSinglePlannerCommentAsRead } = usePlanner();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

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

  const markConversationRead = async () => {
    if (!user) return;
    const updates: Record<string, boolean> = {};
    comments.filter(c => c.userId !== user.id && !c.viewedBy?.[user.id]).forEach(c => {
      updates['dailyPlannerComments/' + dayCommentId + '/comments/' + c.id + '/viewedBy/' + user.id] = true;
    });
    if (dayStr === format(parseISO(event.date), 'yyyy-MM-dd')) updates['plannerEvents/' + event.id + '/viewedBy/' + user.id] = true;
    try { if (Object.keys(updates).length) await update(ref(rtdb), updates); }
    catch { toast({variant:'destructive',title:'Could not mark notification as read. Please try again.'}); }
  };
  const handleSendComment = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      await addPlannerEventComment(plannerUserId, dayStr, event.id, newComment.trim());
      setNewComment('');
      toast({ title: 'Reply saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Reply could not be saved', description: 'Your draft is still here. Please try again.' });
    } finally { setSending(false); }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
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
          <DialogDescription className="text-sm text-foreground mt-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-3">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">Planning description</span>
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
            <Button variant="ghost" size="sm" className="self-end mb-2" onClick={markConversationRead}>Mark conversation as read</Button>
            
            <ScrollArea className="h-[280px] border rounded-lg bg-slate-50/50 p-3">
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
                            <span className="text-[9px] font-black uppercase text-slate-500">{author?.name || 'Former user'}{comment.userId === event.creatorId ? ' · Delegator' : ''}</span>
                            <span className="text-[8px] font-bold text-slate-400">
                              {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
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
              disabled={sending}
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
              aria-label="Send reply"
              disabled={sending || !newComment.trim()}
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
