
'use client';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Download, ChevronsUpDown, Check, Minus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useEffect, useMemo, useState } from 'react';
import { JobProgress, SorItem, JOB_PROGRESS_STEPS, ServiceCode } from '@/lib/types';
import { usePlanner } from '@/contexts/planner-provider';
import { format, parseISO } from 'date-fns';
import { generateAbstractSheetExcel, generateAbstractSheetPdf } from './generateAbstractSheet';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';

const sorItemSchema = z.object({
  id: z.string(),
  serviceCode: z.string().min(1, "Service Code is required"),
  scopeDescription: z.string().min(1, "Scope Description is required"),
  uom: z.string().min(1, "UOM is required"),
  rate: z.coerce.number().min(0, "Rate must be non-negative"),
  qtyPlanned: z.coerce.number().optional().default(0),
  qtyExecuted: z.coerce.number().optional().default(0),
  eicApprovedQty: z.coerce.number().optional().default(0),
  workPermitNo: z.string().optional(),
  pmWorkOrderNo: z.string().optional(),
  dateWorkCompleted: z.date().optional().nullable(),
  provision: z.string().optional(),
  remarks: z.string().optional(),
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
  assigneeId: z.string().optional(),
  // Builder Details
  plantRegNo: z.string().optional(),
  ariesJobId: z.string().optional(),
  sorItems: z.array(sorItemSchema).optional(),
});

type BuilderFormValues = z.infer<typeof builderSchema>;

interface JmsBuilderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  job?: JobProgress | null;
}

const generateDefaultSorItem = (): SorItem => ({
  id: `sor-${Date.now()}`,
  serviceCode: '',
  scopeDescription: '',
  uom: '',
  rate: 0,
  qtyPlanned: 0,
  qtyExecuted: 0,
  eicApprovedQty: 0,
  workPermitNo: '',
  pmWorkOrderNo: '',
  dateWorkCompleted: null,
  provision: '',
  remarks: '',
});


