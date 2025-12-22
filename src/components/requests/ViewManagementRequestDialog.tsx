
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { Send, UserPlus, Layers, Trash2, Forward } from 'lucide-react';
import type { ManagementRequest, ManagementRequestStatus, Role, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import ForwardManagementRequestDialog from './ForwardManagementRequestDialog';

const statusOptions: ManagementRequestStatus[] = ['New', 'Under Review', 'Action Taken', 'Closed'];

const statusVariant: { [key in ManagementRequestStatus]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'New': 'default',
  'Under Review': 'secondary',
  'Action Taken': 'success',
  'Closed': 'secondary',
};

const SUPERVISORY_ROLES: Role[] = ['Admin', 'Project Coordinator', 'Supervisor', 'Senior Safety Supervisor', 'HSE', 'Store in Charge'];

interface ViewManagementRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  request: ManagementRequest;
}

export default function ViewManagementRequestDialog({ isOpen, setIsOpen, request: initialRequest }: ViewManagementRequestDialogProps) {
  const { user, users, managementRequests, updateManagementRequest, deleteManagementRequest, addManagementRequestComment } = useAppContext();
  const { toast } = useToast();
  
  const [newComment, setNewComment] = useState('');
  const [showForward, setShowForward] = useState(false);
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [isCcPopoverOpen, setIsCcPopoverOpen] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  // Use the live request from the context, which updates in real-time
  const request = useMemo(() => {
    return managementRequests.find(d => d.id === initialRequest.id) || initialRequest;
  }, [managementRequests, initialRequest]);

  const creator = useMemo(() => users.find(u => u.id === request.creatorId), [users, request]);
  const recipient = useMemo(() => users.find(u => u.id === request.toUserId), [users, request]);

  const canManageStatus = useMemo(() => {
    if (!user) return false;
    return user.id === request.toUserId || user.role === 'Admin';
  }, [user, request]);

  const participants = useMemo(() => {
    const pIds = new Set([request.creatorId, request.toUserId, ...(request.ccUserIds || [])]);
    return users.filter(u => pIds.has(u.id));
  }, [users, request]);

  const canAddUsers = useMemo(() => {
    if (!user || !request) return false;
    // Only recipient or Admin can forward/add users
    return user.id === request.toUserId || user.role === 'Admin';
  }, [user, request]);

  const availableUsersForCC = useMemo(() => {
    if (!canAddUsers) return [];
    const participantIds = new Set(participants.map(p => p.id));
    return users
      .filter(u => !participantIds.has(u.id) && SUPERVISORY_ROLES.includes(u.role))
      .map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));
  }, [users, participants, canAddUsers]);

  const handleAddComment = () => {
    if (!user) return;
    
    let commentText = newComment.trim();
    
    if (ccUserIds.length > 0) {
      const addedUsers = users.filter(u => ccUserIds.includes(u.id)).map(u => u.name).join(', ');
      const systemComment = `${user.name} added ${addedUsers} to this request.`;
      if (commentText) {
        commentText = `${systemComment}\n\n${commentText}`;
      } else {
        commentText = systemComment;
      }
    }

    if (!commentText) return;
    
    addManagementRequestComment(request.id, commentText, ccUserIds);
    setNewComment('');
    setCcUserIds([]);
    setShowForward(false);
  };
  
  const handleStatusChange = (newStatus: ManagementRequestStatus) => {
    if (!canManageStatus) return;
    const comment = `Status changed to: ${newStatus}`;
    updateManagementRequest({ ...request, status: newStatus }, comment);
    toast({ title: 'Request Status Updated' });
  };

  const handleDelete = () => {
    deleteManagementRequest(request.id);
    setIsOpen(false);
  };

  const commentsArray = Array.isArray(request.comments) 
    ? request.comments 
    : Object.values(request.comments || {});

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl grid-rows-[auto,1fr,auto] max-h-[90vh]">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{request.subject}</DialogTitle>
                <DialogDescription>
                  From: {creator?.name} &middot; To: {recipient?.name}
                </DialogDescription>
              </div>
              <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 grid md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-6 -mr-6">
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Original Message</h3>
              <p className="text-sm p-4 bg-muted rounded-md min-h-[100px] whitespace-pre-wrap">{request.body}</p>
              
              <div className="space-y-2">
                  <Label>Participants</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                      {participants.map(p => (
                          <div key={p.id} className="flex items-center gap-1 text-sm bg-muted p-1 rounded-md">
                            <Avatar className="h-5 w-5"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name.charAt(0)}</AvatarFallback></Avatar>
                            {p.name}
                          </div>
                      ))}
                  </div>
              </div>
              
              {showForward && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-semibold">Add Users to Conversation</h4>
                      <Popover open={isCcPopoverOpen} onOpenChange={setIsCcPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
                            <div className="flex flex-wrap gap-1">
                              {ccUserIds.length > 0
                                ? ccUserIds.map(id => {
                                  const user = availableUsersForCC.find(u => u.value === id);
                                  return <Badge key={id} variant="secondary">{user?.label || id}</Badge>
                                })
                                : <span className="text-muted-foreground">Select users to CC...</span>
                              }
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandList>
                              <CommandEmpty>No users available.</CommandEmpty>
                              <CommandGroup>
                                {availableUsersForCC.map(option => {
                                  const isSelected = ccUserIds.includes(option.value);
                                  return (
                                    <CommandItem key={option.value} onSelect={() => {
                                      setCcUserIds(prev => isSelected ? prev.filter(id => id !== option.value) : [...prev, option.value]);
                                    }}>
                                      <Check className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                      {option.label}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                  </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                  <h3 className="font-semibold">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                      {canManageStatus && (
                          <Select onValueChange={(value) => handleStatusChange(value as ManagementRequestStatus)} value={request.status}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Change status..." /></SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                      )}
                      {canAddUsers && (
                          <div className="flex gap-2">
                           <Button size="sm" variant="outline" onClick={() => setShowForward(!showForward)}>
                              <UserPlus className="mr-2 h-4 w-4"/>CC
                          </Button>
                           <Button size="sm" variant="outline" onClick={() => setIsForwarding(true)}>
                              <Forward className="mr-2 h-4 w-4"/>Forward
                          </Button>
                          </div>
                      )}
                  </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                  <h3 className="text-lg font-semibold">Comments & Activity</h3>
                  <ScrollArea className="flex-1 h-64 pr-4 border-b">
                    <div className="space-y-4">
                      {commentsArray.map((comment, index) => {
                        const commentUser = users.find(u => u.id === comment.userId);
                        const date = comment.date ? parseISO(comment.date) : null;
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="bg-muted p-3 rounded-lg w-full">
                              <div className="flex justify-between items-center"><p className="font-semibold text-sm">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{date && isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Invalid date'}</p></div>
                              <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                            </div>
                          </div>
                        )
                      })}
                      {commentsArray.length === 0 && <p className="text-sm text-center text-muted-foreground pt-12">No comments or activity yet.</p>}
                    </div>
                  </ScrollArea>
                  <div className="relative">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="pr-12" />
                    <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleAddComment} disabled={!newComment.trim() && ccUserIds.length === 0}><Send className="h-4 w-4" /></Button>
                  </div>
              </div>
            </div>
          </div>
          <DialogFooter className="justify-between">
              <div className="flex gap-2">
                  {user?.role === 'Admin' && (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Request</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete this request and its conversation history for everyone. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete}>Confirm Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isForwarding && (
        <ForwardManagementRequestDialog
          isOpen={isForwarding}
          setIsOpen={setIsForwarding}
          originalRequest={request}
        />
      )}
    </>
  );
}

    