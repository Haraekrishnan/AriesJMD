
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Feedback, FeedbackStatus, Comment } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Send, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

const statusVariant: Record<FeedbackStatus, 'default' | 'secondary' | 'success'> = {
    'New': 'default',
    'In Progress': 'secondary',
    'Resolved': 'success',
};

const statusOptions: FeedbackStatus[] = ['New', 'In Progress', 'Resolved'];

export default function FeedbackManagement() {
    const { user, feedback, users, updateFeedbackStatus, addFeedbackComment, deleteFeedback } = useAppContext();
    const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');
    const [newComments, setNewComments] = useState<Record<string, string>>({});
    
    const filteredFeedback = useMemo(() => {
        if (!feedback || !Array.isArray(feedback)) return [];
        const sorted = [...feedback].sort((a, b) => {
            if (!a?.date) return 1;
            if (!b?.date) return -1;
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
        if (filter === 'all') {
            return sorted;
        }
        return sorted.filter(f => f.status === filter);
    }, [feedback, filter]);

    const handleStatusChange = (id: string, status: FeedbackStatus) => {
        updateFeedbackStatus(id, status);
    };

    const handleAddComment = (feedbackId: string) => {
        const text = newComments[feedbackId];
        if (!text || !text.trim()) return;
        addFeedbackComment(feedbackId, text);
        setNewComments(prev => ({ ...prev, [feedbackId]: '' }));
    };

    if (!feedback || feedback.length === 0) {
        return <p className="text-muted-foreground">No feedback has been submitted yet.</p>;
    }
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No Date';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd MMM, yyyy') : 'Invalid Date';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <Accordion 
                type="multiple"
                className="w-full space-y-2"
            >
                {filteredFeedback.map(item => {
                    const submitter = users.find(u => u.id === item.userId);
                    const commentsArray = Array.isArray(item.comments) ? item.comments : (item.comments ? Object.values(item.comments) : []);
                    return (
                        <AccordionItem key={item.id} value={item.id} className="border rounded-lg">
                            <AccordionTrigger className="p-4 hover:no-underline text-left">
                                <div className="flex justify-between w-full items-center">
                                    <div className="flex-1 flex items-center gap-2">
                                          {!item.viewedByUser && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                                          <div>
                                              <p className="font-semibold">{item.subject}</p>
                                              <p className="text-sm text-muted-foreground">From: {submitter?.name || 'Unknown User'} on {formatDate(item.date)}</p>
                                          </div>
                                    </div>
                                    <Badge variant={statusVariant[item.status]} className="ml-4">{item.status}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="p-4 bg-muted rounded-md mb-4 whitespace-pre-wrap">{item.message}</div>
                                
                                {commentsArray.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <Label>Conversation</Label>
                                        <ScrollArea className="h-32 rounded-md border p-2">
                                            {commentsArray.map(c => {
                                                const commentUser = users.find(u => u.id === c.userId);
                                                return (
                                                    <div key={c.id} className="flex items-start gap-2 mb-2">
                                                        <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                        <div className="text-xs bg-background p-2 rounded-md w-full border">
                                                            <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(parseISO(c.date), { addSuffix: true })}</p></div>
                                                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </ScrollArea>
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <Label>Admin Tools</Label>
                                    <div className="flex items-center gap-2">
                                        <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value as FeedbackStatus)}>
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" className="h-8">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete this feedback and all associated comments.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteFeedback(item.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    <div className="relative pt-2">
                                        <Textarea
                                            value={newComments[item.id] || ''}
                                            onChange={(e) => setNewComments(prev => ({...prev, [item.id]: e.target.value}))}
                                            placeholder="Reply to the user..."
                                            className="pr-10"
                                            rows={2}
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-[-50%]"
                                            onClick={() => handleAddComment(item.id)}
                                            disabled={!newComments[item.id]?.trim()}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}
