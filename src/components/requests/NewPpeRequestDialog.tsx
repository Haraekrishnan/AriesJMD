
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Paperclip, Upload, X, AlertCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useEffect, useState, useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { isAfter, addYears, format, parseISO, isToday, isFuture } from 'date-fns';
import { PpeHistoryRecord } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';

const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

const ppeRequestSchema = z.object({
  manpowerId: z.string().min(1, 'Please select a person'),
  ppeType: z.enum(['Coverall', 'Safety Shoes'], { required_error: "PPE Type is required." }),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
  attachmentUrl: z.string().optional(),
  newRequestJustification: z.string().optional(),
}).refine(data => {
    // This custom refinement will be handled in the component logic
    return true;
});

type PpeRequestFormValues = z.infer<typeof ppeRequestSchema>;

interface NewPpeRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewPpeRequestDialog({ isOpen, setIsOpen }: NewPpeRequestDialogProps) {
  const { addPpeRequest, manpowerProfiles } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isManpowerPopoverOpen, setIsManpowerPopoverOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const form = useForm<PpeRequestFormValues>({
    resolver: zodResolver(ppeRequestSchema),
    defaultValues: {
      requestType: 'New',
      quantity: 1,
    },
  });

  const manpowerId = form.watch('manpowerId');
  const ppeType = form.watch('ppeType');
  const requestType = form.watch('requestType');

  useEffect(() => {
    if (manpowerId && ppeType) {
        const profile = manpowerProfiles.find(p => p.id === manpowerId);
        if (profile) {
            const size = ppeType === 'Coverall' ? profile.coverallSize : profile.shoeSize;
            form.setValue('size', size || '');
        }
    }
  }, [manpowerId, ppeType, manpowerProfiles, form]);

