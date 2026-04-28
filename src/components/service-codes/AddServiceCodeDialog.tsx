
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const serviceCodeSchema = z.object({
  code: z.string().min(1, 'Service code is required'),
  description: z.string().min(1, 'Description is required'),
  uom: z.string().min(1, 'UOM is required'),
  rate: z.coerce.number().min(0, 'Rate must be non-negative'),
  provision: z.string().optional(),
});

type ServiceCodeFormValues = z.infer<typeof serviceCodeSchema>;

interface AddServiceCodeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddServiceCodeDialog({ isOpen, setIsOpen }: AddServiceCodeDialogProps) {
  const { addServiceCode } = useGeneral();
  const { toast } = useToast();

  const form = useForm<ServiceCodeFormValues>({
    resolver: zodResolver(serviceCodeSchema),
  });

  const onSubmit = (data: ServiceCodeFormValues) => {
    addServiceCode(data);
    toast({ title: 'Service Code Added', description: `Code "${data.code}" has been added.` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Service Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Service Code</Label>
            <Input id="code" {...form.register('code')} />
            {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Service Description</Label>
            <Input id="description" {...form.register('description')} />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uom">UOM</Label>
              <Input id="uom" {...form.register('uom')} />
              {form.formState.errors.uom && <p className="text-xs text-destructive">{form.formState.errors.uom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate (INR)</Label>
              <Input id="rate" type="number" step="0.01" {...form.register('rate')} />
              {form.formState.errors.rate && <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provision">Provision (Optional)</Label>
            <Input id="provision" {...form.register('provision')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Code</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
