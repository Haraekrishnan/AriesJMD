
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

const leaveLogSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  countOnLeave: z.coerce.number().min(0, 'Leave count must be non-negative'),
  personOnLeaveName: z.string().optional(),
});

type LeaveLogFormValues = z.infer<typeof leaveLogSchema>;

interface LogLeaveDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function LogLeaveDialog({ isOpen, setIsOpen }: LogLeaveDialogProps) {
  const { user, projects, addManpowerLog } = useAppContext();
  const { toast } = useToast();

  const form = useForm<LeaveLogFormValues>({
    resolver: zodResolver(leaveLogSchema),
    defaultValues: {
      projectId: user?.projectId || '',
      countOnLeave: 0,
      personOnLeaveName: '',
    },
  });

  const isSupervisor = user?.role === 'Supervisor' || user?.role === 'Junior Supervisor';

  const onSubmit = (data: LeaveLogFormValues) => {
    addManpowerLog({
        projectId: data.projectId,
        countOnLeave: data.countOnLeave,
        personOnLeaveName: data.personOnLeaveName,
        reason: 'Daily Leave Entry'
    });
    toast({ title: 'Daily Leave Logged', description: `Today's leave count has been updated.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({
      projectId: user?.projectId || '',
      countOnLeave: 0,
      personOnLeaveName: '',
    });
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Daily Leave</DialogTitle>
          <DialogDescription>Record or overwrite the leave count for today. This will not affect the total manpower count.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label>Project / Location</Label>
            <Controller
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSupervisor && !!user?.projectId}>
                  <SelectTrigger><SelectValue placeholder="Select location..."/></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="countOnLeave">On Leave</Label>
              <Input id="countOnLeave" type="number" {...form.register('countOnLeave')} />
              {form.formState.errors.countOnLeave && <p className="text-xs text-destructive">{form.formState.errors.countOnLeave.message}</p>}
            </div>
             <div>
              <Label htmlFor="personOnLeaveName">Person on Leave Name(s)</Label>
              <Input id="personOnLeaveName" {...form.register('personOnLeaveName')} placeholder="e.g., Sam" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Log Leave</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
