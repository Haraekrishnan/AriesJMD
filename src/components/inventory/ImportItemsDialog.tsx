
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

interface ImportItemsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ImportItemsDialog({ isOpen, setIsOpen }: ImportItemsDialogProps) {
    const { addMultipleInventoryItems } = useAppContext();
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
                
                const importedCount = addMultipleInventoryItems(json);

                toast({ title: 'Import Complete', description: `${importedCount} new items were successfully added. Existing items were ignored.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Import error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'The file format is invalid. Please check the console for details.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>Import Items from Excel</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to add additional items in bulk. Items with existing serial numbers will be ignored.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The first row of your Excel sheet must be the header row with the following columns in order:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>ITEM NAME</b> (e.g., Harness)</li>
                            <li><b>SERIAL NUMBER</b> (Unique identifier)</li>
                            <li><b>CHEST CROLL NO</b> (Optional, for Harnesses)</li>
                            <li><b>ARIES ID</b> (Optional, for Harnesses)</li>
                            <li><b>INSPECTION DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>TP INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>STATUS</b> (In Use, In Store, Damaged, Expired)</li>
                            <li><b>PROJECT</b> (Exact name, e.g., "Aries I", "Aries II")</li>
                            <li><b>TP Certificate Link</b> (Optional)</li>
                            <li><b>Inspection Certificate Link</b> (Optional)</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file}><Upload className="mr-2 h-4 w-4"/> Import</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
