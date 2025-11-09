
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Send } from 'lucide-react';

export default function LogbookRequests() {
  const { user, can, logbookRequests, manpowerProfiles, users, updateLogbookRequestStatus, addLogbookRequestComment } = useAppContext();
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const pendingRequests = useMemo(() => {
    if (!can.manage_logbook) return [];
    return logbookRequests.filter(r => r.status === 'Pending');
  }, [logbookRequests, can.manage_logbook]);

  const handleAction = (requestId: string, status: 'Completed' | 'Rejected') => {
    if (status === 'Rejected' && !comment) {
      toast({ title: 'Comment required for rejection.', variant: 'destructive' });
      return;
    }
    updateLogbookRequestStatus(requestId, status, comment);
    toast({ title: `Request ${status}` });
    setRejectionRequestId(null);
    setComment('');
  };
  
  const handleAddComment = (requestId: string) => {
    const text = newComments[requestId];
    if (!text || !text.trim()) return;
    addLogbookRequestComment(requestId, text);
    setNewComments(prev => ({ ...prev, [requestId]: '' }));
  };

  if (!can.manage_logbook || pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Logbook Requests</CardTitle>
        <CardDescription>Review and action these requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-4">
          {pendingRequests.map(req => {
            const employee = manpowerProfiles.find(p => p.id === req.manpowerId);
            const requester = users.find(u => u.id === req.requesterId);
            const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
            
            return (
              <AccordionItem key={req.id} value={req.id} className="border rounded-lg">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex justify-between w-full items-center">
                    <div>
                      <p className="font-semibold">Request for {employee?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">From: {requester?.name || 'Unknown'}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <div className="space-y-4">
                    {req.remarks && <p className="text-sm italic">"{req.remarks}"</p>}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-xs">Comment History</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {commentsArray.length > 0 ? commentsArray.map((c,i) => {
                            const commentUser = users.find(u => u.id === c.userId);
                            return (
                                <div key={i} className="flex items-start gap-2">
                                    <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                    <div className="text-xs bg-background p-2 rounded-md w-full">
                                        <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                        <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                    </div>
                                </div>
                            )
                        }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                        </div>
                         <div className="relative pt-2">
                            <Textarea
                                value={newComments[req.id] || ''}
                                onChange={(e) => setNewComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                                placeholder="Add a comment..."
                                className="pr-10 text-xs"
                                rows={1}
                            />
                            <Button
                                type="button"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => handleAddComment(req.id)}
                                disabled={!newComments[req.id] || !newComments[req.id].trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" onClick={() => setRejectionRequestId(req.id)}>Reject</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Request?</AlertDialogTitle>
                                  <AlertDialogDescription>Please provide a reason for rejecting this request.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-2"><Label htmlFor="rejection-comment">Comment</Label><Textarea id="rejection-comment" value={comment} onChange={e => setComment(e.target.value)} /></div>
                              <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setRejectionRequestId(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleAction(req.id, 'Rejected')}>Confirm Rejection</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      <Button size="sm" onClick={() => handleAction(req.id, 'Completed')}>Approve</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
