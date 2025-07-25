
'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { Vehicle } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Check } from 'lucide-react';

const VAP_ACCESS_OPTIONS = ["DTA ISBL", "SEZ ISBL", "MTF ISBL", "OTHERS"];

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverId: z.string().min(1, 'Please select a driver'),
  seatingCapacity: z.coerce.number().min(1, 'Seating capacity is required'),
  vapAccess: z.array(z.string()).optional(),
  vapValidity: z.string().optional(),
  insuranceValidity: z.string().optional(),
  fitnessValidity: z.string().optional(),
  taxValidity: z.string().optional(),
  puccValidity: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface EditVehicleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle;
}

export default function EditVehicleDialog({ isOpen, setIsOpen, vehicle }: EditVehicleDialogProps) {
  const { updateVehicle, drivers } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  useEffect(() => {
    if (vehicle && isOpen) {
        form.reset({
            vehicleNumber: vehicle.vehicleNumber,
            driverId: vehicle.driverId,
            seatingCapacity: vehicle.seatingCapacity,
            vapAccess: vehicle.vapAccess || [],
            vapValidity: vehicle.vapValidity,
            insuranceValidity: vehicle.insuranceValidity,
            fitnessValidity: vehicle.fitnessValidity,
            taxValidity: vehicle.taxValidity,
            puccValidity: vehicle.puccValidity,
        });
    }
  }, [vehicle, isOpen, form]);

  const onSubmit = (data: VehicleFormValues) => {
    updateVehicle({ ...vehicle, ...data });
    toast({
      title: 'Vehicle Updated',
      description: `Vehicle ${data.vehicleNumber} has been updated.`,
    });
    setIsOpen(false);
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
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>Update the details for vehicle {vehicle.vehicleNumber}.</DialogDescription>
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
          <div className="space-y-2">
            <Label>Driver</Label>
            <Controller
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.driverId && <p className="text-xs text-destructive">{form.formState.errors.driverId.message}</p>}
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

          <div className="space-y-2">
            <Label htmlFor="vapValidity">VAP Validity</Label>
            <Input id="vapValidity" type="date" {...form.register('vapValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceValidity">Insurance Validity</Label>
            <Input id="insuranceValidity" type="date" {...form.register('insuranceValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fitnessValidity">Fitness Validity</Label>
            <Input id="fitnessValidity" type="date" {...form.register('fitnessValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxValidity">Tax Validity</Label>
            <Input id="taxValidity" type="date" {...form.register('taxValidity')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="puccValidity">PUCC Validity</Label>
            <Input id="puccValidity" type="date" {...form.register('puccValidity')} />
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
