
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Send, UserPlus, FileDown, Layers, Trash2 } from 'lucide-react';
import type { IncidentReport, IncidentStatus, Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { TransferList } from '../ui/transfer-list';
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusVariant: { [key in IncidentStatus]: "default" | "secondary" | "destructive" | "outline" } = {
    'New': 'destructive',
    'Under Investigation': 'default',
    'Action Pending': 'outline',
    'Resolved': 'secondary',
    'Closed': 'secondary',
}

const statusOptions: IncidentStatus[] = ['New', 'Under Investigation', 'Action Pending', 'Resolved', 'Closed'];

interface EditIncidentReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  incidentId: string | null;
}

export default function EditIncidentReportDialog({ isOpen, setIsOpen, incidentId }: EditIncidentReportDialogProps) {
  const { user, users, projects, incidentReports, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, deleteIncidentReport } = useAppContext();
  const { toast } = useToast();
  
  const [newComment, setNewComment] = useState('');
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const incident = useMemo(() => {
    if (!incidentId) return null;
    return incidentReports.find(i => i.id === incidentId);
  }, [incidentId, incidentReports]);

  const reporter = useMemo(() => incident ? users.find(u => u.id === incident.reporterId) : null, [users, incident]);
  const project = useMemo(() => incident ? projects.find(p => p.id === incident.projectId) : null, [projects, incident]);
  
  const canManageIncident = useMemo(() => ['Admin', 'Senior Safety Supervisor'].includes(user?.role || ''), [user]);

  const participants = useMemo(() => {
    if (!incident) return [];
    const pIds = new Set([incident.reporterId, ...(incident.reportedToUserIds || [])]);
    return users.filter(u => pIds.has(u.id));
  }, [users, incident]);
  
  const canAddUsers = useMemo(() => {
    if (!user || !incident) return false;
    const allowedRoles: Role[] = ['Admin', 'Manager', 'Senior Safety Supervisor', 'Supervisor'];
    return allowedRoles.includes(user.role);
  }, [user, incident]);

  const availableUsersToAdd = useMemo(() => {
    if (!canAddUsers) return [];
    const participantIds = new Set(participants.map(p => p.id));
    const allowedRoles: Role[] = ['Admin', 'Manager', 'Senior Safety Supervisor', 'Supervisor'];
    return users
      .filter(u => !participantIds.has(u.id) && allowedRoles.includes(u.role))
      .map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));
  }, [users, participants, canAddUsers]);
  
  const canComment = useMemo(() => {
    if (!user || !incident) return false;
    if (incident.isPublished) {
        return participants.some(p => p.id === user.id);
    }
    return true;
  }, [user, incident, participants]);

  if (!incident) return null;

  const handleAddComment = () => {
    if (!newComment.trim() || !user || !canComment) return;
    addIncidentComment(incident.id, newComment);
    setNewComment('');
  };

  const handleStatusChange = (newStatus: IncidentStatus) => {
    if (!canManageIncident) return;
    const comment = `Status changed to: ${newStatus}`;
    updateIncident({ ...incident, status: newStatus }, comment);
    toast({ title: 'Incident Status Updated' });
  };
  
  const handleAddUsers = () => {
    if (selectedUsers.length === 0) {
        toast({variant: 'destructive', title: 'No users selected'});
        return;
    }
    const addedUserNames = users.filter(u => selectedUsers.includes(u.id)).map(u => u.name).join(', ');
    const comment = `Added ${addedUserNames} to the report.`;
    addUsersToIncidentReport(incident.id, selectedUsers, comment);
    toast({ title: 'Users Added', description: `${addedUserNames} added to the report.` });
    setSelectedUsers([]);
    setShowAddUsers(false);
  };
  
  const handleGenerateReport = () => {
    const commentsArray = Array.isArray(incident.comments) 
        ? incident.comments 
        : Object.values(incident.comments || {});

    const data = [
        { A: 'Incident ID', B: incident.id },
        { A: 'Status', B: incident.status },
        { A: 'Reported By', B: reporter?.name },
        { A: 'Project', B: project?.name },
        { A: 'Area', B: incident.unitArea },
        { A: 'Incident Time', B: format(new Date(incident.incidentTime), 'yyyy-MM-dd HH:mm') },
        { A: 'Reported At', B: format(new Date(incident.reportTime), 'yyyy-MM-dd HH:mm') },
        { A: 'Details', B: incident.incidentDetails },
        {},
        { A: '--- Comment History ---' },
        ...commentsArray.map(c => {
            const commentUser = users.find(u => u.id === c.userId);
            return {
                A: `Comment by ${commentUser?.name} at ${format(new Date(c.date), 'yyyy-MM-dd HH:mm')}`,
                B: c.text
            }
        })
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data, { header: ["A", "B"], skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Incident Report");
    XLSX.writeFile(workbook, `Incident_Report_${incident.id}.xlsx`);
  };
  
  const handlePublish = () => {
    const comment = `Incident published to all users.`;
    publishIncident(incident.id, comment);
    toast({ title: "Incident Published", description: "This incident is now visible to all users."});
  };

  const handleDelete = () => {
    deleteIncidentReport(incident.id);
    setIsOpen(false);
  };

  const commentsArray = Array.isArray(incident.comments) 
    ? incident.comments 
    : Object.values(incident.comments || {});

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Incident Report</DialogTitle>
              <DialogDescription>
                Reported by {reporter?.name} on {format(new Date(incident.reportTime), 'PPP p')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto max-h-[70vh]">
          {/* LEFT COLUMN: Incident Details */}
          <div className="space-y-4 pr-4 border-r">
            <h3 className="font-semibold border-b pb-2">Incident Details</h3>
            <div className="text-sm space-y-2">
                <div className="flex items-center gap-2"><strong>Status:</strong> <Badge variant={statusVariant[incident.status]} className="capitalize">{incident.status}</Badge></div>
                <p><strong>Location:</strong> {project?.name} - {incident.unitArea}</p>
                <p><strong>Time of Incident:</strong> {format(new Date(incident.incidentTime), 'PPP p')}</p>
            </div>
            <p className="text-sm p-4 bg-muted rounded-md min-h-[100px] whitespace-pre-wrap">{incident.incidentDetails}</p>
            
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
            
            {showAddUsers && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-semibold">Add Users to Report</h4>
                    <TransferList
                        options={availableUsersToAdd}
                        selected={selectedUsers}
                        onChange={setSelectedUsers}
                        availableTitle="Available"
                        selectedTitle="To Add"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => {setShowAddUsers(false); setSelectedUsers([]);}}>Cancel</Button>
                        <Button size="sm" onClick={handleAddUsers} disabled={selectedUsers.length === 0}>Add {selectedUsers.length} User(s)</Button>
                    </div>
                </div>
            )}
          </div>

          {/* RIGHT COLUMN: Actions & Comments */}
          <div className="flex flex-col gap-4">
             <div className="space-y-3">
                 <h3 className="font-semibold">Actions</h3>
                 <div className="flex flex-wrap gap-2">
                     {canManageIncident && (
                        <Select onValueChange={(value) => handleStatusChange(value as IncidentStatus)} value={incident.status}>
                          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Change status..." /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                     )}
                     {canAddUsers && !showAddUsers && (
                        <Button size="sm" variant="outline" onClick={() => setShowAddUsers(true)} disabled={availableUsersToAdd.length === 0}>
                            <UserPlus className="mr-2 h-4 w-4"/>Add Users
                        </Button>
                    )}
                 </div>
             </div>
             
             <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Comments & Activity</h3>
                <ScrollArea className="flex-1 h-64 pr-4 border-b">
                  <div className="space-y-4">
                    {commentsArray.map((comment, index) => {
                      const commentUser = users.find(u => u.id === comment.userId);
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                          <div className="bg-muted p-3 rounded-lg w-full">
                            <div className="flex justify-between items-center"><p className="font-semibold text-sm">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p></div>
                            <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                      )
                    })}
                     {commentsArray.length === 0 && <p className="text-sm text-center text-muted-foreground pt-12">No comments or activity yet.</p>}
                  </div>
                </ScrollArea>
                <div className="relative">
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={canComment ? "Add a comment..." : "You cannot comment on this incident."} className="pr-12" disabled={!canComment}/>
                  <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleAddComment} disabled={!newComment.trim() || !canComment}><Send className="h-4 w-4" /></Button>
                </div>
             </div>
          </div>
        </div>
        <DialogFooter className="justify-between">
            <div className="flex gap-2">
                {user?.role === 'Admin' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Report</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this incident report. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Confirm Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                {user?.role === 'Admin' && !incident.isPublished && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="secondary"><Layers className="mr-2 h-4 w-4"/> Publish Incident</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Publish Incident?</AlertDialogTitle>
                        <AlertDialogDescription>This will make the incident visible to all users. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleGenerateReport}><FileDown className="mr-2 h-4 w-4" />Generate Report</Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
