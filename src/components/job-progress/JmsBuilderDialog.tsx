
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
import { useEffect, useMemo } from 'react';
import { JobProgress, SorItem } from '@/lib/types';
import { usePlanner } from '@/contexts/planner-provider';
import { format, parseISO } from 'date-fns';
import { generateAbstractSheetExcel, generateAbstractSheetPdf } from './generateAbstractSheet';

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
  plantRegNo: z.string().optional(),
  arcOtcWoNo: z.string().optional(),
  sorItems: z.array(sorItemSchema),
});

type BuilderFormValues = z.infer<typeof builderSchema>;

interface JmsBuilderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  job: JobProgress;
}

export default function JmsBuilderDialog({ isOpen, setIsOpen, job }: JmsBuilderDialogProps) {
  const { updateJobProgress } = usePlanner();
  const { toast } = useToast();

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
    if (job) {
      form.reset({
        plantRegNo: job.plantRegNo || '',
        arcOtcWoNo: job.arcOtcWoNo || '',
        sorItems: job.sorItems || [],
      });
    }
  }, [job, form]);

  const onSubmit = (data: BuilderFormValues) => {
    updateJobProgress(job.id, {
      plantRegNo: data.plantRegNo,
      arcOtcWoNo: data.arcOtcWoNo,
      sorItems: data.sorItems,
    });
    toast({ title: "JMS Data Saved", description: "The SOR items and details have been updated." });
    setIsOpen(false);
  };
  
  const handleDownload = (format: 'excel' | 'pdf') => {
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
          <DialogTitle>JMS Abstract Sheet Builder</DialogTitle>
          <DialogDescription>Manage the scope of work items for "{job.title}".</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><Label>Plant/Unit</Label><Input value={job.plantUnit || ''} readOnly /></div>
            <div><Label>Duration</Label><Input value={job.dateFrom ? format(parseISO(job.dateFrom), 'dd MMM yyyy') : 'N/A'} readOnly /></div>
            <div><Label>Plant Reg No.</Label><Input {...form.register('plantRegNo')} /></div>
            <div><Label>ARC/OTC W.O.No.</Label><Input {...form.register('arcOtcWoNo')} /></div>
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
                <Button type="button" variant="outline" onClick={() => handleDownload('excel')}><Download className="mr-2 h-4 w-4" /> Abstract Excel</Button>
                <Button type="button" variant="outline" onClick={() => handleDownload('pdf')}><Download className="mr-2 h-4 w-4" /> Abstract PDF</Button>
             </div>
             <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
             </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
