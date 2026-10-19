'use client';
import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, parseISO, isValid } from 'date-fns';
import { Send, FileText, CheckCircle2, Edit, CalendarDays, Repeat2, User, Folder } from 'lucide-react';
import type { PlannerEvent } from '@/lib/types';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import { useToast } from '@/hooks/use-toast';
import styles from './task-history.module.css';

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
  const { dailyPlannerComments, addPlannerEventComment } = usePlanner();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const [markingRead, setMarkingRead] = useState(false);

  const dayStr = format(date, 'yyyy-MM-dd');
  const dayCommentId = `${dayStr}_${plannerUserId}`;
  
  const comments = useMemo(() => {
    const dayData = dailyPlannerComments.find((c) => c.id === dayCommentId);
    if (!dayData?.comments) return [];
    
    return Object.values(dayData.comments)
      .filter((c) => c.eventId === event.id)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [dailyPlannerComments, dayCommentId, event.id]);

  const unreadCount = comments.filter(c=>user && c.userId!==user.id && !c.viewedBy?.[user.id]).length;
  const creator = users.find((u) => u.id === event.creatorId);
  const isOwner = user?.id === event.creatorId || user?.role === 'Admin';

  const markConversationRead = async () => {
    if (!user || markingRead) return;
    setMarkingRead(true);
    const updates: Record<string, boolean> = {};
    comments.filter(c => c.userId !== user.id && !c.viewedBy?.[user.id]).forEach(c => {
      updates['dailyPlannerComments/' + dayCommentId + '/comments/' + c.id + '/viewedBy/' + user.id] = true;
    });
    if (dayStr === format(parseISO(event.date), 'yyyy-MM-dd')) updates['plannerEvents/' + event.id + '/viewedBy/' + user.id] = true;
    try { if (Object.keys(updates).length) await update(ref(rtdb), updates); }
    catch { toast({variant:'destructive',title:'Could not mark notification as read. Please try again.'}); }
    finally { setMarkingRead(false); }
  };
  const handleSendComment = async () => {
    if (!user || !newComment.trim() || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    try {
      await addPlannerEventComment(plannerUserId, dayStr, event.id, newComment.trim());
      setNewComment('');
      toast({ title: 'Reply saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Reply could not be saved', description: 'Your draft is still here. Please try again.' });
    } finally { sendLock.current = false; setSending(false); }
  };


  const assignee = users.find(u=>u.id===plannerUserId);
  const repeatLabel = event.frequency.split('-').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
  const timestamp = (value:string, pattern:string) => {const parsed=parseISO(value);return isValid(parsed)?format(parsed,pattern):'Unknown';};
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent className={styles.dialog} overlayClassName={styles.overlay}>
      <header className={styles.header}><FileText size={25}/><DialogTitle className={styles.title}>Task history &amp; updates</DialogTitle><DialogDescription className="sr-only">Task details, dated remarks, read status and replies for {event.title}.</DialogDescription></header>
      <div className={styles.body}>
        <section className={styles.context} aria-label="Task details">
          <h2>{event.title}</h2>
          <dl className={styles.metadata}>
            <div><dt>Task date</dt><dd><CalendarDays size={18}/>{format(date,'dd MMM yyyy')}</dd></div>
            <div><dt>Repeat</dt><dd><Repeat2 size={18}/>{repeatLabel}</dd></div>
            <div><dt>Created by</dt><dd><User size={18}/>{creator?.name||'Former user'}</dd></div>
            <div><dt>Assigned to</dt><dd><User size={18}/>{assignee?.name||'Former user'}</dd></div>
            <div><dt>Category</dt><dd><Folder size={18}/><span className={styles.category}>{event.category||'General'}</span></dd></div>
          </dl>
          <h3>Planning description</h3><p className={styles.description}>{event.description||'No description provided for this event.'}</p>
        </section>
        <section className={styles.register} aria-label="Update register">
          <div className={styles.registerHeader}><h2>Update register <span>{comments.length} {comments.length===1?'entry':'entries'}</span></h2><div><span className={styles.unreadCount} data-unread={unreadCount>0}>{unreadCount>0?unreadCount+' unread update'+(unreadCount===1?'':'s'):'Conversation read'}</span><button className={styles.outline} disabled={!unreadCount||markingRead} onClick={markConversationRead}>{markingRead?'Marking…':'Mark as read'}</button></div></div>
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Task update history"><table><thead><tr><th scope="col">#</th><th scope="col">Date &amp; time</th><th scope="col">Updated by</th><th scope="col">Role</th><th scope="col">Remark / Update</th><th scope="col">Read status</th></tr></thead><tbody>{comments.map((comment,index)=>{
            const author=users.find(u=>u.id===comment.userId);
            const isUnread=!!user&&comment.userId!==user.id&&!comment.viewedBy?.[user.id];
            const own=comment.userId===user?.id;
            return <tr key={comment.id} data-unread={isUnread}><td>{index+1}</td><td className={styles.date}><time dateTime={comment.date}>{timestamp(comment.date,'dd MMM yyyy')}<small>{timestamp(comment.date,'hh:mm a')}</small></time></td><td><div className={styles.author}><span className={styles.avatar}>{(author?.name||'Former user').split(' ').map(n=>n[0]).slice(0,2).join('')}</span><span>{author?.name||'Former user'}</span></div></td><td><span className={styles.role}>{author?.role||'—'}</span></td><td className={styles.remark}>{comment.text}</td><td><span className={styles.readState} data-unread={isUnread}>{isUnread?<i/>:<CheckCircle2 size={16}/>}<span>{isUnread?'New':own?'Your update':'Read'}</span></span></td></tr>;
          })}{!comments.length&&<tr><td colSpan={6} className={styles.empty}>No updates yet. Add the first remark below.</td></tr>}</tbody></table></div>
          <div className={styles.tableFooter}><span>Showing all {comments.length} updates · Oldest first</span><span>Read status is for your account</span></div>
        </section>
      </div>
      <section className={styles.composer} aria-label="Add a task update"><div className={styles.composerTitle}><label htmlFor="task-history-reply">Add remark / update</label><span>Posting as {user?.name||'your account'}</span></div><textarea id="task-history-reply" placeholder="Write your remark, reply or progress update…" rows={3} value={newComment} disabled={sending} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.nativeEvent.isComposing){e.preventDefault();void handleSendComment();}}}/><footer className={styles.footer}><div>{isOwner&&<button className={styles.outline} onClick={()=>{onEdit(event);setIsOpen(false);}}><Edit size={17}/>Edit Master</button>}</div><div><button className={styles.secondary} onClick={()=>setIsOpen(false)}>Close</button><button className={styles.primary} disabled={!user||sending||!newComment.trim()} onClick={handleSendComment}><Send size={17}/>{sending?'Posting…':'Post update'}</button></div></footer></section>
    </DialogContent>
  </Dialog>;
}
