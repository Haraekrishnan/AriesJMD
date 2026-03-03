'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { JobProgress, JobStep } from '@/lib/types';

const returnSchema = z.object({
  reason: z.string().min(10, "A detailed reason is required to return the step."),
});
  
type ReturnFormValues = z.infer<typeof returnSchema>;
  
interface ReturnStepDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
    step: JobStep;
}

export default function ReturnStepDialog({ isOpen, setIsOpen, job, step }: ReturnStepDialogProps) {
    const { returnJobStep } = useAppContext();
    const { toast } = useToast();

    const form = useForm<ReturnFormValues>({
        resolver: zodResolver(returnSchema),
        defaultValues: { reason: '' }
    });

    const onSubmit = (data: ReturnFormValues) => {
        returnJobStep(job.id, step.id, data.reason);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Return Step: {step.name}</DialogTitle>
                    <DialogDescription>Provide a reason for returning this step. It will become unassigned.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Returning</Label>
                        <Textarea id="reason" {...form.register('reason')} />
                        {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Return Step</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
