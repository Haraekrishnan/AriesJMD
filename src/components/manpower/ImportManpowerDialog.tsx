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
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
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
                        <p className="mb-2">The first row of your Excel sheet must be a header row with the exact column names below. Dates should be in YYYY-MM-DD format.</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li>Name</li>
                            <li>Trade</li>
                            <li>Status (Working, On Leave, Resigned, Terminated)</li>
                            <li>Hard Copy File No</li>
                            <li>EP Number</li>
                            <li>Plant Name</li>
                            <li>EIC Name</li>
                            <li>Pass Issue Date</li>
                            <li>Joining Date</li>
                            <li>WO Expiry</li>
                            <li>WC Policy Expiry</li>
                            <li>Labour Contract Expiry</li>
                            <li>Medical Expiry</li>
                            <li>Safety Expiry</li>
                            <li>IRATA Expiry</li>
                            <li>Contract Expiry</li>
                            <li>Remarks</li>
                            <li>Feedback</li>
                            <li>Resignation Date</li>
                            <li>Termination Date</li>
                            <li>Document Folder URL</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file}><Upload className="mr-2 h-4 w-4"/> Import</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
