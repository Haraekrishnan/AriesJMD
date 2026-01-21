
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

const jobCodeSchema = z.object({
  code: z.string().min(1, 'Job code is required'),
  details: z.string().min(1, 'Description is required'),
  jobNo: z.string().optional(),
});

type JobCodeFormValues = z.infer<typeof jobCodeSchema>;

interface AddJobCodeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddJobCodeDialog({ isOpen, setIsOpen }: AddJobCodeDialogProps) {
  const { addJobCode } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobCodeFormValues>({
    resolver: zodResolver(jobCodeSchema),
  });

  const onSubmit = (data: JobCodeFormValues) => {
    addJobCode(data);
    toast({ title: 'Job Code Added', description: `The code "${data.code}" has been added.` });
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
          <DialogTitle>Add New Job Code</DialogTitle>
          <DialogDescription>Create a new code for use in the job record sheet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...form.register('code')} placeholder="e.g., ZT" />
            {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Description</Label>
            <Input id="details" {...form.register('details')} placeholder="e.g., SEZ TEST JOB" />
            {form.formState.errors.details && <p className="text-xs text-destructive">{form.formState.errors.details.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobNo">Job Number (Optional)</Label>
            <Input id="jobNo" {...form.register('jobNo')} placeholder="e.g., IRA 1500" />
            {form.formState.errors.jobNo && <p className="text-xs text-destructive">{form.formState.errors.jobNo.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Job Code</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
