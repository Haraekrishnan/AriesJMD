
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Edit, Check, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { InternalRequest, InternalRequestStatus, Comment, InternalRequestItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '../ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface InternalRequestTableProps {
  requests: InternalRequest[];
}

const statusVariant: Record<InternalRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
  'Partially Issued': 'outline',
  'Partially Approved': 'outline'
};

const requestItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required.'),
  remarks: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Issued']),
});
const editRequestSchema = z.object({
  items: z.array(requestItemSchema).min(1, 'At least one item is required.'),
});
type EditRequestFormValues = z.infer<typeof editRequestSchema>;


const RequestCard = ({ req }: { req: InternalRequest }) => {
    const { user, users, roles, updateInternalRequestStatus, updateInternalRequestItems, markInternalRequestAsViewed, deleteInternalRequest, acknowledgeInternalRequest } = useAppContext();
    const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [action, setAction] = useState<InternalRequestStatus | null>(null);
    const [comment, setComment] = useState('');
    const { toast } = useToast();
    
    const form = useForm<EditRequestFormValues>({ resolver: zodResolver(editRequestSchema) });
    const { fields, append, remove, control } = useFieldArray({ control: form.control, name: 'items' });

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
        if (!selectedRequest || !user) return;
        updateInternalRequestItems(selectedRequest.id, data.items);
        toast({ title: 'Request Updated', description: 'The item list has been updated and the requester notified.'});
        setIsEditing(false);
    }

    const handleConfirmAction = () => {
        if (!selectedRequest || !action) return;
        if (!comment.trim() && action !== 'Approved') {
            toast({ title: 'Comment required', variant: 'destructive'});
            return;
        }
        updateInternalRequestStatus(selectedRequest.id, action, comment);
        toast({ title: `Request ${action}` });
        setSelectedRequest(null);
        setAction(null);
    };

    const handleDelete = (requestId: string) => {
        deleteInternalRequest(requestId);
        toast({ variant: 'destructive', title: 'Request Deleted' });
    };

    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markInternalRequestAsViewed(req.id);
        }
    };
    
    const requester = users.find(u => u.id === req.requesterId);
    const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
    const canEditRequest = user?.role === 'Admin' || (canApprove && req.status === 'Pending');
    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
    const needsAcknowledgement = user?.id === req.requesterId && req.status === 'Issued' && !req.acknowledgedByRequester;

    return (
        <Card className={cn("relative", hasUpdate && "border-blue-500")}>
            {hasUpdate && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
            <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{requester?.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">ID: {req.id.slice(-6)} &middot; {format(new Date(req.date), 'dd MMM yyyy')}</p>
                    </div>
                    {needsAcknowledgement ? (
                       <Button size="sm" onClick={() => acknowledgeInternalRequest(req.id)}>Acknowledge</Button>
                    ) : (
                       <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req.id)}>
                    <AccordionItem value={req.id} className="border-none">
                        <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Items & History</AccordionTrigger>
                        <AccordionContent className="pt-2 text-muted-foreground">
                        <ul className="list-disc pl-4 text-sm mb-4">
                            {req.items.map((item, index) => (
                            <li key={index}>
                                {item.quantity} {item.unit} {item.description}
                                <Badge variant="secondary" className="ml-2 text-xs">{item.status}</Badge>
                                {item.remarks && <span className="text-muted-foreground text-xs"> ({item.remarks})</span>}
                            </li>
                            ))}
                        </ul>
                        <h4 className="font-semibold text-xs mb-2">Comment History</h4>
                        <div className="space-y-2">
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
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            <CardFooter className="p-2 bg-muted/50">
                 <div className="flex flex-wrap justify-end gap-2 w-full">
                     {canApprove && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(req)} disabled={req.status === 'Issued' && user?.role !== 'Admin'}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                            <Button size="sm" variant="default" onClick={() => handleActionClick(req, 'Approved')} disabled={req.status !== 'Pending'}><CheckCircle className="mr-2 h-4 w-4" /> Approve All</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleActionClick(req, 'Issued')} disabled={!['Approved', 'Partially Approved'].includes(req.status)}><Truck className="mr-2 h-4 w-4" /> Issue All</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject All</Button>
                        </>
                     )}
                     {user?.role === 'Admin' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Revise Status</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onSelect={() => handleActionClick(req, 'Pending')}>Set to Pending</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleActionClick(req, 'Approved')}>Set to Approved</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleActionClick(req, 'Issued')}>Set to Issued</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleActionClick(req, 'Rejected')}>Set to Rejected</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete Request
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete this store request.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                 </div>
            </CardFooter>

            {selectedRequest && action && (
                <AlertDialog open={!!(selectedRequest && action)} onOpenChange={() => setSelectedRequest(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{action} Request?</AlertDialogTitle>
                            <AlertDialogDescription>Please provide a comment for this action.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div>
                            <Label htmlFor="comment">Comment {action !== 'Approved' && '(Required)'}</Label>
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
                    <DialogContent className="sm:max-w-3xl flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
                        <DialogHeader><DialogTitle>Edit Request Items</DialogTitle></DialogHeader>
                        <form onSubmit={form.handleSubmit(onEditSubmit)} className="flex-1 flex flex-col overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 items-center px-4 pb-2 shrink-0">
                                <div className="col-span-5"><Label className="text-xs">Item Description</Label></div>
                                <div className="col-span-2"><Label className="text-xs">Quantity</Label></div>
                                <div className="col-span-1"><Label className="text-xs">Unit</Label></div>
                                <div className="col-span-2"><Label className="text-xs">Remarks</Label></div>
                                {user?.role === 'Admin' && <div className="col-span-1"><Label className="text-xs">Status</Label></div>}
                                <div className="col-span-1"></div>
                            </div>
                            <ScrollArea className="flex-1 px-4">
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                        <div className="col-span-5 space-y-1"><Textarea {...form.register(`items.${index}.description`)} rows={1} /></div>
                                        <div className="col-span-2 space-y-1"><Input type="number" {...form.register(`items.${index}.quantity`)} /></div>
                                        <div className="col-span-1 space-y-1"><Input {...form.register(`items.${index}.unit`)} /></div>
                                        <div className="col-span-2 space-y-1"><Input {...form.register(`items.${index}.remarks`)} /></div>
                                        {user?.role === 'Admin' && (
                                          <div className="col-span-1">
                                            <Controller
                                              name={`items.${index}.status`}
                                              control={control}
                                              render={({ field: selectField }) => (
                                                <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                  <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                    <SelectItem value="Approved">Approved</SelectItem>
                                                    <SelectItem value="Issued">Issued</SelectItem>
                                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              )}
                                            />
                                          </div>
                                        )}
                                        <div className="col-span-1 flex items-end h-full"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
                                    </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="px-4 pt-4 shrink-0">
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, description: '', quantity: 1, unit: 'pcs', remarks: '', status: 'Pending' })}><PlusCircle className="mr-2 h-4 w-4" />Add Item</Button>
                                {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}
                            </div>
                            <DialogFooter className="mt-4 pt-4 border-t px-6 pb-6 shrink-0">
                            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    )
}