  const isNewEmployee = useMemo(() => {
    if (!manpowerId) return false;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile?.joiningDate) return true; // Default to new if no joining date
    const joiningDate = parseISO(profile.joiningDate);
    return isToday(joiningDate) || isFuture(joiningDate);
  }, [manpowerId, manpowerProfiles]);

  const eligibility = useMemo(() => {
    if (!manpowerId || !ppeType) return null;

    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile) return null;

    const historyArray = Array.isArray(profile.ppeHistory) ? profile.ppeHistory : Object.values(profile.ppeHistory || {});
    const lastIssue = historyArray
      .filter(h => h && h.ppeType === ppeType)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

    if (requestType === 'New') {
        if (!lastIssue) {
            return { eligible: true, reason: 'Eligible for new issue as there is no prior record.' };
        } else {
             const baselineDate = parseISO(lastIssue.issueDate);
             const nextEligibleDate = addYears(baselineDate, 1);
             if (isAfter(new Date(), nextEligibleDate)) {
                 return { eligible: true, reason: 'Eligible for new issue. Last issue was over a year ago.' };
             }
             return { eligible: false, reason: `Not eligible for new issue. Last issue was on ${format(baselineDate, 'dd MMM, yyyy')}.` };
        }
    }

    if (requestType === 'Replacement') {
        if (!lastIssue) {
            return { eligible: false, reason: 'No prior issue record found to be replaced. Please select "New" request type.' };
        }
        const baselineDate = parseISO(lastIssue.issueDate);
        const nextEligibleDate = addYears(baselineDate, 1);
        if (isAfter(new Date(), nextEligibleDate)) {
            return { eligible: true, reason: `Eligible for replacement. Last issue was on ${format(baselineDate, 'dd MMM, yyyy')}.` };
        } else {
            return { eligible: false, reason: `Not eligible for replacement until ${format(nextEligibleDate, 'dd MMM, yyyy')}.` };
        }
    }
    
    return null;

  }, [manpowerId, ppeType, requestType, manpowerProfiles]);
  
  const showJustificationField = useMemo(() => {
    if (eligibility?.eligible === false) return true;
    if (!isNewEmployee && requestType === 'New' && eligibility?.eligible) {
        // If it's a "New" request for an existing employee, but they ARE eligible (e.g. >1yr since last issue), justification is not needed
        return false;
    }
    if (!isNewEmployee && requestType === 'New') return true;
    return false;
  }, [eligibility, isNewEmployee, requestType]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: 'Uploading...', description: 'Please wait while the image is uploaded.' });
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "my_unsigned_upload"); 

    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dmgyflpz8/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        setIsUploading(false);

        if (data.secure_url) {
            form.setValue('attachmentUrl', data.secure_url);
            toast({ title: 'Upload Successful', description: 'Image has been attached.' });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload image.' });
        }
    } catch (error) {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Upload Error', description: 'An error occurred during upload.' });
    }
  };

  const onSubmit = (data: PpeRequestFormValues) => {
    if (showJustificationField && !data.newRequestJustification?.trim()) {
        form.setError("newRequestJustification", { type: "manual", message: "Justification is required for this request." });
        return;
    }

    addPpeRequest({ ...data, eligibility });
    
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ requestType: 'New', quantity: 1 });
    }
    setIsOpen(open);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New PPE Request</DialogTitle>
          <DialogDescription>Request a coverall or safety shoes for an employee.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(); }} className="space-y-4 px-1">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Controller
                  name="manpowerId"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={isManpowerPopoverOpen} onOpenChange={setIsManpowerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          {field.value ? manpowerProfiles.find(mp => mp.id === field.value)?.name : "Select person..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search manpower..." />
                          <CommandList>
                            <CommandEmpty>No one found.</CommandEmpty>
                            <CommandGroup>
                              {manpowerProfiles.map(mp => (
                                <CommandItem
                                  key={mp.id}
                                  value={mp.name}
                                  onSelect={() => {
                                    form.setValue("manpowerId", mp.id);
                                    setIsManpowerPopoverOpen(false);
                                  }}
                                >
                                  {mp.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.manpowerId && <p className="text-xs text-destructive">{form.formState.errors.manpowerId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>PPE Type</Label>
                    <Controller name="ppeType" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                            <SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent>
                        </Select>
                    )}/>
                    {form.formState.errors.ppeType && <p className="text-xs text-destructive">{form.formState.errors.ppeType.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Size</Label>
                    {ppeType === 'Coverall' ? (
                         <Controller name="size" control={form.control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select size..."/></SelectTrigger>
                                <SelectContent>
                                    {coverallSizeOptions.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}/>
                    ) : (
                        <Input {...form.register('size')} placeholder="e.g., 42" />
                    )}
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" {...form.register('quantity')} />
                {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
              </div>

               <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Controller name="requestType" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Replacement">Replacement</SelectItem></SelectContent>
                        </Select>
                    )}/>
                </div>
                
                {eligibility && (
                    <Alert variant={eligibility.eligible ? "default" : "destructive"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{eligibility.eligible ? "Eligible" : "Not Eligible"}</AlertTitle>
                        <AlertDescription>{eligibility.reason}</AlertDescription>
                    </Alert>
                )}

                {showJustificationField && (
                    <div className="space-y-2">
                        <Label htmlFor="newRequestJustification">Justification for Request</Label>
                        <Textarea id="newRequestJustification" {...form.register('newRequestJustification')} placeholder="Explain why this item is needed." />
                        {form.formState.errors.newRequestJustification && <p className="text-xs text-destructive">{form.formState.errors.newRequestJustification.message}</p>}
                    </div>
                )}

                {requestType === 'Replacement' && (
                  <div className="space-y-2">
                    <Label>Attach Photo of Damaged Item</Label>
                    {form.getValues('attachmentUrl') ? (
                       <div className="flex items-center justify-between p-2 rounded-md border text-sm">
                          <a href={form.getValues('attachmentUrl')!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate hover:underline">
                            <Paperclip className="h-4 w-4"/>
                            <span className="truncate">Attached Image</span>
                          </a>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('attachmentUrl', undefined)}>
                            <X className="h-4 w-4"/>
                          </Button>
                       </div>
                    ) : (
                      <div className="relative">
                        <Button asChild variant="outline" size="sm">
                          <Label htmlFor="file-upload"><Upload className="mr-2 h-4 w-4"/> {isUploading ? 'Uploading...' : 'Upload Image'}</Label>
                        </Button>
                        <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea {...form.register('remarks')} rows={3} placeholder="Add any extra notes here..."/>
                </div>
            </form>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button type="button">Submit Request</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                      <AlertDialogDescription>
                          Please review the entered details. This request will be sent directly to the manager for approval and cannot be reversed.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Back to Review</AlertDialogCancel>
                      <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>OK, Proceed</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}