'use client';

import { useAppContext } from '@/contexts/app-provider';
import type { DeliveryNote } from '@/lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { format, parseISO } from 'date-fns';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { generateOutwardNotePdf } from './generateOutwardNotePdf';
import UploadSignedCopyDialog from './UploadSignedCopyDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface ViewDeliveryNoteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  note: DeliveryNote;
}

export default function ViewDeliveryNoteDialog({ isOpen, setIsOpen, note: initialNote }: ViewDeliveryNoteDialogProps) {
  const { user, deliveryNotes, updateDeliveryNote } = useAppContext();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { toast } = useToast();
  
  const note = useMemo(() => {
    return deliveryNotes.find(n => n.id === initialNote.id) || initialNote;
  }, [deliveryNotes, initialNote]);
  
  const handleDownload = () => {
    generateOutwardNotePdf(note);
  };
  
  const handleDeleteAttachment = () => {
    updateDeliveryNote(note.id, { signedAttachmentUrl: null });
    toast({ title: 'Signed copy removed.', description: 'The delivery note status is now incomplete.' });
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Note Details</DialogTitle>
            <DialogDescription>DN #{note.deliveryNoteNumber} on {format(parseISO(note.deliveryDate), 'PPP')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
                <div><p><strong>From:</strong></p><p className="whitespace-pre-wrap">{note.fromAddress}</p></div>
                <div><p><strong>To:</strong></p><p className="whitespace-pre-wrap">{note.toAddress}</p></div>
            </div>
            {note.ariesRefNo && <p><strong>Aries Ref. No:</strong> {note.ariesRefNo}</p>}
            {note.serviceType && <p><strong>Service Type:</strong> {note.serviceType}</p>}

            {note.type === 'Outward' && (
              <div>
                <h4 className="font-semibold mb-2">Items:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {note.items?.map((item, i) => (
                    <li key={i}>{item.quantity} x {item.description} {item.remarks ? `(${item.remarks})` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {note.type === 'Inward' && note.attachmentUrl && (
              <Button asChild variant="outline">
                <a href={note.attachmentUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>View Inward Note</a>
              </Button>
            )}

            {note.type === 'Outward' && note.signedAttachmentUrl && (
              <div className="flex items-center gap-2">
                <Button asChild variant="secondary" className="flex-1">
                    <a href={note.signedAttachmentUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>View Signed Copy</a>
                </Button>
                {user?.role === 'Admin' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Signed Copy?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove the uploaded signed copy. The delivery note will become incomplete.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAttachment}>Delete Attachment</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="justify-between">
            {note.type === 'Outward' && (
              <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4"/>Download PDF</Button>
            )}
            {note.type === 'Outward' && !note.signedAttachmentUrl && (
              <Button onClick={() => setIsUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Signed Copy</Button>
            )}
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {note.type === 'Outward' && (
        <UploadSignedCopyDialog 
          isOpen={isUploadOpen}
          setIsOpen={setIsUploadOpen}
          note={note}
        />
      )}
    </>
  );
}
