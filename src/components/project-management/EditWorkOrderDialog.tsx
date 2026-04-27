'use client';
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';

const foNumberSchema = z.object({
  value: z.string().min(1, 'FO number cannot be empty'),
  details: z.string().optional(),
});

const workOrderSchema = z.object({
  number: z.string().min(1, 'ARC number is required'),
  details: z.string().optional(),
  foNumbers: z.array(foNumberSchema).optional(),
});

type FormValues = z.infer<typeof workOrderSchema>;

interface EditWorkOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  workOrder: WorkOrder;
}

export default function EditWorkOrderDialog({ isOpen, setIsOpen, workOrder }: EditWorkOrderDialogProps) {
  const { updateWorkOrder } = useGeneral();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(workOrderSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "foNumbers",
  });

  useEffect(() => {
    if (workOrder && isOpen) {
      form.reset({
        number: workOrder.number,
        details: workOrder.details,
        foNumbers: workOrder.foNumbers?.map(fo => 
            typeof fo === 'string' ? { value: fo, details: '' } : { value: fo.value, details: fo.details || '' }
        ) || []
      });
    }
  }, [workOrder, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateWorkOrder({ 
        ...workOrder, 
        number: data.number,
        details: data.details,
        foNumbers: data.foNumbers
    });
    toast({ title: 'Work Order Updated' });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit ARC Number</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="number">ARC Number</Label>
            <Input id="number" {...form.register('number')} />
            {form.formState.errors.number && <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">ARC Details (Optional)</Label>
            <Textarea id="details" {...form.register('details')} rows={2}/>
          </div>

          <div className="space-y-2">
            <Label>Associated FO Numbers</Label>
             <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                    {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                            <Input {...form.register(`foNumbers.${index}.value`)} placeholder={`FO Number #${index + 1}`} />
                            <Textarea {...form.register(`foNumbers.${index}.details`)} placeholder="FO Details (Optional)" rows={1} className="text-xs" />
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                    ))}
                </div>
            </ScrollArea>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '', details: '' })}><PlusCircle className="mr-2 h-4 w-4"/> Add FO Number</Button>
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