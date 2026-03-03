
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const buildingSchema = z.object({
  buildingNumber: z.string().min(1, 'Building number is required'),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface AddBuildingDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddBuildingDialog({ isOpen, setIsOpen }: AddBuildingDialogProps) {
  const { addBuilding } = useAppContext();
  const { toast } = useToast();

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
  });

  const onSubmit = (data: BuildingFormValues) => {
    addBuilding(data.buildingNumber);
    toast({ title: 'Building Added', description: `Building ${data.buildingNumber} has been added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Building</DialogTitle>
          <DialogDescription>Enter the details for the new building.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="buildingNumber">Building Number/Name</Label>
            <Input id="buildingNumber" {...form.register('buildingNumber')} placeholder="e.g., A1" />
            {form.formState.errors.buildingNumber && <p className="text-xs text-destructive">{form.formState.errors.buildingNumber.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Building</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
