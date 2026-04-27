'use client';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Download } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useEffect, useMemo, useState } from 'react';
import { JobProgress, SorItem, JOB_PROGRESS_STEPS } from '@/lib/types';
import { usePlanner } from '@/contexts/planner-provider';
import { format, parseISO } from 'date-fns';
import { generateAbstractSheetExcel, generateAbstractSheetPdf } from './generateAbstractSheet';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const sorItemSchema = z.object({
  id: z.string(),
  ariesJobId: z.string().min(1, "Aries Job# is required"),
  rilApprovedQuantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  itemCode: z.string().min(1, "Item Code is required"),
  scopeDescription: z.string().min(1, "Scope Description is required"),
  uom: z.string().min(1, "UOM is required"),
  unitRate: z.coerce.number().min(0, "Unit Rate must be non-negative"),
});

const builderSchema = z.object({
  // Job Details
  title: z.string().min(3, 'Job description is required'),
  projectId: z.string().min(1, 'Project is required'),
  plantUnit: z.string().optional(),
  workOrderNo: z.string().optional(),
  foNo: z.string().optional(),
  jmsNo: z.string().optional(),
  amount: z.coerce.number().optional(),
  dateFrom: z.date().optional().nullable(),
  dateTo: z.date().optional().nullable(),
  // Initial Step
  assigneeId: z.string().min(1, 'Initial assignee is required'),
  // Builder Details
  plantRegNo: z.string().optional(),
  arcOtcWoNo: z.string().optional(),
  sorItems: z.array(sorItemSchema).optional(),
});

type BuilderFormValues = z.infer<typeof builderSchema>;

interface JmsBuilderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  job?: JobProgress | null;
}

