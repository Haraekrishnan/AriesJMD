
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { ManpowerProfile, LogbookStatus, LogbookRecord, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown, Trash2, MessageSquare } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


interface LogbookHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const getStatusVariant = (status?: LogbookStatus) => {
    switch (status) {
        case 'Received': return 'success';
        case 'Not Received': return 'destructive';
        case 'Sent back as requested': return 'warning';
        case 'Pending':
        default:
            return 'secondary';
    }
};

const HistoryEntry = ({ label, value, isDateTime = false, isDate = false }: { label: string, value?: string | null, isDateTime?: boolean, isDate?: boolean }) => {
    if (!value) return null;
    let formattedValue = value;
    try {
        if (isDateTime) {
            formattedValue = format(parseISO(value), 'dd MMM, yyyy p');
        } else if (isDate) {
            formattedValue = format(parseISO(value), 'dd MMM, yyyy');
        }
    } catch (e) {
        // Do nothing if date is invalid
    }
    return (
        <p><strong>{label}:</strong> {formattedValue}</p>
    );
};

export default function LogbookHistoryDialog({ isOpen, setIsOpen }: LogbookHistoryDialogProps) {
  const { user, manpowerProfiles, users, deleteLogbookHistoryRecord, logbookRequests } = useAppContext();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();
  
  const selectedProfile = useMemo(() => {
    return manpowerProfiles.find(p => p.id === selectedProfileId);
  }, [selectedProfileId, manpowerProfiles]);

  const logbookHistory = useMemo(() => {
    if (!selectedProfile?.logbookHistory) return [];
    const history = Array.isArray(selectedProfile.logbookHistory) 
        ? selectedProfile.logbookHistory 
        : Object.values(selectedProfile.logbookHistory);
    return history.sort((a,b) => parseISO(b.entryDate || '1970-01-01').getTime() - parseISO(a.entryDate || '1970-01-01').getTime());
  }, [selectedProfile]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setSelectedProfileId(null);
    }
    setIsOpen(open);
  };
  
  const handleDelete = (manpowerId: string, recordId: string) => {
    deleteLogbookHistoryRecord(manpowerId, recordId);
    toast({ title: "History Record Deleted", variant: "destructive" });
  };
  
  const getRequestComments = (requestId?: string) => {
    if (!requestId) return [];
    const request = logbookRequests.find(r => r.id === requestId);
    if (!request || !request.comments) return [];
    return Array.isArray(request.comments) ? request.comments : Object.values(request.comments);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg h-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Logbook History</DialogTitle>
          <DialogDescription>Select an employee to view their logbook status and history.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
            <Label>Select Employee</Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        {selectedProfile ? selectedProfile.name : "Select employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search employee..." />
                        <CommandList>
                            <CommandEmpty>No employees found.</CommandEmpty>
                            <CommandGroup>
                                {manpowerProfiles.map(p => (
                                    <CommandItem key={p.id} value={p.name} onSelect={() => {
                                        setSelectedProfileId(p.id);
                                        setIsPopoverOpen(false);
                                    }}>
                                        {p.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>

        {selectedProfile && (
            <div className="flex-1 overflow-hidden flex flex-col mt-4">
                <h3 className="font-semibold mb-2">History for {selectedProfile.name}</h3>
                <ScrollArea className="flex-1 border rounded-md p-4">
                    {logbookHistory.length > 0 ? (
                        <div className="space-y-3 text-sm">
                            {logbookHistory.map((record, index) => {
                                const enteredBy = users.find(u => u.id === record.enteredById);
                                const requestedBy = record.requestedById ? users.find(u => u.id === record.requestedById) : null;
                                const comments = getRequestComments(record.requestId);

                                return (
                                    <div key={`${record.id}-${index}`} className="p-3 border rounded-md bg-muted/50 relative">
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this history record?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(selectedProfile!.id, record.id!)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                        <div className="flex items-center gap-2 mb-2"><strong>Status:</strong> <Badge variant={getStatusVariant(record.status)}>{record.status || 'Pending'}</Badge></div>
                                        <HistoryEntry label="Entry Date" value={record.entryDate} isDateTime />
                                        <HistoryEntry label="Entered By" value={enteredBy?.name} />
                                        <HistoryEntry label="Out Date" value={record.outDate} isDate />
                                        <HistoryEntry label="In Date" value={record.inDate} isDate />
                                        {requestedBy && <HistoryEntry label="Requested By" value={requestedBy.name} />}
                                        {record.requestRemarks && <HistoryEntry label="Remarks" value={record.requestRemarks} />}
                                        
                                        {comments.length > 0 && (
                                            <Accordion type="single" collapsible className="w-full mt-2">
                                                <AccordionItem value="comments" className="border-none">
                                                    <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline"><div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> View Request Comments ({comments.length})</div></AccordionTrigger>
                                                    <AccordionContent className="pt-2">
                                                        <div className="space-y-2">
                                                            {comments.map((c, i) => {
                                                                const commentUser = users.find(u => u.id === c.userId);
                                                                return (
                                                                    <div key={i} className="flex items-start gap-2">
                                                                        <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                        <div className="text-xs bg-background p-2 rounded-md w-full">
                                                                            <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(parseISO(c.date), { addSuffix: true })}</p></div>
                                                                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No logbook history found for this employee.</p>
                    )}
                </ScrollArea>
            </div>
        )}

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
