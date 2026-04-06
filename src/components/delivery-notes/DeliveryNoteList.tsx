'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { DeliveryNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Search, Eye } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import ViewDeliveryNoteDialog from './ViewDeliveryNoteDialog';

interface DeliveryNoteListProps {
  type: 'Inward' | 'Outward';
}

export default function DeliveryNoteList({ type }: DeliveryNoteListProps) {
  const { deliveryNotes } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewingNote, setViewingNote] = useState<DeliveryNote | null>(null);

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
          filteredNotes.map(note => (
            <div key={note.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
              <div>
                <p className="font-semibold">DN #{note.deliveryNoteNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(note.deliveryDate), 'PPP')} | From: {note.fromAddress} | To: {note.toAddress}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setViewingNote(note)}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Button>
            </div>
          ))
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
