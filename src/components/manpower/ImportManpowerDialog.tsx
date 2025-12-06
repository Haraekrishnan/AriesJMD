'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { FileWarning, Upload } from 'lucide-react';

interface ImportManpowerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ImportManpowerDialog({ isOpen, setIsOpen }: ImportManpowerDialogProps) {
    const { addMultipleManpowerProfiles } = useAppContext();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please select an Excel file to import.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });
                
                const importedCount = addMultipleManpowerProfiles(json);

                toast({ title: 'Import Complete', description: `${importedCount} of ${json.length} profiles were successfully imported/updated.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Import error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'The file format is invalid or contains errors. Please check the console for details.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Manpower from Excel</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to add or update multiple profiles. Profiles with existing "Hard Copy File No" will be updated.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The first row of your Excel sheet must be a header row. Data is read from the second row onwards. The columns must be in the following order:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>Column A:</b> Full Name</li>
                            <li><b>Column B:</b> Mobile Number</li>
                            <li><b>Column C:</b> Gender</li>
                            <li><b>Column D:</b> Work Order Number</li>
                            <li><b>Column E:</b> Labour License No</li>
                            <li><b>Column F:</b> EIC</li>
                            <li><b>Column G:</b> Work Order Expiry Date (Format: YYYY-MM-DD)</li>
                            <li><b>Column H:</b> Labour License Expiry Date (Format: YYYY-MM-DD)</li>
                            <li><b>Column I:</b> Joining Date (Format: YYYY-MM-DD)</li>
                            <li><b>Column J:</b> EP Number</li>
                            <li><b>Column K:</b> Aadhar Number</li>
                            <li><b>Column L:</b> Date Of Birth (Format: YYYY-MM-DD)</li>
                            <li><b>Column M:</b> UAN Number</li>
                            <li><b>Column N:</b> WC Policy Number</li>
                            <li><b>Column O:</b> WC Policy Expiry Date (Format: YYYY-MM-DD)</li>
                            <li><b>Column P:</b> Card Category</li>
                            <li><b>Column Q:</b> Card Type</li>
                            <li><b>Column R:</b> Labour License Expiry Date (Duplicate - can be empty)</li>
                            <li><b>Column S:</b> Work Order Expiry Date (Duplicate - can be empty)</li>
                            <li><b>Column T:</b> WC Policy Expiry Date (Duplicate - can be empty)</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file}><Upload className="mr-2 h-4 w-4"/> Import</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
