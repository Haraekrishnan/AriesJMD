
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

interface ImportConsumablesDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ImportConsumablesDialog({ isOpen, setIsOpen }: ImportConsumablesDialogProps) {
    const { addMultipleConsumableItems } = useAppContext();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                const importedCount = addMultipleConsumableItems(json);

                toast({ title: 'Import Complete', description: `${importedCount} new items were added.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Import error:", error);
                toast({ variant: 'destructive', title: 'Import Failed' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Consumables</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to add new consumable items in bulk. Items with existing names will be skipped.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">Your Excel file must have a header row with the following exact column names:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>Name</b> (Item Name)</li>
                            <li><b>Quantity</b> (Initial stock quantity)</li>
                            <li><b>Unit</b> (e.g., pcs, box, m)</li>
                            <li><b>Category</b> (Must be either "Daily Consumable" or "Job Consumable")</li>
                            <li><b>Remarks</b> (Optional)</li>
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

