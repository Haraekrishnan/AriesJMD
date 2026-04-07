'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { DeliveryNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Search, Eye, CheckCircle, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import ViewDeliveryNoteDialog from './ViewDeliveryNoteDialog';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DeliveryNoteListProps {
  type: 'Inward' | 'Outward';
}

export default function DeliveryNoteList({ type }: DeliveryNoteListProps) {
  const { deliveryNotes, user, deleteDeliveryNote } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewingNote, setViewingNote] = useState<DeliveryNote | null>(null);
  const { toast } = useToast();

  const filteredNotes = useMemo(() => {
    return deliveryNotes.filter(note => {
      const typeMatch = note.type === type;
      const dateMatch = format(parseISO(note.deliveryDate), 'yyyy-MM') === month;
      const searchMatch = searchTerm === '' || 
        note.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.fromAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.toAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.items && note.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase())));

      return typeMatch && dateMatch && searchMatch;
    });
  }, [deliveryNotes, type, month, searchTerm]);

  const handleDelete = (noteId: string) => {
    deleteDeliveryNote(noteId);
    toast({ title: 'Delivery Note Deleted', variant: 'destructive' });
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        <Input 
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-auto"
        />
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by DN no, addresses, or items..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="border rounded-md">
        {filteredNotes.length > 0 ? (
          filteredNotes.map(note => {
            const isCompleted = type === 'Outward' && !!note.signedAttachmentUrl;
            return (
              <div key={note.id} className={cn("p-4 border-b last:border-b-0 flex justify-between items-center", isCompleted && "bg-green-50 dark:bg-green-900/40")}>
                <div className="flex items-center gap-3">
                    {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
                    <div>
                        <p className="font-semibold">DN #{note.deliveryNoteNumber}</p>
                        <p className="text-sm text-muted-foreground">
                        {format(parseISO(note.deliveryDate), 'PPP')} | From: {note.fromAddress} | To: {note.toAddress}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewingNote(note)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  {user?.role === 'Admin' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this delivery note. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(note.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-center p-8 text-muted-foreground">No notes found for this period.</p>
        )}
      </div>
      {viewingNote && (
        <ViewDeliveryNoteDialog
          isOpen={!!viewingNote}
          setIsOpen={() => setViewingNote(null)}
          note={viewingNote}
        />
      )}
    </>
  );
}