export default function JmsBuilderDialog({ isOpen, setIsOpen, job }: JmsBuilderDialogProps) {
  const { user, users, getVisibleUsers } = useAuth();
  const { projects, workOrders, serviceCodes } = useGeneral();
  const { createJobProgress, updateJobProgress } = usePlanner();
  const { toast } = useToast();
  const isEditMode = !!job;
  const [popoverOpenState, setPopoverOpenState] = useState<Record<number, boolean>>({});

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
                ariesJobId: job.ariesJobId || '',
                sorItems: job.sorItems?.map(item => ({
                  ...item,
                  dateWorkCompleted: item.dateWorkCompleted ? parseISO(item.dateWorkCompleted) : null,
                })) || [],
            });
        } else {
            form.reset({
                title: '', projectId: '', plantUnit: '', workOrderNo: '',
                foNo: '', jmsNo: '', amount: undefined, dateFrom: null, dateTo: null,
                assigneeId: '', plantRegNo: '', ariesJobId: '', sorItems: [],
            });
        }
    }
  }, [job, isOpen, form]);

  const onSubmit = (data: BuilderFormValues) => {
    if (isEditMode && job) {
        updateJobProgress(job.id, {
            ...data,
            sorItems: data.sorItems?.map(item => ({ ...item, dateWorkCompleted: item.dateWorkCompleted?.toISOString() || null })),
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
            sorItems: data.sorItems?.map(item => ({ ...item, dateWorkCompleted: item.dateWorkCompleted?.toISOString() || null })),
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
  
  const handleServiceCodeSelect = (index: number, sc: ServiceCode) => {
    form.setValue(`sorItems.${index}.serviceCode`, sc.code);
    form.setValue(`sorItems.${index}.scopeDescription`, sc.description);
    form.setValue(`sorItems.${index}.uom`, sc.uom);
    form.setValue(`sorItems.${index}.rate`, sc.rate);
    form.setValue(`sorItems.${index}.provision`, sc.provision || '');
    setPopoverOpenState(prev => ({...prev, [index]: false}));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-screen h-screen max-w-none rounded-none border-0 flex flex-col">
        <DialogHeader>
            <div className="flex justify-between items-center">
                <div>
                    <DialogTitle>JMS Builder</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Editing JMS: "${job.title}"` : "Create a new JMS with its abstract sheet details."}
                    </DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <Minus className="h-4 w-4" />
                </Button>
            </div>
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
            <div><Label>Aries Job#</Label><Input {...form.register('ariesJobId')} /></div>
            <div>
              <Label>WO / ARC No.</Label>
              <Controller
                control={form.control}
                name="workOrderNo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead className="min-w-[150px]">Service Code</TableHead>
                    <TableHead className="min-w-[250px]">Service Description</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Qty Planned</TableHead>
                    <TableHead>Qty Executed</TableHead>
                    <TableHead>EIC Appr. Qty</TableHead>
                    <TableHead>Work Permit No</TableHead>
                    <TableHead>PM Work Order No</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead>Provision</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    return (
                        <TableRow key={field.id}>
                            <TableCell className="font-semibold text-center">{index + 1}</TableCell>
                            <TableCell>
                                <Controller name={`sorItems.${index}.serviceCode`} control={form.control} render={({ field: controllerField }) => (
                                    <Popover open={popoverOpenState[index]} onOpenChange={(open) => setPopoverOpenState(prev => ({...prev, [index]: open}))}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                                                <span className="truncate">{controllerField.value || "Select..."}</span>
                                                <ChevronsUpDown className="ml-auto h-3 w-3"/>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command><CommandInput placeholder="Search codes..."/><CommandList><CommandEmpty>No codes found.</CommandEmpty>
                                                <CommandGroup>
                                                    {(serviceCodes || []).map(sc => (
                                                        <CommandItem key={sc.id} value={sc.code} onSelect={() => handleServiceCodeSelect(index, sc)}>
                                                            <Check className={cn("mr-2 h-4 w-4", sc.code === controllerField.value ? "opacity-100" : "opacity-0")} />
                                                            {sc.code}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList></Command>
                                        </PopoverContent>
                                    </Popover>
                                )}/>
                            </TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.scopeDescription`)} readOnly className="h-8 text-xs"/></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.uom`)} readOnly className="h-8 text-xs"/></TableCell>
                            <TableCell><Input type="number" {...form.register(`sorItems.${index}.rate`)} step="0.01" readOnly className="h-8 text-xs"/></TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    {...form.register(`sorItems.${index}.qtyPlanned`)}
                                    className="h-8 text-xs"
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                        form.setValue(`sorItems.${index}.qtyPlanned`, value);
                                        form.setValue(`sorItems.${index}.qtyExecuted`, value);
                                        form.setValue(`sorItems.${index}.eicApprovedQty`, value);
                                    }}
                                />
                            </TableCell>
                            <TableCell><Input type="number" {...form.register(`sorItems.${index}.qtyExecuted`)} className="h-8 text-xs"/></TableCell>
                            <TableCell><Input type="number" {...form.register(`sorItems.${index}.eicApprovedQty`)} className="h-8 text-xs"/></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.workPermitNo`)} className="h-8 text-xs"/></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.pmWorkOrderNo`)} className="h-8 text-xs"/></TableCell>
                            <TableCell><Controller name={`sorItems.${index}.dateWorkCompleted`} control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.provision`)} readOnly className="h-8 text-xs"/></TableCell>
                            <TableCell><Input {...form.register(`sorItems.${index}.remarks`)} className="h-8 text-xs"/></TableCell>
                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                        </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
            <div className="flex justify-between items-center p-2">
                <Button type="button" variant="outline" size="sm" onClick={() => append(generateDefaultSorItem())}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <div className="font-bold text-lg">
                    Grand Total: {watchedItems.reduce((acc, item) => acc + ((item.eicApprovedQty || item.qtyExecuted || 0) * (item.rate || 0)), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
            </div>
          
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
