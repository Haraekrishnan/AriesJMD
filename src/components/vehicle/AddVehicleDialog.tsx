
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Check } from 'lucide-react';
import { DatePickerInput } from '../ui/date-picker-input';
import type { VehicleStatus } from '@/lib/types';

const VAP_ACCESS_OPTIONS = ["DTA ISBL", "SEZ ISBL", "MTF ISBL", "OTHERS"];
const statusOptions: VehicleStatus[] = ['Active', 'In Maintenance', 'Left the Project'];

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverId: z.string().min(1, 'Please select a driver'),
  vendorName: z.string().optional(),
  vapNumber: z.string().optional(),
  seatingCapacity: z.coerce.number().min(1, 'Seating capacity is required'),
  vapAccess: z.array(z.string()).optional(),
  status: z.enum(['Active', 'In Maintenance', 'Left the Project']).default('Active'),
  vapValidity: z.date().optional(),
  insuranceValidity: z.date().optional(),
  fitnessValidity: z.date().optional(),
  taxValidity: z.date().optional(),
  puccValidity: z.date().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface AddVehicleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddVehicleDialog({ isOpen, setIsOpen }: AddVehicleDialogProps) {
  const { addVehicle, drivers } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleNumber: '',
      driverId: '',
      vapAccess: [],
      status: 'Active',
    },
  });

  const onSubmit = (data: VehicleFormValues) => {
    addVehicle({
      ...data,
      vapValidity: data.vapValidity?.toISOString(),
      insuranceValidity: data.insuranceValidity?.toISOString(),
      fitnessValidity: data.fitnessValidity?.toISOString(),
      taxValidity: data.taxValidity?.toISOString(),
      puccValidity: data.puccValidity?.toISOString(),
    });
    toast({
      title: 'Vehicle Added',
      description: `Vehicle ${data.vehicleNumber} has been added.`,
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          form.reset();
      }
      setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>Fill in the details for the new vehicle.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input id="vehicleNumber" {...form.register('vehicleNumber')} />
              {form.formState.errors.vehicleNumber && <p className="text-xs text-destructive">{form.formState.errors.vehicleNumber.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="seatingCapacity">Seating Capacity</Label>
              <Input id="seatingCapacity" type="number" {...form.register('seatingCapacity')} />
              {form.formState.errors.seatingCapacity && <p className="text-xs text-destructive">{form.formState.errors.seatingCapacity.message}</p>}
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input id="vendorName" {...form.register('vendorName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vapNumber">VAP Number</Label>
              <Input id="vapNumber" {...form.register('vapNumber')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Driver</Label>
            <Controller
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers && drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.driverId && <p className="text-xs text-destructive">{form.formState.errors.driverId.message}</p>}
          </div>

           <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>VAP Access</Label>
            <Controller
              control={form.control}
              name="vapAccess"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-auto">
                        <div className="flex flex-wrap gap-1">
                          {field.value?.length > 0
                            ? field.value.map(val => <Badge key={val} variant="secondary">{val}</Badge>)
                            : <span className="text-muted-foreground">Select access...</span>
                          }
                        </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                     <Command>
                       <CommandList>
                         <CommandEmpty>No results found.</CommandEmpty>
                         <CommandGroup>
                           {VAP_ACCESS_OPTIONS.map(option => {
                            const isSelected = field.value?.includes(option);
                            return (
                               <CommandItem key={option} onSelect={() => {
                                 if (isSelected) {
                                   field.onChange(field.value?.filter(v => v !== option));
                                 } else {
                                   field.onChange([...(field.value || []), option]);
                                 }
                               }}>
                                 <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                 {option}
                               </CommandItem>
                            )
                           })}
                         </CommandGroup>
                       </CommandList>
                     </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          <div className="space-y-2"><Label>VAP Validity</Label><Controller name="vapValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} /></div>
          <div className="space-y-2"><Label>Insurance Validity</Label><Controller name="insuranceValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} /></div>
          <div className="space-y-2"><Label>Fitness Validity</Label><Controller name="fitnessValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} /></div>
          <div className="space-y-2"><Label>Tax Validity</Label><Controller name="taxValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} /></div>
          <div className="space-y-2"><Label>PUCC Validity</Label><Controller name="puccValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Vehicle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
