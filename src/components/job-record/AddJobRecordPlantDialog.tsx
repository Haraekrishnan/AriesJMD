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

const plantSchema = z.object({
  name: z.string().min(1, 'Plant name is required'),
});

type PlantFormValues = z.infer<typeof plantSchema>;

interface AddJobRecordPlantDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddJobRecordPlantDialog({ isOpen, setIsOpen }: AddJobRecordPlantDialogProps) {
  const { addJobRecordPlant } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = (data: PlantFormValues) => {
    addJobRecordPlant(data.name);
    toast({ title: 'Plant Added', description: `The plant "${data.name}" has been added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Plant</DialogTitle>
          <DialogDescription>Create a new plant/tab for the job record sheet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plant Name</Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., New Plant Site" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Plant</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
