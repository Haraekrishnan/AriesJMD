
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
import type { Building } from '@/lib/types';
import { useEffect } from 'react';

const buildingSchema = z.object({
  buildingNumber: z.string().min(1, 'Building number is required'),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface EditBuildingDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  building: Building;
}

export default function EditBuildingDialog({ isOpen, setIsOpen, building }: EditBuildingDialogProps) {
  const { updateBuilding } = useAppContext();
  const { toast } = useToast();

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
  });

  useEffect(() => {
    if (building && isOpen) {
        form.reset({
            buildingNumber: building.buildingNumber,
        });
    }
  }, [building, isOpen, form]);

  const onSubmit = (data: BuildingFormValues) => {
    updateBuilding({ ...building, ...data });
    toast({ title: 'Building Updated', description: `Building has been updated.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Building</DialogTitle>
          <DialogDescription>Update the building number/name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="buildingNumber">Building Number/Name</Label>
            <Input id="buildingNumber" {...form.register('buildingNumber')} />
            {form.formState.errors.buildingNumber && <p className="text-xs text-destructive">{form.formState.errors.buildingNumber.message}</p>}
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
