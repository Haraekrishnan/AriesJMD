'use client';

import { useAppContext } from '@/contexts/app-provider';
import type { DeliveryNote } from '@/lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { format, parseISO } from 'date-fns';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { generateOutwardNotePdf } from './generateOutwardNotePdf';
import UploadSignedCopyDialog from './UploadSignedCopyDialog';

interface ViewDeliveryNoteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  note: DeliveryNote;
}

export default function ViewDeliveryNoteDialog({ isOpen, setIsOpen, note }: ViewDeliveryNoteDialogProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const handleDownload = () => {
    generateOutwardNotePdf(note);
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
              <Button asChild variant="secondary">
                <a href={note.signedAttachmentUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>View Signed Copy</a>
              </Button>
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
