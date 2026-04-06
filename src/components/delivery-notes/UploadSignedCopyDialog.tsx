'use client';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/app-provider';
import type { DeliveryNote } from '@/lib/types';
import { uploadFile } from '@/lib/storage';

interface UploadSignedCopyDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  note: DeliveryNote;
}

export default function UploadSignedCopyDialog({ isOpen, setIsOpen, note }: UploadSignedCopyDialogProps) {
  const { updateDeliveryNote } = useAppContext();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'No file selected', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const path = `delivery-notes/${note.id}/signed/${file.name}`;
      const url = await uploadFile(file, path);
      updateDeliveryNote(note.id, { signedAttachmentUrl: url });
      toast({ title: 'Signed copy uploaded successfully' });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Signed Delivery Note</DialogTitle>
          <DialogDescription>
            Upload the scanned, signed copy for DN #{note.deliveryNoteNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input type="file" onChange={handleFileChange} accept="application/pdf,image/*" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