export default function InternalRequestTable({ requests }: InternalRequestTableProps) {
  const { user, markInternalRequestAsViewed } = useAppContext();
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  const { activeRequests, completedRequests } = useMemo(() => {
    const active: InternalRequest[] = [];
    const completed: InternalRequest[] = [];
    requests.forEach(req => {
      if (req.status === 'Issued' || req.status === 'Rejected') {
        completed.push(req);
      } else {
        active.push(req);
      }
    });
    return { activeRequests: active, completedRequests: completed };
  }, [requests]);

  useEffect(() => {
    if (isCompletedOpen && user) {
        completedRequests.forEach(req => {
            if (req.requesterId === user.id && !req.viewedByRequester) {
                markInternalRequestAsViewed(req.id);
            }
        });
    }
  }, [isCompletedOpen, completedRequests, user, markInternalRequestAsViewed]);


  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No requests found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Active Requests ({activeRequests.length})</h3>
        {activeRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No active requests.</p>
        )}
      </div>
      {completedRequests.length > 0 && (
        <Accordion type="single" collapsible className="w-full" onValueChange={(value) => setIsCompletedOpen(!!value)}>
          <AccordionItem value="completed-requests" className="border rounded-md">
            <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-lg">
              Completed & Rejected Requests ({completedRequests.length})
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {completedRequests.map(req => <RequestCard key={req.id} req={req} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
