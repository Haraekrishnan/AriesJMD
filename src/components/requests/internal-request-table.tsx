
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Edit, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { InternalRequest, InternalRequestStatus, Comment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface InternalRequestTableProps {
  requests: InternalRequest[];
}

const statusVariant: Record<InternalRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'outline',
  Rejected: 'destructive',
};

const requestItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});
const editRequestSchema = z.object({
  items: z.array(requestItemSchema).min(1, 'At least one item is required.'),
});
type EditRequestFormValues = z.infer<typeof editRequestSchema>;

export default function InternalRequestTable({ requests }: InternalRequestTableProps) {
  const { user, users, roles, updateInternalRequestStatus, updateInternalRequestItems, markInternalRequestAsViewed } = useAppContext();
  const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
  const [action, setAction] = useState<InternalRequestStatus | null>(null);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<EditRequestFormValues>({ resolver: zodResolver(editRequestSchema) });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const canApprove = useMemo(() => {
    if (!user) return false;
    const userRole = roles.find(r => r.name === user.role);
    return userRole?.permissions.includes('approve_store_requests');
  }, [user, roles]);

  const handleActionClick = (req: InternalRequest, newStatus: InternalRequestStatus) => {
    setAction(newStatus);
    setSelectedRequest(req);
  };
  
  const handleEditClick = (req: InternalRequest) => {
    setSelectedRequest(req);
    form.reset({ items: req.items });
    setIsEditing(true);
  };
  
  const onEditSubmit = (data: EditRequestFormValues) => {
    if (!selectedRequest) return;
    updateInternalRequestItems(selectedRequest.id, data.items);
    toast({ title: 'Request Updated', description: 'The item list has been updated and the requester notified.'});
    setIsEditing(false);
  }

  const handleConfirmAction = () => {
    if (!selectedRequest || !action) return;
     if (!comment.trim()) {
        toast({ title: 'Comment required', variant: 'destructive'});
        return;
    }
    updateInternalRequestStatus(selectedRequest.id, action, comment);
    toast({ title: `Request ${action}` });
    setSelectedRequest(null);
    setAction(null);
  };
  
  const getRequesterName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  
  const handleAccordionToggle = (req: InternalRequest) => {
    if (user?.id === req.requesterId && !req.viewedByRequester) {
        markInternalRequestAsViewed(req.id);
    }
  };

  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No requests found.</p>;
  }

  return (
    <>
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Request ID</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items & History</TableHead>
            <TableHead>Status</TableHead>
            {canApprove && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => {
            const hasUpdate = req.requesterId === user?.id && !req.viewedByRequester;
            return (
              <TableRow key={req.id} className={cn(hasUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
                <TableCell className="w-8">
                   {hasUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{req.id}</TableCell>
                <TableCell>{getRequesterName(req.requesterId)}</TableCell>
                <TableCell>{format(new Date(req.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="max-w-md">
                  <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req)}>
                      <AccordionItem value={req.id} className="border-none">
                          <AccordionTrigger className="p-0 hover:no-underline font-normal text-left">{req.items.length} item(s)</AccordionTrigger>
                          <AccordionContent className="pt-2 text-muted-foreground">
                            <ul className="list-disc pl-4 text-sm mb-4">
                              {req.items.map((item, index) => (
                                <li key={index}>
                                  {item.quantity}x {item.description}
                                  {item.remarks && <span className="text-muted-foreground text-xs"> ({item.remarks})</span>}
                                </li>
                              ))}
                            </ul>
                            <h4 className="font-semibold text-xs mb-2">Comment History</h4>
                            <div className="space-y-2">
                              {req.comments && req.comments.length > 0 ? req.comments.map((c,i) => {
                                  const commentUser = users.find(u => u.id === c.userId);
                                  return (
                                      <div key={i} className="flex items-start gap-2">
                                          <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                          <div className="text-xs bg-muted p-2 rounded-md w-full">
                                              <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                              <p className="text-foreground/80 mt-1">{c.text}</p>
                                          </div>
                                      </div>
                                  )
                              }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                            </div>
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </TableCell>
                {canApprove && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={req.status === 'Issued' || req.status === 'Rejected'}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEditClick(req)}><Edit className="mr-2 h-4 w-4" /> Edit Items</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleActionClick(req, 'Issued')} disabled={req.status !== 'Approved'}><Truck className="mr-2 h-4 w-4" /> Mark as Issued</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>

    {selectedRequest && action && (
        <AlertDialog open={!!(selectedRequest && action)} onOpenChange={() => setSelectedRequest(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{action} Request?</AlertDialogTitle>
                    <AlertDialogDescription>Please provide a comment for this action.</AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                    <Label htmlFor="comment">Comment (Required)</Label>
                    <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAction}>{action}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}

    {selectedRequest && isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Edit Request Items</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit(onEditSubmit)}>
                    <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
                        {fields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                             <div className="col-span-6 space-y-1"><Input {...form.register(`items.${index}.description`)} /></div>
                             <div className="col-span-2 space-y-1"><Input type="number" {...form.register(`items.${index}.quantity`)} /></div>
                             <div className="col-span-3 space-y-1"><Input {...form.register(`items.${index}.remarks`)} /></div>
                             <div className="col-span-1 flex items-end h-full"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
                           </div>
                        ))}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
}
