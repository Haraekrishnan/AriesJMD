
'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { TransferList } from '../ui/transfer-list';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

const leaveSchema = z.object({
  manpowerIds: z.array(z.string()).min(1, 'Please select at least one employee.'),
  leaveType: z.enum(['Annual', 'Emergency']),
  dateRange: z.object({
      from: z.date({ required_error: 'Please select a start date.' }),
      to: z.date({ required_error: 'Please select an end date.' }),
  }, { required_error: 'Please select a date range.' }),
  remarks: z.string().optional(),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

interface LeaveReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function LeaveReportDialog({ isOpen, setIsOpen }: LeaveReportDialogProps) {
  const { manpowerProfiles, addLeaveForManpower, projects } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { manpowerIds: [], leaveType: 'Annual', remarks: '' },
  });

  const onSubmit = (data: LeaveFormValues) => {
    addLeaveForManpower(data.manpowerIds, data.leaveType, data.dateRange.from, data.dateRange.to, data.remarks);
    toast({ title: 'Leave Planned', description: `Leave has been recorded for ${data.manpowerIds.length} employee(s).` });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ manpowerIds: [], leaveType: 'Annual', remarks: '' });
    setIsOpen(open);
  };

  const manpowerOptions = useMemo(() => {
    return manpowerProfiles
      .filter(p => p.status === 'Working')
      .map(p => {
          const project = projects.find(proj => proj.id === p.projectId);
          const projectText = project ? `, ${project.name}` : '';
          return { 
            value: p.id, 
            label: `${p.name} (${p.trade}${projectText})`
        };
    });
  }, [manpowerProfiles, projects]);

  const filteredManpowerOptions = useMemo(() => {
    if (!searchTerm) {
      return manpowerOptions;
    }
    return manpowerOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [manpowerOptions, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Plan Manpower Leave</DialogTitle>
          <DialogDescription>Select employees and specify their leave period.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employees</Label>
            <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search employees..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Controller
                name="manpowerIds"
                control={form.control}
                render={({ field }) => (
                    <TransferList
                        options={filteredManpowerOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        availableTitle="Working Employees"
                        selectedTitle="Going on Leave"
                    />
                )}
            />
             {form.formState.errors.manpowerIds && <p className="text-xs text-destructive">{form.formState.errors.manpowerIds.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Leave Type</Label>
                <Controller
                    name="leaveType"
                    control={form.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Annual">Annual</SelectItem>
                                <SelectItem value="Emergency">Emergency</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
             </div>
             <div className="space-y-2">
                <Label>Leave Period</Label>
                <Controller
                    name="dateRange"
                    control={form.control}
                    render={({ field }) => (
                       <DateRangePicker date={field.value} onDateChange={field.onChange} />
                    )}
                />
                 {form.formState.errors.dateRange && <p className="text-xs text-destructive">{form.formState.errors.dateRange.message}</p>}
             </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks / Reason</Label>
            <Textarea {...form.register('remarks')} placeholder="Add any notes for this leave plan..." />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Leave Plan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