export default function JmsBuilderDialog({ isOpen, setIsOpen, job }: JmsBuilderDialogProps) {
  const { user, users, getVisibleUsers } = useAuth();
  const { projects, workOrders } = useGeneral();
  const { createJobProgress, updateJobProgress } = usePlanner();
  const { toast } = useToast();
  const isEditMode = !!job;

  const assignableUsers = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);

  const form = useForm<BuilderFormValues>({
    resolver: zodResolver(builderSchema),
    defaultValues: { sorItems: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sorItems",
  });
  
  const watchedItems = form.watch('sorItems');

  useEffect(() => {
    if (isOpen) {
        if (job) {
            form.reset({
                title: job.title,
                projectId: job.projectId,
                plantUnit: job.plantUnit || '',
                workOrderNo: job.workOrderNo || '',
                foNo: job.foNo || '',
                jmsNo: job.jmsNo || '',
                amount: job.amount || undefined,
                dateFrom: job.dateFrom ? parseISO(job.dateFrom) : null,
                dateTo: job.dateTo ? parseISO(job.dateTo) : null,
                assigneeId: job.steps[0]?.assigneeId || '',
                plantRegNo: job.plantRegNo || '',
                arcOtcWoNo: job.arcOtcWoNo || '',
                sorItems: job.sorItems || [],
            });
        } else {
            form.reset({
                title: '', projectId: '', plantUnit: '', workOrderNo: '',
                foNo: '', jmsNo: '', amount: undefined, dateFrom: null, dateTo: null,
                assigneeId: '', plantRegNo: '', arcOtcWoNo: '', sorItems: [],
            });
        }
    }
  }, [job, isOpen, form]);

  const onSubmit = (data: BuilderFormValues) => {
    if (isEditMode && job) {
        updateJobProgress(job.id, {
            ...data,
            sorItems: data.sorItems || [],
        });
        toast({ title: "JMS Data Updated", description: "The SOR items and details have been updated." });
    } else {
         createJobProgress({
            ...data,
            steps: [{
                name: 'JMS created',
                assigneeId: data.assigneeId,
                description: 'Initial step from builder'
            }],
        });
        toast({ title: "JMS Created", description: "The new JMS has been added to the tracker." });
    }
    setIsOpen(false);
  };
  
  const handleDownload = (format: 'excel' | 'pdf') => {
    if (!job) {
        toast({ title: "Cannot Download", description: "Please save the JMS before downloading.", variant: 'destructive'});
        return;
    }
    if (format === 'excel') {
        generateAbstractSheetExcel(job, form.getValues());
    } else {
        generateAbstractSheetPdf(job, form.getValues());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>JMS Builder</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Editing JMS: "${job.title}"` : "Create a new JMS with its abstract sheet details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Job Details Fields */}
            <div className="md:col-span-2"><Label>Job Description</Label><Input {...form.register('title')} /></div>
            <div><Label>Project</Label>
              <Controller
                control={form.control} name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
            </div>
            <div><Label>Plant/Unit</Label><Input {...form.register('plantUnit')} /></div>
            <div><Label>JMS No.</Label><Input {...form.register('jmsNo')} /></div>
            <div>
              <Label>WO / ARC No.</Label>
              <Controller
                control={form.control}
                name="workOrderNo"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('arcOtcWoNo', value);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {workOrders.map((wo) => (
                        <SelectItem key={wo.id} value={wo.number}>{wo.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div><Label>FO No.</Label><Input {...form.register('foNo')} /></div>
            <div><Label>Value</Label><Input type="number" {...form.register('amount')} /></div>
            <div><Label>Plant Reg No.</Label><Input {...form.register('plantRegNo')} /></div>
             <div><Label>Start Date</Label><Controller name="dateFrom" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
             <div><Label>End Date</Label><Controller name="dateTo" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
              {!isEditMode && (
                <div><Label>Initial Assignee</Label>
                    <Controller control={form.control} name="assigneeId" render={({ field }) => (
                         <Select value={field.value} onValueChange={field.onChange}>
                             <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                             <SelectContent>{assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                         </Select>
                    )} />
                    {form.formState.errors.assigneeId && <p className="text-destructive text-xs mt-1">{form.formState.errors.assigneeId.message}</p>}
                </div>
            )}
          </div>

          <div className="flex-1 border rounded-lg overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-1/12">Aries Job#</TableHead>
                    <TableHead className="w-1/12">Qty</TableHead>
                    <TableHead className="w-1/12">Item Code</TableHead>
                    <TableHead className="w-4/12">Scope Description</TableHead>
                    <TableHead className="w-1/12">UOM</TableHead>
                    <TableHead className="w-1/12">Unit Rate</TableHead>
                    <TableHead className="w-1/12">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const quantity = watchedItems[index]?.rilApprovedQuantity || 0;
                    const rate = watchedItems[index]?.unitRate || 0;
                    const total = quantity * rate;
                    return (
                        <TableRow key={field.id}>
                            <TableCell><Input {...form.register(`sorItems.${index}.ariesJobId`)} /></TableCell>
                            <TableCell><Input type="number" {...form.register(`sorItems.${index}.rilApprovedQuantity`)} /></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.itemCode`)} /></TableCell>
                            <TableCell><Textarea {...form.register(`sorItems.${index}.scopeDescription`)} rows={2} /></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.uom`)} /></TableCell>
                            <TableCell><Input type="number" step="0.01" {...form.register(`sorItems.${index}.unitRate`)} /></TableCell>
                            <TableCell className="font-semibold text-right">{total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                        </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
            <div className="flex justify-end p-2 font-bold text-lg">
                Grand Total: {watchedItems.reduce((acc, item) => acc + (item.rilApprovedQuantity * item.unitRate), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `sor-${Date.now()}`, ariesJobId: '', rilApprovedQuantity: 1, itemCode: '', scopeDescription: '', uom: 'MDY', unitRate: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          
          <DialogFooter className="pt-4 mt-auto border-t justify-between">
             <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => handleDownload('excel')} disabled={!isEditMode}><Download className="mr-2 h-4 w-4" /> Abstract Excel</Button>
                <Button type="button" variant="outline" onClick={() => handleDownload('pdf')} disabled={!isEditMode}><Download className="mr-2 h-4 w-4" /> Abstract PDF</Button>
             </div>
             <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">{isEditMode ? 'Save Changes' : 'Create JMS'}</Button>
             </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
