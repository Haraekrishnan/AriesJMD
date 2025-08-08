
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import type { InventoryItem, UTMachine, DftMachine } from '@/lib/types';

const certRequestSchema = z.object({
  requestType: z.enum(['Calibration Certificate', 'TP Inspection Certificate']),
  remarks: z.string().optional(),
});

type CertRequestFormValues = z.infer<typeof certRequestSchema>;

interface RequestCertificateDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item?: InventoryItem;
  utMachine?: UTMachine;
  dftMachine?: DftMachine;
}

export default function NewCertificateRequestDialog({ isOpen, setIsOpen, item, utMachine, dftMachine }: RequestCertificateDialogProps) {
  const { addCertificateRequest } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<CertRequestFormValues>({
    resolver: zodResolver(certRequestSchema),
  });

  const onSubmit = (data: CertRequestFormValues) => {
    const subjectName = item ? item.name : (utMachine ? utMachine.machineName : (dftMachine ? dftMachine.machineName : 'Item'));
    addCertificateRequest({ ...data, itemId: item?.id, utMachineId: utMachine?.id, dftMachineId: dftMachine?.id });
    toast({
      title: 'Certificate Request Submitted',
      description: `Your request for ${subjectName} has been sent.`,
    });
    setIsOpen(false);
  };
  
  const subjectName = item ? `${item.name} (SN: ${item.serialNumber})` : (utMachine ? `${utMachine.machineName} (SN: ${utMachine.serialNumber})` : (dftMachine ? `${dftMachine.machineName} (SN: ${dftMachine.serialNumber})` : 'Item'));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Certificate</DialogTitle>
          <DialogDescription>
            Request a new certificate for {subjectName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Certificate Type</Label>
             <Controller name="requestType" control={form.control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select type..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Calibration Certificate">Calibration Certificate</SelectItem>
                        <SelectItem value="TP Inspection Certificate">TP Inspection Certificate</SelectItem>
                    </SelectContent>
                </Select>
            )}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
