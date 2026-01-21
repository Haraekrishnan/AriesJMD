
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
import type { JobCode } from '@/lib/types';

const jobCodeSchema = z.object({
  code: z.string().min(1, 'Job code is required'),
  details: z.string().min(1, 'Description is required'),
  jobNo: z.string().optional(),
});

type JobCodeFormValues = z.infer<typeof jobCodeSchema>;

interface EditJobCodeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  jobCode: JobCode;
}

export default function EditJobCodeDialog({ isOpen, setIsOpen, jobCode }: EditJobCodeDialogProps) {
  const { updateJobCode } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobCodeFormValues>({
    resolver: zodResolver(jobCodeSchema),
  });

  useEffect(() => {
    if (jobCode && isOpen) {
        form.reset({
            code: jobCode.code,
            details: jobCode.details,
            jobNo: jobCode.jobNo,
        });
    }
  }, [jobCode, isOpen, form]);

  const onSubmit = (data: JobCodeFormValues) => {
    updateJobCode({ ...jobCode, ...data });
    toast({ title: 'Job Code Updated', description: `The code "${data.code}" has been updated.` });
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
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Job Code</DialogTitle>
          <DialogDescription>Update the details for this job code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...form.register('code')} />
            {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Description</Label>
            <Input id="details" {...form.register('details')} />
            {form.formState.errors.details && <p className="text-xs text-destructive">{form.formState.errors.details.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobNo">Job Number (Optional)</Label>
            <Input id="jobNo" {...form.register('jobNo')} />
            {form.formState.errors.jobNo && <p className="text-xs text-destructive">{form.formState.errors.jobNo.message}</p>}
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
