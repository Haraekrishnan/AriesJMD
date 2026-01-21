
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Megaphone, Edit, Trash2 } from 'lucide-react';
import type { Announcement } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditAnnouncementDialog from './EditAnnouncementDialog';
import { Textarea } from '../ui/textarea';

export default function AnnouncementApprovalDialog() {
  const { user, users, announcements, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, can } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const pendingAnnouncements = useMemo(() => {
    if (!user) return [];
    return announcements.filter(a => a.status === 'pending' && a.approverId === user.id);
  }, [announcements, user]);

  const handleApprove = (id: string) => {
    approveAnnouncement(id);
    toast({ title: "Announcement Approved & Published" });
  };
  
  const handleReject = (id: string) => {
    rejectAnnouncement(id);
    toast({ variant: 'destructive', title: "Announcement Rejected" });
  }

  const handleDelete = (id: string) => {
    deleteAnnouncement(id);
    toast({ variant: 'destructive', title: "Announcement Deleted" });
  };
  
  const handleReturn = (id: string, comment: string) => {
    if(!comment.trim()){
      toast({ variant: 'destructive', title: 'Comment required to return.'});
      return;
    }
    returnAnnouncement(id, comment);
    toast({ title: 'Announcement Returned', description: 'The announcement has been sent back to the creator for modification.'});
  };

  const [returnComment, setReturnComment] = useState('');

  if (pendingAnnouncements.length === 0 || !can.manage_announcements) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Megaphone />
                {pendingAnnouncements.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs" variant="destructive">{pendingAnnouncements.length}</Badge>
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Announcement Approvals</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Pending Announcements</DialogTitle>
          <DialogDescription>Review, approve, or reject the announcements below.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
                {pendingAnnouncements.length > 0 ? (
                    pendingAnnouncements.map(announcement => {
                        const creator = users.find(u => u.id === announcement.creatorId);
                        return (
                            <div key={announcement.id} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{announcement.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Avatar className="h-6 w-6"><AvatarImage src={creator?.avatar}/><AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback></Avatar>
                                            <span>{creator?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground my-2 p-2 bg-muted rounded-md whitespace-pre-wrap">{announcement.content}</p>
                                <div className="flex justify-end items-center gap-2 mt-4">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Delete</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the announcement.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(announcement.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" variant="outline">Return</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Return for Modification</AlertDialogTitle><AlertDialogDescription>Provide a comment explaining what needs to be changed.</AlertDialogDescription></AlertDialogHeader>
                                            <Textarea placeholder="Your comment..." onChange={(e) => setReturnComment(e.target.value)} />
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleReturn(announcement.id, returnComment)}>Return</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <Button size="sm" variant="outline" onClick={() => setEditingAnnouncement(announcement)}><Edit className="mr-2 h-4 w-4"/>Edit & Approve</Button>
                                    <Button size="sm" onClick={() => handleApprove(announcement.id)}>Approve</Button>
                                </div>
                            </div>
                        )
                    })
                ) : <p className="text-muted-foreground text-center py-8">No announcements awaiting your approval.</p>}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {editingAnnouncement && (
        <EditAnnouncementDialog 
            isOpen={!!editingAnnouncement}
            setIsOpen={() => setEditingAnnouncement(null)}
            announcement={editingAnnouncement}
        />
    )}
    </>
  );
}
