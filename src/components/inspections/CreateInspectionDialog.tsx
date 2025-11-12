'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import type { InventoryItem } from '@/lib/types';
import { format, addMonths } from 'date-fns';
import { DatePickerInput } from '../ui/date-picker-input';

const findingOptions = ['G', 'TM', 'TR', 'R', 'N/A'];
const verdictOptions = ['This equipment is fit to remain in service (PASS)', 'This equipment is NOT fit to remain in service (FAIL)'];

const checklistSchema = z.object({
  itemId: z.string().min(1, 'Please select an item to inspect.'),
  inspectionDate: z.date({ required_error: "Inspection date is required." }),
  knownHistory: z.string().optional(),
  preliminaryObservation: z.string().min(1),
  conditionSheath: z.string().min(1),
  conditionCore: z.string().min(1),
  sheathsAndTerminations: z.string().min(1),
  otherComponents: z.string().min(1),
  comments: z.string().optional(),
  remarks: z.string().optional(),
  verdict: z.string().min(1),
  reviewedById: z.string().min(1, "Please select a reviewer."),
});

type ChecklistFormValues = z.infer<typeof checklistSchema>;

interface CreateInspectionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const FindingSelect = ({ control, name }: { control: any, name: any }) => (
    <Controller
        name={name}
        control={control}
        render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {findingOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
    />
);

export default function CreateInspectionDialog({ isOpen, setIsOpen }: CreateInspectionDialogProps) {
  const { user, inventoryItems, addInspectionChecklist, users } = useAppContext();
  const { toast } = useToast();

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      inspectionDate: new Date(),
      preliminaryObservation: 'G',
      conditionSheath: 'G',
      conditionCore: 'G',
      sheathsAndTerminations: 'G',
      otherComponents: 'G',
      remarks: 'Inspection of this equipment has been carried out as per the manufacturer technical notice/guidelines.',
      verdict: verdictOptions[0]
    },
  });

  const selectedItemId = form.watch('itemId');
  const selectedItem = useMemo(() => inventoryItems.find(i => i.id === selectedItemId), [selectedItemId, inventoryItems]);

  const reviewers = useMemo(() => {
    return users.filter(u => ['Admin', 'Project Coordinator', 'Supervisor', 'Senior Safety Supervisor', 'HSE', 'PPE Inspector'].includes(u.role));
  }, [users]);
  
  const onSubmit = (data: ChecklistFormValues) => {
    if (!selectedItem || !user) return;
    
    const nextDueDate = addMonths(data.inspectionDate, 6);

    addInspectionChecklist({
      ...data,
      itemId: selectedItem.id,
      inspectionDate: data.inspectionDate.toISOString(),
      nextDueDate: nextDueDate.toISOString(),
      inspectedById: user.id
    });

    toast({ title: 'Inspection Checklist Created', description: 'The new checklist has been saved.' });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if(!open) form.reset();
    setIsOpen(open);
  }

  const renderField = (label: string, fieldName: keyof ChecklistFormValues) => (
     <div className="grid grid-cols-[1fr,auto] items-center">
        <p className="text-sm">{label}</p>
        <FindingSelect control={form.control} name={fieldName} />
     </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>New Inspection Checklist</DialogTitle>
          <DialogDescription>Fill out the inspection details for the selected equipment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Select Item</Label>
                    <Controller
                        name="itemId"
                        control={form.control}
                        render={({ field }) => (
                           <Select onValueChange={field.onChange} value={field.value}>
                               <SelectTrigger><SelectValue placeholder="Select an inventory item..." /></SelectTrigger>
                               <SelectContent>
                                   {inventoryItems.filter(i => i.category === 'General').map(item => (
                                       <SelectItem key={item.id} value={item.id}>{item.name} (SN: {item.serialNumber})</SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                        )}
                    />
                    {form.formState.errors.itemId && <p className="text-xs text-destructive">{form.formState.errors.itemId.message}</p>}
                </div>

                {selectedItem && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm p-4 border rounded-md">
                    <div><span className="font-semibold">Aries ID:</span> {selectedItem.ariesId || 'N/A'}</div>
                    <div><span className="font-semibold">Serial No:</span> {selectedItem.serialNumber}</div>
                    <div><span className="font-semibold">Model:</span> {selectedItem.name}</div>
                    <div><span className="font-semibold">Date of Purchase:</span> {selectedItem.inspectionDate ? format(new Date(selectedItem.inspectionDate), 'dd-MMM-yyyy') : 'N/A'}</div>
                    <div className="lg:col-span-2"><Label>Known Product History</Label><Input {...form.register('knownHistory')} /></div>
                    <div className="lg:col-span-2"><Label>Procedure Ref. No</Label><Input defaultValue="ARIES-RAOP-001 [Rev 07]" readOnly /></div>
                  </div>
                )}
                
                <div className="space-y-2">
                    <Label>Inspection Date</Label>
                    <Controller name="inspectionDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                </div>
                
                <div className="p-4 border rounded-md space-y-3">
                    <h3 className="font-semibold border-b pb-2">Inspection Criteria</h3>
                    {renderField("Verify the presence and legibility of the serial number and CE mark / ARIES ID", "preliminaryObservation")}
                    {renderField("Checking the condition of the sheath over the full length of the rope", "conditionSheath")}
                    {renderField("Do a tactile inspection of the core over the full length of the rope", "conditionCore")}
                    {renderField("Check the condition of the sewn terminations and the safety stitching", "sheathsAndTerminations")}
                    {renderField("Condition of the protection components and knots", "otherComponents")}
                </div>

                <div className="space-y-2">
                    <Label>Comments (if any)</Label>
                    <Textarea {...form.register('comments')} />
                </div>
                 <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea {...form.register('remarks')} />
                </div>
                 <div className="space-y-2">
                    <Label>Verdict</Label>
                    <Controller name="verdict" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{verdictOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                    )}/>
                </div>
                <div className="space-y-2">
                    <Label>Reviewed By</Label>
                     <Controller name="reviewedById" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select reviewer..."/></SelectTrigger>
                            <SelectContent>{reviewers.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}/>
                    {form.formState.errors.reviewedById && <p className="text-xs text-destructive">{form.formState.errors.reviewedById.message}</p>}
                </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Checklist</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
