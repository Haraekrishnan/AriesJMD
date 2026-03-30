
'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DatePickerInput } from '../ui/date-picker-input';
import { ScrollArea } from '../ui/scroll-area';
import { Upload, Paperclip, X } from 'lucide-react';
import { uploadFile } from '@/lib/storage';

const reportSchema = z.object({
  visitDate: z.date({ required_error: "Date is required" }),
  visitTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time in HH:mm format."),
  siteName: z.string().min(1, 'Site name is required'),
  location: z.string().min(1, 'Location is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  goodPractices: z.string().optional(),
  unsafeActs: z.string().optional(),
  unsafeConditions: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof reportSchema>;

interface NewObservationReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewObservationReportDialog({ isOpen, setIsOpen }: NewObservationReportDialogProps) {
  const { addObservationReport } = useAppContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const uploadPhotos = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];
    
    setIsUploading(true);
    toast({ title: 'Uploading photos...', description: 'Please wait.' });

    const uploadPromises = uploadedFiles.map(file => 
      uploadFile(file, `observation-photos/${Date.now()}_${file.name}`)
    );

    try {
      const urls = await Promise.all(uploadPromises);
      toast({ title: 'Upload Complete', description: `${urls.length} photos uploaded.` });
      return urls;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload photos.' });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const urls = await uploadPhotos();
      addObservationReport({
        ...data,
        visitDate: data.visitDate.toISOString(),
        photos: urls,
      });
      toast({ title: 'Report Submitted', description: 'Your safety observation report has been saved.' });
      setIsOpen(false);
    } catch (error) {
      // Error toast is shown in uploadPhotos
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setUploadedFiles([]);
      setPhotoUrls([]);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Observation Report</DialogTitle>
          <DialogDescription>Fill in the details of your site observation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-6 -mr-6">
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Visit Date</Label>
                            <Controller name="visitDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                             {form.formState.errors.visitDate && <p className="text-xs text-destructive">{form.formState.errors.visitDate.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Visit Time</Label>
                            <Input type="time" {...form.register('visitTime')} />
                             {form.formState.errors.visitTime && <p className="text-xs text-destructive">{form.formState.errors.visitTime.message}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Site Name</Label>
                            <Input {...form.register('siteName')} />
                            {form.formState.errors.siteName && <p className="text-xs text-destructive">{form.formState.errors.siteName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Location / Tank No.</Label>
                            <Input {...form.register('location')} />
                            {form.formState.errors.location && <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Job Description</Label>
                        <Input {...form.register('jobDescription')} />
                        {form.formState.errors.jobDescription && <p className="text-xs text-destructive">{form.formState.errors.jobDescription.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Good Practices Observed</Label>
                        <Textarea {...form.register('goodPractices')} rows={4} />
                    </div>
                    <div className="space-y-2">
                        <Label>Unsafe Acts Observed</Label>
                        <Textarea {...form.register('unsafeActs')} rows={4} />
                    </div>
                    <div className="space-y-2">
                        <Label>Unsafe Conditions Observed</Label>
                        <Textarea {...form.register('unsafeConditions')} rows={4} />
                    </div>

                    <div className="space-y-2">
                        <Label>Attach Photos</Label>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Label htmlFor="photo-upload"><Upload className="mr-2 h-4 w-4"/> {isUploading ? 'Uploading...' : 'Add Files'}</Label>
                            </Button>
                            <Input id="photo-upload" type="file" multiple onChange={handleFileChange} className="hidden" disabled={isUploading} accept="image/*,.pdf"/>
                        </div>
                        <div className="space-y-1 mt-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm p-1 rounded-md border">
                                    <div className="flex items-center gap-2 truncate"><Paperclip className="h-4 w-4 flex-shrink-0"/><span className="truncate">{file.name}</span></div>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}><X className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Submit Report'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    