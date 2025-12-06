'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryItem, CertificateRequestType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface RequestCertificateDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: InventoryItem;
}

export default function RequestCertificateDialog({ isOpen, setIsOpen, item }: RequestCertificateDialogProps) {
  const { addCertificateRequest } = useAppContext();
  const { toast } = useToast();
  const [requestType, setRequestType] = useState<CertificateRequestType | ''>('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!requestType) {
      toast({ variant: 'destructive', title: 'Please select a request type.' });
      return;
    }
    if (!comment) {
      toast({ variant: 'destructive', title: 'Please add a comment.' });
      return;
    }
    
    addCertificateRequest({
      itemId: item.id,
      requestType: requestType,
      remarks: comment,
    });
    toast({ title: 'Request Submitted', description: `Your request for the ${requestType} has been sent.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Certificate</DialogTitle>
          <DialogDescription>
            Request a certificate for {item.name} (SN: {item.serialNumber}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Certificate Type</Label>
            <Select value={requestType} onValueChange={(value) => setRequestType(value as CertificateRequestType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select certificate type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inspection Certificate">Inspection Certificate</SelectItem>
                <SelectItem value="TP Certificate">TP Certificate</SelectItem>
                 <SelectItem value="Calibration Certificate">Calibration Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Comment / Reason</Label>
            <Textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment explaining why you need this certificate."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
