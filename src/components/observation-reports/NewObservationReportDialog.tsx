

'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DatePickerInput } from '../ui/date-picker-input';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Role } from '@/lib/types';


const reportSchema = z.object({
  visitDate: z.date({ required_error: "Date is required" }),
  visitTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
  projectId: z.string().min(1, 'Project is required'),
  location: z.string().min(1, 'Location is required'),
  supervisorId: z.string().min(1, 'Supervisor is required'),
  siteInChargeName: z.string().min(1, 'Site In-charge is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  goodPractices: z.string().optional(),
  unsafeActs: z.string().optional(),
  unsafeConditions: z.string().optional(),
});

type FormValues = z.infer<typeof reportSchema>;

interface NewObservationReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewObservationReportDialog({ isOpen, setIsOpen }: NewObservationReportDialogProps) {
  const { addObservationReport, projects, users } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
  });

  const supervisors = useMemo(() => {
    const supervisorRoles: Role[] = ['Supervisor', 'RA Level 3', 'Senior Safety Supervisor'];
    return users.filter(u => supervisorRoles.includes(u.role));
  }, [users]);
  
  const siteInCharges = useMemo(() => {
    const inChargeRoles: Role[] = ['Project Coordinator', 'Manager'];
    return users.filter(u => inChargeRoles.includes(u.role));
  }, [users]);

  const onSubmit = async (data: FormValues) => {
    try {
      addObservationReport({
        ...data,
        visitDate: data.visitDate.toISOString(),
      });
      toast({ title: 'Report Submitted', description: 'Your safety observation report has been saved.' });
      setIsOpen(false);
    } catch (error) {
       toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive'});
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Observation Report</DialogTitle>
          <DialogDescription>Fill in the details of your site observation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-6 -mr-6">
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Visit Date</Label>
                            <Controller name="visitDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                             {form.formState.errors.visitDate && <p className="text-xs text-destructive">{form.formState.errors.visitDate.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Visit Time</Label>
                            <Input type="time" {...form.register('visitTime')} />
                             {form.formState.errors.visitTime && <p className="text-xs text-destructive">{form.formState.errors.visitTime.message}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Project / Location</Label>
                            <Controller name="projectId" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                                    <SelectContent>
                                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}/>
                            {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Specific Location / Tank No.</Label>
                            <Input {...form.register('location')} />
                            {form.formState.errors.location && <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Supervisor / L3 Name</Label>
                            <Controller name="supervisorId" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger>
                                    <SelectContent>
                                        {supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}/>
                             {form.formState.errors.supervisorId && <p className="text-xs text-destructive">{form.formState.errors.supervisorId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Site In-charge Name</Label>
                             <Controller name="siteInChargeName" control={form.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select Site In-charge" /></SelectTrigger>
                                    <SelectContent>
                                        {siteInCharges.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}/>
                             {form.formState.errors.siteInChargeName && <p className="text-xs text-destructive">{form.formState.errors.siteInChargeName.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Job Description</Label>
                        <Input {...form.register('jobDescription')} />
                        {form.formState.errors.jobDescription && <p className="text-xs text-destructive">{form.formState.errors.jobDescription.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Good Practices Observed</Label>
                        <Textarea {...form.register('goodPractices')} rows={4} />
                    </div>
                    <div className="space-y-2">
                        <Label>Unsafe Acts Observed</Label>
                        <Textarea {...form.register('unsafeActs')} rows={4} />
                    </div>
                    <div className="space-y-2">
                        <Label>Unsafe Conditions Observed</Label>
                        <Textarea {...form.register('unsafeConditions')} rows={4} />
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Submit Report</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    