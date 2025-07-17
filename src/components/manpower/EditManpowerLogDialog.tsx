
'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { ManpowerLog } from '@/lib/types';
import { format } from 'date-fns';

const logSchema = z.object({
  countIn: z.coerce.number().min(0, 'Count In must be non-negative'),
  personInName: z.string().optional(),
  countOut: z.coerce.number().min(0, 'Count Out must be non-negative'),
  personOutName: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

type LogFormValues = z.infer<typeof logSchema>;

interface EditManpowerLogDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  log: ManpowerLog;
}

export default function EditManpowerLogDialog({ isOpen, setIsOpen, log }: EditManpowerLogDialogProps) {
  const { user, projects, updateManpowerLog } = useAppContext();
  const { toast } = useToast();

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
  });

  useEffect(() => {
    if (log) {
        form.reset({
            countIn: log.countIn,
            personInName: log.personInName || '',
            countOut: log.countOut,
            personOutName: log.personOutName || '',
            reason: log.reason
        });
    }
  }, [log, form]);

  const onSubmit = async (data: LogFormValues) => {
    await updateManpowerLog(log.id, data);
    toast({ title: 'Manpower Log Updated', description: `The log for ${log.date} has been updated.` });
    setIsOpen(false);
  };
  
  const projectName = projects.find(p => p.id === log.projectId)?.name || 'Unknown Project';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Manpower Log</DialogTitle>
          <DialogDescription>
            Editing log for {projectName} on {format(new Date(log.date), 'dd LLL, yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="countIn">Manpower In</Label>
              <Input id="countIn" type="number" {...form.register('countIn')} />
              {form.formState.errors.countIn && <p className="text-xs text-destructive">{form.formState.errors.countIn.message}</p>}
            </div>
            <div>
              <Label htmlFor="personInName">Person In Name(s)</Label>
              <Input id="personInName" {...form.register('personInName')} placeholder="e.g., John, Jane" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="countOut">Manpower Out</Label>
              <Input id="countOut" type="number" {...form.register('countOut')} />
              {form.formState.errors.countOut && <p className="text-xs text-destructive">{form.formState.errors.countOut.message}</p>}
            </div>
             <div>
              <Label htmlFor="personOutName">Person Out Name(s)</Label>
              <Input id="personOutName" {...form.register('personOutName')} placeholder="e.g., Peter" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason for Change</Label>
            <Textarea id="reason" {...form.register('reason')} placeholder="e.g., Full attendance, 1 sick leave"/>
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
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
