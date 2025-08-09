
'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Vendor } from '@/lib/types';

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface EditVendorDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vendor: Vendor;
}

export default function EditVendorDialog({ isOpen, setIsOpen, vendor }: EditVendorDialogProps) {
  const { updateVendor } = useAppContext();
  const { toast } = useToast();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
  });

  useEffect(() => {
    if (vendor && isOpen) {
      form.reset({
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        address: vendor.address,
      });
    }
  }, [vendor, isOpen, form]);

  const onSubmit = (data: VendorFormValues) => {
    updateVendor({ ...vendor, ...data });
    toast({
      title: 'Vendor Updated',
      description: `${data.name} has been updated.`,
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vendor: {vendor.name}</DialogTitle>
          <DialogDescription>Update the details for this vendor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" {...form.register('contactPerson')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" {...form.register('contactEmail')} />
               {form.formState.errors.contactEmail && <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" {...form.register('contactPhone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...form.register('address')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
