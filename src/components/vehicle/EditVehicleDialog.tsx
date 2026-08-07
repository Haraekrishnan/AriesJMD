'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO, isValid } from 'date-fns';
import type { Vehicle, VehicleStatus } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const VAP_ACCESS_OPTIONS = ["DTA ISBL", "SEZ ISBL", "MTF ISBL", "OTHERS"];
const statusOptions: VehicleStatus[] = ['Active', 'In Maintenance', 'Left the Project'];

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverId: z.string().min(1, 'Please select a driver'),
  vendorName: z.string().optional().or(z.literal('')),
  vapNumber: z.string().optional().or(z.literal('')),
  seatingCapacity: z.coerce.number().min(1, 'Seating capacity is required'),
  vapAccess: z.array(z.string()).optional(),
  status: z.enum(['Active', 'In Maintenance', 'Left the Project']).default('Active'),
  vapValidity: z.date().optional().nullable(),
  insuranceValidity: z.date().optional().nullable(),
  fitnessValidity: z.date().optional().nullable(),
  taxValidity: z.date().optional().nullable(),
  puccValidity: z.date().optional().nullable(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface EditVehicleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle;
}

export default function EditVehicleDialog({ isOpen, setIsOpen, vehicle }: EditVehicleDialogProps) {
  const { updateVehicle, drivers } = useGeneral();
  const { toast } = useToast();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  useEffect(() => {
    if (vehicle && isOpen) {
        form.reset({
            ...vehicle,
            vapValidity: vehicle.vapValidity ? parseISO(vehicle.vapValidity) : null,
            insuranceValidity: vehicle.insuranceValidity ? parseISO(vehicle.insuranceValidity) : null,
            fitnessValidity: vehicle.fitnessValidity ? parseISO(vehicle.fitnessValidity) : null,
            taxValidity: vehicle.taxValidity ? parseISO(vehicle.taxValidity) : null,
            puccValidity: vehicle.puccValidity ? parseISO(vehicle.puccValidity) : null,
            vapAccess: vehicle.vapAccess || [],
        });
    }
  }, [vehicle, isOpen, form]);

  const onSubmit = (data: VehicleFormValues) => {
    updateVehicle({
      ...vehicle,
      ...data,
      vapValidity: data.vapValidity?.toISOString() || null,
      insuranceValidity: data.insuranceValidity?.toISOString() || null,
      fitnessValidity: data.fitnessValidity?.toISOString() || null,
      taxValidity: data.taxValidity?.toISOString() || null,
      puccValidity: data.puccValidity?.toISOString() || null,
      vendorName: data.vendorName || null,
      vapNumber: data.vapNumber || null,
    } as Vehicle);
    toast({
      title: 'Vehicle Updated',
      description: `Vehicle ${data.vehicleNumber} has been updated.`,
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>Update the technical details and validity dates.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
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
                        <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                            <div className="flex flex-wrap gap-1">
                            {field.value?.length > 0
                                ? field.value.map(val => (
                                    <Badge key={val} variant="secondary" className="gap-1">
                                        {val}
                                        <X className="h-3 w-3 cursor-pointer" onClick={(e) => {
                                            e.stopPropagation();
                                            field.onChange(field.value?.filter(v => v !== val));
                                        }} />
                                    </Badge>
                                ))
                                : <span className="text-muted-foreground">Select access...</span>
                            }
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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

            <div className="space-y-2"><Label>VAP Validity</Label><Controller name="vapValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
            <div className="space-y-2"><Label>Insurance Validity</Label><Controller name="insuranceValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
            <div className="space-y-2"><Label>Fitness Validity</Label><Controller name="fitnessValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
            <div className="space-y-2"><Label>Tax Validity</Label><Controller name="taxValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
            <div className="space-y-2"><Label>PUCC Validity</Label><Controller name="puccValidity" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </DialogFooter>
            </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
